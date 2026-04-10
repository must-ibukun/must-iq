import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "@must-iq/db";
import { IngestionSourceType, ALLOWED_FILE_EXTENSIONS, CODE_EXTENSIONS } from '@must-iq/shared-types';
import { getActiveSettings, createUtilityLLM } from '@must-iq/config';
import { ingestDocument, normalizeSourcePath } from './ingest';
import { INGESTION_ANALYSIS_PROMPT, SOURCE_ANALYSIS_PROMPTS } from "../prompts/ingestion-analysis.prompt";

/**
 * Intelligent Pull Ingestion Utility
 */

async function analyzeContent(content: string, sourceType: IngestionSourceType) {
    const llm = await createUtilityLLM();
    const sourceGuidance = SOURCE_ANALYSIS_PROMPTS[sourceType as keyof typeof SOURCE_ANALYSIS_PROMPTS];

    const prompt = INGESTION_ANALYSIS_PROMPT
        .replace("{sourceType}", sourceType)
        .replace("{content}", content);

    const response = await llm.invoke([
        new SystemMessage(sourceGuidance),
        new HumanMessage(prompt)
    ]);

    try {
        const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        // Find JSON in response (in case of markdown blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
        console.error("Failed to parse analysis JSON:", e);
        return null;
    }
}

/**
 * Common ingestion helper to handle workspace mapping and tracking
 */
export async function processAndIngest(content: string, sourceType: IngestionSourceType, sourceId: string, workspace: string, projectId?: string) {
    const analysis = await analyzeContent(content, sourceType);
    if (!analysis) return;

    // 0. Protection: Ensure targetWorkspace matches either the provided identifier OR is 'general'
    // This prevents the LLM from hallucinating a workspace name that has no corresponding filter
    const suggestedWorkspace = analysis.appropriate_workspace?.toLowerCase();
    const targetWorkspace = (suggestedWorkspace && suggestedWorkspace !== 'general' && suggestedWorkspace === workspace.toLowerCase())
        ? suggestedWorkspace
        : workspace;

    // Fetch workspace metadata for layer tagging
    const wsRecord = await prisma.workspace.findFirst({
        where: { OR: [{ id: targetWorkspace }, { identifier: targetWorkspace }] }
    });
    const layer = wsRecord?.layer || 'docs';
    const techStack = wsRecord?.techStack || null;

    // 1. Ingest into Vector Store
    await ingestDocument({
        content: JSON.stringify(analysis, null, 2) + "\n\nOriginal Context:\n" + content,
        metadata: {
            title: analysis.summary || `${sourceType} ingest from ${sourceId}`,
            source: sourceId,
            source_type: sourceType,
            workspace: targetWorkspace,
            projectId,
            layer,
            techStack,
            tags: analysis.tags || [],
            knowledge_type: sourceType === 'slack' ? 'discussion' : sourceType === 'jira' ? 'solution' : 'decision'
        }
    } as any);


    // 2. Track Event in DB
    await prisma.ingestionEvent.create({
        data: {
            sourceId,
            sourceType: sourceType,
            workspace: targetWorkspace,
            score: 1.0,
            status: 'STORED',
            chunksStored: 1,
            metadata: analysis
        }
    });
}

/**
 * Pull Slack Data
 */
export async function pullSlackData(channelId: string, workspace: string, projectId?: string, startDate?: Date, endDate?: Date) {
    const settings = await getActiveSettings();
    if (!settings.slackIngestionEnabled || !settings.slackBotToken) {
        console.log("Slack ingestion is disabled or token is missing.");
        return;
    }

    const oldest = startDate ? Math.floor(startDate.getTime() / 1000) : undefined;
    const latest = endDate ? Math.floor(endDate.getTime() / 1000) : undefined;

    let url = `https://slack.com/api/conversations.history?channel=${channelId}&limit=20`;
    if (oldest) url += `&oldest=${oldest}`;
    if (latest) url += `&latest=${latest}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${settings.slackBotToken}` },
    });
    const data = await res.json();

    if (!data.ok) {
        console.error("Slack API error:", data.error);
        return;
    }

    const messages = data.messages || [];
    for (const msg of messages) {
        if (msg.bot_id || msg.text?.length < 50) continue;
        await processAndIngest(msg.text, "slack", `#${channelId}`, workspace, projectId);
    }
}

/**
 * Pull GitHub PRs — Full-Content File Ingestion
 *
 * Strategy:
 *  1. Fetch merged PRs for the repo.
 *  2. For each PR, fetch the list of changed files (up to 50).
 *  3. For each supported file, fetch its FULL content (not the diff).
 *  4. Atomically replace the existing document in the vector store if content has changed.
 *  5. Additionally ingest the PR description as an additive knowledge record.
 */
const MAX_FILES_PER_PR = 50;

export async function pullRepoPRs(repo: string, workspace: string, projectId?: string, startDate?: Date, endDate?: Date) {
    const settings = await getActiveSettings();
    if (!settings.repoIngestionEnabled || !settings.githubToken) {
        console.log('GitHub ingestion is disabled or token is missing.');
        return;
    }

    const headers = {
        Authorization: `Bearer ${settings.githubToken}`,
        Accept: 'application/vnd.github+json',
    };

    const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=closed&per_page=20`, { headers });
    const prs = await res.json();

    if (!Array.isArray(prs)) {
        console.error('GitHub API error or invalid repo format.');
        return;
    }

    for (const pr of prs) {
        if (!pr.merged_at) continue;

        const mergedDate = new Date(pr.merged_at);
        if (startDate && mergedDate < startDate) continue;
        if (endDate && mergedDate > endDate) continue;

        const prDescription = `Title: ${pr.title}\nDescription: ${pr.body ?? ''}\nAuthor: ${pr.user?.login}`;
        await processAndIngest(prDescription, 'github', repo, workspace, projectId);

        const repoShortName = repo.split('/').pop() ?? repo;
        const filesRes = await fetch(
            `https://api.github.com/repos/${repo}/pulls/${pr.number}/files?per_page=${MAX_FILES_PER_PR}`,
            { headers },
        );
        const prFiles: any[] = await filesRes.json();

        if (!Array.isArray(prFiles)) {
            console.warn(`Could not fetch files for PR #${pr.number}.`);
            continue;
        }

        const supportedFiles = prFiles.filter((f: any) => {
            if (f.status === 'removed') return false;
            const ext = f.filename ? `.${f.filename.split('.').pop()?.toLowerCase()}` : '';
            return ALLOWED_FILE_EXTENSIONS.includes(ext);
        });

        console.log(`PR #${pr.number}: ${supportedFiles.length} supported files to ingest (capped at ${MAX_FILES_PER_PR}).`);

        for (const file of supportedFiles) {
            try {
                const contentRes = await fetch(file.raw_url, { headers });
                if (!contentRes.ok) {
                    console.warn(`Could not fetch content for ${file.filename} (${contentRes.status}). Skipping.`);
                    continue;
                }
                const fileContent = await contentRes.text();

                if (!fileContent || fileContent.trim().length === 0) continue;

                const ext = `.${file.filename.split('.').pop()?.toLowerCase()}`;
                const langId = CODE_EXTENSIONS[ext] as string | undefined;
                const wsRecord = await prisma.workspace.findFirst({
                    where: { OR: [{ id: workspace }, { identifier: workspace }] },
                });
                const layer = wsRecord?.layer || 'code';
                const techStack = wsRecord?.techStack || null;

                await ingestDocument({
                    content: fileContent,
                    metadata: {
                        source: `${repoShortName}/${file.filename}`,
                        workspace,
                        projectId,
                        source_type: 'github',
                        layer,
                        techStack,
                        pr_number: pr.number,
                        pr_title: pr.title,
                        sha: pr.merge_commit_sha,
                        ingested_at: new Date().toISOString(),
                        tags: ['github', 'code', ext.replace('.', '')],
                    },
                    language: langId,
                });

            } catch (err: any) {
                console.error(`Failed to ingest file ${file.filename} from PR #${pr.number}: ${err.message}`);
            }
        }
    }
}

/**
 * Pull Jira Issues
 */
export async function pullJiraIssues(jiraProjects: string[], workspace: string, projectId?: string, startDate?: Date, endDate?: Date) {
    const settings = await getActiveSettings();
    if (!settings.jiraIngestionEnabled || !settings.jiraApiToken) {
        console.log("Jira ingestion is disabled or token is missing.");
        return;
    }

    const { jiraApiToken, jiraUserEmail, jiraBaseUrl } = settings;
    const auth = Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString("base64");

    for (const projectKey of jiraProjects) {
        let jql = `project = ${projectKey} AND status = Done`;
        if (startDate) {
            const startStr = startDate.toISOString().split('T')[0];
            jql += ` AND updated >= "${startStr}"`;
        }
        if (endDate) {
            const endStr = endDate.toISOString().split('T')[0];
            jql += ` AND updated <= "${endStr}"`;
        }
        if (!startDate && !endDate) {
            jql += ` AND updated > -7d`;
        }

        const res = await fetch(`${jiraBaseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=10&fields=summary,description,comment,status,priority`, {
            headers: {
                Authorization: `Basic ${auth}`,
                Accept: "application/json",
            },
        });
        const data = await res.json();

        if (!data.issues) continue;

        for (const issue of data.issues) {
            const f = issue.fields;
            const comments = (f.comment?.comments ?? [])
                .map((c: any) => `[${c.author?.displayName}]: ${c.body?.content?.[0]?.content?.[0]?.text ?? ""}`)
                .join("\n");

            const content = `Issue: ${issue.key} - ${f.summary}\nDescription: ${f.description?.content?.[0]?.content?.[0]?.text ?? ""}\nComments:\n${comments}`;
            await processAndIngest(content, "jira", issue.key, workspace, projectId);
        }
    }
}
