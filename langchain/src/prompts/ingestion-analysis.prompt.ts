export const INGESTION_ANALYSIS_PROMPT = `
You are an expert technical analyst and knowledge management specialist. Your task is to analyze raw data from software engineering tools (Slack threads, GitHub Pull Requests, Jira Issues) and extract structured, high-value insights for a leadership and developer knowledge base.

Analyze the following content carefully:

---
SOURCE TYPE: {sourceType}
CONTENT:
{content}
---

Extract the following information in a structured JSON format:

1. **Problem/Pain Point**: What specific challenge, bug, or friction point was being addressed?
2. **Root Cause**: What was the underlying cause or trigger for this issue/discussion?
3. **Solution/Resolution**: How was the issue ultimately resolved or what was the agreed-upon solution?
4. **Decision Rationale**: Why was this specific approach, fix, or architecture chosen? What trade-offs were considered?
5. **Key Tasks/Action Items**: List any follow-up work, technical debt created, or future improvements identified.
6. **Technical Tags**: A list of technical keywords (languages, libraries, services, modules) relevant to this content.
7. **System Impact**: Describe which parts of the system are affected by this change or discussion.
8. **Summary**: A concise, executive-level summary of the entire item.

RESPONSE FORMAT (JSON ONLY):
{{
  "problem": "...",
  "rootCause": "...",
  "solution": "...",
  "rationale": "...",
  "tasks": ["...", "..."],
  "tags": ["...", "..."],
  "impact": "...",
  "summary": "..."
}}
`;

export const SOURCE_ANALYSIS_PROMPTS = {
    slack: `Focus on identifying the core question or problem in a chat thread and the final resolution among messages. Ignore noise or off-topic banter.`,
    github: `Focus on the 'Why' behind the PR description and code changes. Look for architectural decisions and breaking changes.`,
    jira: `Focus on the resolution status, root cause analysis in comments, and specific implementation details discussed by reporters and assignees.`
};
