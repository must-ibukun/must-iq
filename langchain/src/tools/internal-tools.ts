import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getActiveSettings } from '../../../libs/config/src/settings.service';
import { prisma } from '@must-iq/db';
import { buildRAGChain } from '../chains/rag-chain';
import { ingestDocument } from '../rag/ingest';

async function jiraFetch(path: string) {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_USER_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!base || !email || !token) return null;

  const res = await fetch(`${base}/rest/api/3${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function slackFetch(path: string, params: Record<string, string> = {}) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://slack.com/api${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function githubFetch(path: string) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export const searchKnowledgeBaseTool = tool(
  async ({ query, workspaces }: { query: string; workspaces: string[] }) => {
    const chain = await buildRAGChain(workspaces.length ? workspaces : ['general',"vault-v2"]);
    const result = await chain.invoke({ question: query, chat_history: [] });
    return typeof result === 'string' ? result : JSON.stringify(result);
  },
  {
    name: 'search_knowledge_base',
    description: `Search Must-IQ's internal knowledge base using semantic search.
Use this FIRST before going to external sources — the answer may already be ingested.
Returns relevant chunks with source citations.`,
    schema: z.object({
      query: z.string().describe('Specific search query'),
      workspaces: z.array(z.string()).default(['general']).describe('Workspaces to search across'),
    }),
  }
);

export const searchJiraTool = tool(
  async ({ jql, maxResults }: { jql: string; maxResults: number }) => {
    const data = await jiraFetch(
      `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,assignee,description,comment,resolution,resolutiondate,labels,priority`
    );
    if (!data) return 'Jira is not configured or unavailable.';

    const issues = data.issues ?? [];
    if (issues.length === 0) return `No Jira issues found for: ${jql}`;

    return issues.map((i: any) => {
      const comments = (i.fields.comment?.comments ?? [])
        .slice(-3)
        .map((c: any) => `  [${c.author?.displayName}]: ${c.body?.content?.[0]?.content?.[0]?.text ?? ''}`)
        .join('\n');
      return [
        `${i.key}: ${i.fields.summary}`,
        `Status: ${i.fields.status?.name} | Priority: ${i.fields.priority?.name}`,
        `Assignee: ${i.fields.assignee?.displayName ?? 'Unassigned'}`,
        i.fields.resolution ? `Resolution: ${i.fields.resolution.name} (${i.fields.resolutiondate?.slice(0, 10)})` : '',
        comments ? `Last comments:\n${comments}` : '',
      ].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');
  },
  {
    name: 'search_jira',
    description: `READ-ONLY: Search Jira issues using JQL (Jira Query Language).
Use for finding resolved tickets, known bugs, past incidents.
Example JQL: "project = INFRA AND status = Done AND text ~ 'redis timeout'"
Cannot create or modify tickets.`,
    schema: z.object({
      jql: z.string().describe('JQL query string'),
      maxResults: z.number().default(5).describe('Max issues to return (1-10)'),
    }),
  }
);

export const getJiraTicketTool = tool(
  async ({ ticketKey }: { ticketKey: string }) => {
    const data = await jiraFetch(
      `/issue/${ticketKey}?fields=summary,status,assignee,description,comment,resolution,resolutiondate,labels,priority,components,fixVersions`
    );
    if (!data) return `Could not fetch ticket ${ticketKey}.`;

    const f = data.fields;
    const comments = (f.comment?.comments ?? [])
      .map((c: any) => `[${c.author?.displayName} @ ${c.created?.slice(0, 10)}]: ${c.body?.content?.[0]?.content?.[0]?.text ?? '(rich text)'
        }`)
      .join('\n');

    return [
      `${data.key}: ${f.summary}`,
      `Status: ${f.status?.name} | Priority: ${f.priority?.name}`,
      `Assignee: ${f.assignee?.displayName ?? 'Unassigned'}`,
      `Labels: ${f.labels?.join(', ') || 'none'}`,
      f.resolution ? `Resolution: ${f.resolution.name} (${f.resolutiondate?.slice(0, 10)})` : '',
      `\nDescription:\n${f.description?.content?.[0]?.content?.[0]?.text ?? '(no description)'}`,
      comments ? `\nComments:\n${comments}` : '',
    ].filter(Boolean).join('\n');
  },
  {
    name: 'get_jira_ticket',
    description: `READ-ONLY: Fetch the full details of a specific Jira ticket by key (e.g. INFRA-441).
Returns summary, description, status, assignee, all comments, and resolution.
Cannot modify the ticket.`,
    schema: z.object({
      ticketKey: z.string().describe('Jira ticket key e.g. INFRA-441'),
    }),
  }
);

export const searchSlackTool = tool(
  async ({ query, channelHint }: { query: string; channelHint?: string }) => {
    const q = channelHint ? `${query} in:${channelHint}` : query;
    const data = await slackFetch('/search.messages', { query: q, count: '5', sort: 'score' });
    if (!data?.ok) return 'Slack search is not configured or unavailable.';

    const matches = data.messages?.matches ?? [];
    if (matches.length === 0) return `No Slack messages found for: "${query}"`;

    return matches.map((m: any) => [
      `[#${m.channel?.name ?? 'unknown'} @ ${new Date(+m.ts * 1000).toLocaleDateString()}]`,
      `${m.username ?? m.user}: ${m.text}`,
      m.permalink ? `Link: ${m.permalink}` : '',
    ].filter(Boolean).join('\n')).join('\n\n---\n\n');
  },
  {
    name: 'search_slack',
    description: `READ-ONLY: Search Slack message history for relevant threads, solutions, or discussions.
Use to find how past problems were solved in Slack conversations.
Cannot send messages or modify anything in Slack.`,
    schema: z.object({
      query: z.string().describe('Search query'),
      channelHint: z.string().optional().describe('Optional channel name to narrow search e.g. backend-help'),
    }),
  }
);

export const getSlackThreadTool = tool(
  async ({ channelId, threadTs }: { channelId: string; threadTs: string }) => {
    const data = await slackFetch('/conversations.replies', { channel: channelId, ts: threadTs, limit: '20' });
    if (!data?.ok) return 'Could not fetch Slack thread.';

    return (data.messages ?? []).map((m: any, i: number) => {
      const when = new Date(+m.ts * 1000).toLocaleString();
      return `[${i === 0 ? 'Original' : 'Reply'} @ ${when}] ${m.username ?? m.user}: ${m.text}`;
    }).join('\n');
  },
  {
    name: 'get_slack_thread',
    description: `READ-ONLY: Fetch all messages in a specific Slack thread using its channel ID and timestamp.
Use after search_slack when you need the full conversation context.
Cannot post replies or modify the thread.`,
    schema: z.object({
      channelId: z.string().describe('Slack channel ID (e.g. C08XXXXXX)'),
      threadTs: z.string().describe('Thread timestamp from search results'),
    }),
  }
);

export const getGithubFileTool = tool(
  async ({ repo, filePath, branch }: { repo: string; filePath: string; branch: string }) => {
    const data = await githubFetch(`/repos/${repo}/contents/${filePath}?ref=${branch}`);
    if (!data) return `Could not fetch ${filePath} from ${repo}.`;

    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf8').slice(0, 8000);
    }
    return data.content ?? 'File content not available.';
  },
  {
    name: 'get_github_file',
    description: `READ-ONLY: Fetch the content of a specific file from a GitHub repository.
Use for READMEs, architecture docs, configuration files, or runbooks stored in code repos.
Cannot commit or modify files.`,
    schema: z.object({
      repo: z.string().describe('owner/repo format e.g. mustcompany/auth-service'),
      filePath: z.string().describe('Path to file e.g. README.md or docs/architecture.md'),
      branch: z.string().default('main').describe('Branch name'),
    }),
  }
);

export const searchGithubIssuesTool = tool(
  async ({ repo, query, state }: { repo: string; query: string; state: 'open' | 'closed' | 'all' }) => {
    const data = await githubFetch(
      `/search/issues?q=${encodeURIComponent(`${query} repo:${repo}`)}&state=${state}&per_page=5`
    );
    if (!data) return 'GitHub search unavailable.';

    const items = data.items ?? [];
    if (items.length === 0) return `No GitHub issues found for "${query}" in ${repo}`;

    return items.map((i: any) => [
      `#${i.number}: ${i.title} [${i.state}]`,
      `Labels: ${i.labels?.map((l: any) => l.name).join(', ') || 'none'}`,
      i.body ? `Description: ${i.body.slice(0, 300)}${i.body.length > 300 ? '...' : ''}` : '',
      `URL: ${i.html_url}`,
    ].filter(Boolean).join('\n')).join('\n\n---\n\n');
  },
  {
    name: 'search_github_issues',
    description: `READ-ONLY: Search GitHub issues and pull requests in a specific repo.
Use for finding bug reports, feature discussions, or incident post-mortems tracked in GitHub.
Cannot create or comment on issues.`,
    schema: z.object({
      repo: z.string().describe('owner/repo e.g. mustcompany/payments-api'),
      query: z.string().describe('Search terms'),
      state: z.enum(['open', 'closed', 'all']).default('all'),
    }),
  }
);

export const searchConfluenceTool = tool(
  async ({ query, space }: { query: string; space?: string }) => {
    const base = process.env.CONFLUENCE_BASE_URL;
    const email = process.env.JIRA_USER_EMAIL;  // same Atlassian account
    const token = process.env.JIRA_API_TOKEN;
    if (!base || !email || !token) return 'Confluence is not configured.';

    const cql = space
      ? `text ~ "${query}" AND space.key = "${space}" AND type = page`
      : `text ~ "${query}" AND type = page`;

    const res = await fetch(
      `${base}/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=5&expand=body.storage`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) return 'Confluence search failed.';
    const data = await res.json();

    const results = data.results ?? [];
    if (results.length === 0) return `No Confluence pages found for: "${query}"`;

    return results.map((p: any) => {
      const text = p.body?.storage?.value
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600) ?? '';
      return [
        `Page: ${p.title}`,
        `Space: ${p.space?.name ?? space}`,
        `URL: ${base}/wiki${p._links?.webui ?? ''}`,
        text ? `Content preview: ${text}...` : '',
      ].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');
  },
  {
    name: 'search_confluence',
    description: `READ-ONLY: Search Confluence wiki pages for documentation, runbooks, or process docs.
Use for finding official company documentation, architecture decisions, or team wikis.
Cannot edit or create pages.`,
    schema: z.object({
      query: z.string().describe('Search terms'),
      space: z.string().optional().describe('Optional Confluence space key to narrow search'),
    }),
  }
);

// The ONLY write action the agent can take — saving knowledge into Must-IQ's own knowledge base.
export const ingestToMustIQTool = tool(
  async ({ title, content, source, sourceType, workspace, knowledgeType }) => {
    try {
      const wsRecord = await prisma.workspace.findFirst({
        where: { OR: [{ id: workspace }, { identifier: workspace }] }
      });
      const layer = wsRecord?.layer || 'docs';

      await ingestDocument({
        content,
        metadata: {
          title,
          source,
          source_type: sourceType,
          namespace: 'agent-ingested',
          knowledge_type: knowledgeType,
          workspace,
          layer,
          ingested_by: 'agent',
          ingested_at: new Date().toISOString(),
        },
      });
      return `✓ Saved to Must-IQ knowledge base under "${workspace}" — "${title}"`;
    } catch (err) {
      return `Ingestion failed: ${(err as Error).message}`;
    }
  },
  {
    name: 'ingest_to_mustiq',
    description: `Save a piece of knowledge into Must-IQ's knowledge base.
Use this after reading useful information from Jira, Slack, GitHub, or Confluence
that isn't already in the knowledge base.
This is the ONLY action that modifies anything — and it only modifies Must-IQ itself,
not any external system.`,
    schema: z.object({
      title: z.string().describe('Short descriptive title for this knowledge entry'),
      content: z.string().describe('The full content to save — be comprehensive'),
      source: z.string().describe('Where this came from e.g. INFRA-441, #backend-help, mustcompany/auth-service README'),
      sourceType: z.enum(['jira', 'slack', 'github', 'confluence', 'manual']),
      workspace: z.string().describe('Which workspace this belongs to e.g. engineering, hr'),
      knowledgeType: z.enum(['solution', 'process', 'reference', 'incident', 'decision']).describe('Type of knowledge'),
    }),
  }
);

export const getCurrentDateTool = tool(
  async () => new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  {
    name: 'get_current_date',
    description: 'Get today\'s date. Use for deadline questions or time calculations.',
    schema: z.object({}),
  }
);

export const lookupEmployeeTool = tool(
  async ({ name }: { name: string }) => {
    try {
      const employees = await prisma.user.findMany({
        where: { name: { contains: name, mode: 'insensitive' }, isActive: true },
        select: { name: true, email: true, role: true, teams: { select: { name: true } } },
        take: 5,
      });
      if (!employees.length) return `No employee found matching "${name}".`;
      return employees.map(e => {
        const teamNames = e.teams.map(t => t.name).join(', ') || 'no team';
        return `${e.name} — ${e.role} in ${teamNames} (${e.email})`;
      }).join('\n');
    } catch {
      return 'Employee directory unavailable right now.';
    }
  },
  {
    name: 'lookup_employee',
    description: 'Look up an employee\'s workspace, role, and email from the Must Company directory.',
    schema: z.object({ name: z.string().describe('Full or partial employee name') }),
  }
);

// All external integrations are READ-ONLY.
// The only "write" action is ingest_to_mustiq (writes to Must-IQ only).
export const ALL_TOOLS = [
  searchKnowledgeBaseTool,
  searchJiraTool,
  getJiraTicketTool,
  searchSlackTool,
  getSlackThreadTool,
  getGithubFileTool,
  searchGithubIssuesTool,
  searchConfluenceTool,
  ingestToMustIQTool,
  getCurrentDateTool,
  lookupEmployeeTool,
];

export const EXTERNAL_TOOLS = [
  searchJiraTool,
  getJiraTicketTool,
  searchSlackTool,
  getSlackThreadTool,
  getGithubFileTool,
  searchGithubIssuesTool,
  searchConfluenceTool,
];
