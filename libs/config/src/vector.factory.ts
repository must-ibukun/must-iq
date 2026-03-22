// ============================================================
// Must-IQ — Vector Factory
// Returns the correct VectorStore based on active DB settings
// No hardcoded imports — the active provider drives everything
// ============================================================

import { VectorStore } from "@langchain/core/vectorstores";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { WeaviateStore } from "@langchain/weaviate";
import weaviate from "weaviate-client";
import { getActiveSettings } from "./settings.service";
import { createEmbeddings } from "./llm.factory";
import { Logger } from "@nestjs/common";
import { Document } from "@langchain/core/documents";
import { randomUUID } from "crypto";

const logger = new Logger("VectorFactory");

/**
 * Module-level cache to reuse VectorStore initialization promises and avoid "too many clients" DB errors.
 * Keyed by: provider:index
 */
const vectorStorePromises = new Map<string, Promise<VectorStore>>();

/**
 * Custom extension of PGVectorStore to support the Must-IQ relational schema.
 * Maps metadata fields to actual SQL columns in the document_chunks table.
 * Uses instance patching to bypass private/protected restrictions of the base class.
 */
class RelationalPGVectorStore extends PGVectorStore {
    constructor(embeddings: any, config: any) {
        super(embeddings, config);
        const logger = new Logger("RelationalVectorStore");
        // Ensure a default chunkSize if not provided by base
        (this as any).chunkSize = config.chunkSize ?? (this as any).chunkSize ?? 500;
        logger.log(`Initialized RelationalPGVectorStore instance (chunkSize=${(this as any).chunkSize})`);
        this.patchMethods();
    }

    static async initialize(embeddings: any, config: any): Promise<RelationalPGVectorStore> {
        const logger = new Logger("RelationalVectorStore");
        const { dimensions, ...rest } = config;
        const instance = new RelationalPGVectorStore(embeddings, rest);

        await (instance as any)._initializeClient();

        await (instance as any).ensureTableInDatabase(dimensions);

        return instance;
    }

    private patchMethods() {
        const self = this as any;

        // 1. Patch buildInsertQuery
        self.buildInsertQuery = async (rows: any[][]): Promise<string> => {
            const columns = [
                this.contentColumnName,
                this.vectorColumnName,
                this.metadataColumnName,
                "documentId",
                "source",
                "workspace",
                "chunkIndex"
            ];

            // Add ID if provided
            if (rows[0] && rows[0].length === columns.length + 1) {
                columns.push(this.idColumnName);
            }

            const valuesPlaceholders = rows.map((_, j) =>
                `(${rows[j].map((_, i: number) => `$${j * rows[j].length + i + 1}`).join(", ")})`
            ).join(", ");

            return `
                INSERT INTO ${this.computedTableName} (
                    ${columns.map(c => `"${c}"`).join(", ")}
                )
                VALUES ${valuesPlaceholders}
            `;
        };

        // 2. Patch addVectors
        this.addVectors = async (vectors: number[][], documents: Document[], options?: { ids?: string[] }): Promise<void> => {
            const logger = new Logger("RelationalVectorStore");
            logger.log(`Adding ${vectors.length} vectors to DB...`);

            const ids = options?.ids || vectors.map(() => randomUUID());
            const rows = [];

            for (let i = 0; i < vectors.length; i++) {
                const doc = documents[i];
                if (!vectors[i] || vectors[i].length === 0) {
                    throw new Error(`Generated vector for chunk ${i} is empty or invalid. Check embedding provider.`);
                }
                const embeddingString = `[${vectors[i].join(",")}]`;

                const values = [
                    doc.pageContent.replace(/\0/g, ""),
                    embeddingString,
                    doc.metadata,
                    doc.metadata.documentId || null,
                    doc.metadata.source || "unknown",
                    doc.metadata.workspace || "general",
                    doc.metadata.chunkIndex ?? i,
                    ids[i]
                ];
                rows.push(values);
            }

            const chunkSize = (this as any).chunkSize || 500;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                logger.debug(`Inserting chunk batch ${i / chunkSize + 1} (${chunk.length} rows)...`);
                const insertQuery = await self.buildInsertQuery(chunk);
                const flatValues = chunk.flat();
                try {
                    await (this as any).pool.query(insertQuery, flatValues);
                    logger.debug(`Batch ${i / chunkSize + 1} inserted successfully.`);
                } catch (e: any) {
                    logger.error(`Failed to insert batch: ${e.message}`);
                    throw new Error(`Error inserting relational vector: ${e.message}`);
                }
            }
            logger.log("All vectors added successfully.");
        };

        // 3. Patch buildFilterClauses to support multi-workspace search via relational column
        self.buildFilterClauses = (filter: any, paramOffset = 0) => {
            const whereClauses: string[] = [];
            const parameters: any[] = [];
            let paramCount = paramOffset;

            if (!filter) return { whereClauses, parameters, paramCount };

            for (const [key, value] of Object.entries(filter)) {
                if (key === 'workspace') {
                    // Optimized path: Use the top-level 'workspace' column instead of JSON metadata
                    if (typeof value === 'object' && value !== null && 'in' in value) {
                        paramCount += 1;
                        whereClauses.push(`"workspace" = ANY($${paramCount})`);
                        parameters.push((value as any).in);
                    } else if (typeof value === 'object' && value !== null && 'neq' in value) {
                        paramCount += 1;
                        whereClauses.push(`"workspace" != $${paramCount}`);
                        parameters.push((value as any).neq);
                    } else {
                        paramCount += 1;
                        whereClauses.push(`"workspace" = $${paramCount}`);
                        parameters.push(value);
                    }
                } else {
                    // Default fallback for other metadata fields
                    paramCount += 1;
                    whereClauses.push(`"${this.metadataColumnName}"->>'${key}' = $${paramCount}`);
                    parameters.push(value);
                }
            }

            return { whereClauses, parameters, paramCount };
        };
    }
}

/**
 * Creates the active VectorStore - driven by settings.
 * Supports "pgvector" (integrated) and "weaviate" (external).
 */
export async function createVectorStore(taskType?: string): Promise<VectorStore> {
    const settings = await getActiveSettings();
    const { vectorProvider, vectorIndex } = settings;

    // Generate a unique cache key for this configuration
    // Optimization: taskType (CODE/GENERAL) only affects the embeddings, not the vector store itself.
    // By ignoring taskType in the cache key, we avoid redundant DB connection/table re-initialization.
    const cacheKey = `${vectorProvider}:${vectorIndex || 'default'}`;

    if (vectorStorePromises.has(cacheKey)) {
        logger.debug(`Reusing initialization promise for VectorStore: ${cacheKey}`);
        return vectorStorePromises.get(cacheKey)!;
    }

    const initPromise = (async () => {
        try {
            const embeddings = await createEmbeddings(taskType);
            let instance: VectorStore;

            switch (vectorProvider) {
                case "pgvector": {
                    instance = await RelationalPGVectorStore.initialize(embeddings, {
                        postgresConnectionOptions: {
                            connectionString: process.env.DATABASE_URL!,
                            // Allow a few connections when multiple chunks ingest concurrently.
                            max: 3,
                            idleTimeoutMillis: 30_000,      // release idle connections after 30 s
                            connectionTimeoutMillis: 30_000, // allow 30 s to connect to Supabase pooler
                        },
                        tableName: vectorIndex || "document_chunks",
                        columns: {
                            idColumnName: "id",
                            vectorColumnName: "embedding",
                            contentColumnName: "content",
                            metadataColumnName: "metadata",
                        },
                        distanceStrategy: "cosine",
                        dimensions: settings.embeddingDimensions || 768,
                    });
                    break;
                }

                case "weaviate": {
                    const [host, port] = (process.env.WEAVIATE_HOST || "localhost:8080").split(":");
                    const client = await weaviate.connectToCustom({
                        httpHost: host,
                        httpPort: port ? parseInt(port) : 8080,
                        httpSecure: process.env.WEAVIATE_SCHEME === "https",
                        authCredentials: process.env.WEAVIATE_API_KEY
                            ? new weaviate.ApiKey(process.env.WEAVIATE_API_KEY)
                            : undefined,
                    });

                    instance = new WeaviateStore(embeddings, {
                        client: client as any,
                        indexName: vectorIndex || "MustIQ",
                        textKey: "content",
                        metadataKeys: ["workspace", "source", "page"],
                    });
                    break;
                }

                default:
                    throw new Error(`Unknown vector provider: "${vectorProvider}"`);
            }
            return instance;
        } catch (e) {
            // Delete failed promise so next request can retry
            vectorStorePromises.delete(cacheKey);
            throw e;
        }
    })();

    vectorStorePromises.set(cacheKey, initPromise);
    return initPromise;
}
