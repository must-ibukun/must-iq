# Admin & User Guide

Welcome to the Must-IQ system. This guide covers the core concepts and workflows for managing teams, knowledge sources, and leveraging Cross-Layer Intelligence.

## Core Hierarchy

Must-IQ is structured around a flexible hierarchy:
1. **Teams**: Functional units within the company (e.g., "Payments API", "Mobile UX").
2. **Workspaces (Integrations)**: Individual data sources linked to a team (a Slack channel, a Jira project, or a GitHub repo).
3. **Architectural Layers**: Strategic tags assigned to workspaces to power Cross-Layer Analysis.

### Architectural Layers
Each workspace is assigned one of the following layers:
- **Docs**: Business logic, wikis, and non-technical handbooks.
- **Backend**: Server-side logic, API endpoints, and database handlers.
- **Web**: Frontend web application code and UI libraries.
- **Mobile**: iOS, Android, and cross-platform mobile code.
- **Infrastructure**: IAC scripts, DevOps configurations, and cloud setups.
- **AI**: Prompt engineering, model configurations, and AI logic.

---

## Administrative Tasks

### 1. Onboarding a New Team
1. Navigate to **Admin Dashboard -> Teams**.
2. Click **+ Onboard New Team**.
3. Name your team and provide an owner email.
4. Click **Discover Sources** to automatically find Slack channels and Jira projects.
5. **Smart Discovery**: The system will automatically suggest an **Architectural Layer** based on the source name (e.g., `#api-sprint` -> `Backend`).
6. Select the desired sources and click **Save Team**.

### 2. Manual Workspace Addition
If a source isn't discovered automatically, you can add it manually:
1. Go to **Admin Dashboard -> Workspace**.
2. Click **+ Add Workspace**.
3. Select the **Source Type** (Slack, Jira, GitHub, or Generic).
4. Enter the **Identifier** (e.g., Slack Channel ID or GitHub Repo name).
5. Choose the **Architectural Layer Choice**. The system will offer a "Smart Guess" as you type.

### 3. User Management
- **Role Assignment**: Elevate users to `MANAGER` or `ADMIN` roles.
- **Multi-Team Assignment**: Users can be assigned to multiple teams simultaneously. Click the pencil icon on the Users table to manage their team memberships.
- **Token Visibility**: Per-user token usage is tracked in the `TokenLog` table and visible in the Admin Dashboard. There are no per-user daily budget limits or enforcement — the log is for visibility and cost attribution only.

---

## Chat & Search Strategies

### Search Scope
In the Chat UI, you can toggle individual team integrations on/off. This allows you to:
- **Focus your search**: Only search "Payments API" and "Backend" documentation.
- **Filter noise**: Exclude Slack noise when searching for a specific Jira ticket.

### Cross-Layer Analysis
Must-IQ is designed to connect the dots across your entire architecture. 
- **End-to-End Tracing**: Ask "How does the login flow work?" and the AI will trace it from the `web` layer components to the `backend` services.
- **Connectivity Insights**: "Which backend routes are called by the Mobile app's profile screen?"
- **Impact Analysis**: "If I change the User database schema, which Frontend components will be affected?"

### Search Modes
- **Quick Search**: For fast answers, definitions, and code snippets.
- **Deep Search (Agentic)**: For complex reasoning, tool usage, and cross-repository synthesis.

---

## Ingestion Tips
- **Knowledge Base (Manual)**: Upload PDFs or text files to specific workspaces. Use the `Docs` layer for general knowledge.
- **Automatic Sync (Scheduled)**: Slack channels, GitHub merged PRs, and Jira resolved issues are pulled automatically at **06:00 and 18:00 daily** (last 12 hours of data per run). No manual trigger is needed for routine updates. Each source can be toggled on/off from **Admin UI → System Settings** (`slackIngestionEnabled`, `repoIngestionEnabled`, `jiraIngestionEnabled`).
- **On-Demand Sync**: To refresh a specific workspace outside the scheduled window, use the manual sync option in the Workspace section of the Admin UI.
- **Slack app_mention → Jira Card**: When a user @-mentions the Must-IQ bot in Slack, it automatically fetches the thread context, generates a Jira card with an AI summary, and replies in the thread with the ticket link. This is a real-time interactive flow and does not require any admin configuration beyond having a valid Slack bot token and Jira credentials.
- **Event History**: Use the **Ingestion History** filters to track when specific data was added or to troubleshoot ingestion errors.
