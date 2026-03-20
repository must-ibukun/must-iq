-- ============================================================
-- Must-IQ — pgvector HNSW Index Migration
-- Run AFTER prisma migrate: nx run db:migrate
-- Then run this file manually:
--   psql $DATABASE_URL -f libs/db/src/migrations/add_vector_index.sql
-- ============================================================

-- HNSW (Hierarchical Navigable Small World) index
-- Much faster than IVFFlat for real-time queries
-- m=16: connections per layer (higher = more accurate, more memory)
-- ef_construction=64: search depth during build (higher = better quality)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Also index department for fast filtered searches
CREATE INDEX IF NOT EXISTS document_chunks_department_idx
  ON document_chunks (department);

-- Composite index for filtered vector search (department + vector)
COMMENT ON INDEX document_chunks_embedding_hnsw_idx IS
  'HNSW index for cosine similarity search — Must-IQ RAG retrieval';
