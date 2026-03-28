export function buildSlackJiraCardPrompt(threadText: string): string {
    return `You are analyzing a Slack thread to create a Jira task card.

Slack thread:
${threadText}

Based on the thread above, respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "title": "concise task title (max 100 chars)",
  "description": "detailed description of the issue or task based on the thread discussion",
  "priority": "Critical|High|Medium|Low"
}`;
}
