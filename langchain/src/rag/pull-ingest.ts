import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "@must-iq/db";
import { IngestionSourceType } from "@must-iq/shared-types";
import { getActiveSettings, createUtilityLLM } from "@must-iq/config";
import { ingestDocument } from "./ingest";
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
 * Pull GitHub PRs
 */
export async function pullRepoPRs(repo: string, workspace: string, projectId?: string, startDate?: Date, endDate?: Date) {
    const settings = await getActiveSettings();
    if (!settings.repoIngestionEnabled || !settings.githubToken) {
        console.log("GitHub ingestion is disabled or token is missing.");
        return;
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=closed&per_page=20`, {
        headers: {
            Authorization: `Bearer ${settings.githubToken}`,
            Accept: "application/vnd.github+json",
        },
    });
    const prs = await res.json();

    if (!Array.isArray(prs)) {
        console.error("GitHub API error or invalid repo format.");
        return;
    }

    for (const pr of prs) {
        if (!pr.merged_at) continue;

        const mergedDate = new Date(pr.merged_at);
        if (startDate && mergedDate < startDate) continue;
        if (endDate && mergedDate > endDate) continue;

        const content = `Title: ${pr.title}\nDescription: ${pr.body}\nAuthor: ${pr.user?.login}`;
        await processAndIngest(content, "github", repo, workspace, projectId);
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
