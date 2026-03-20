export const MOCK_RESPONSES: Record<string, string> = {
    'Has anyone seen a 502 error on ECS deployments?': `
**ECS 502 Error Resolution Guide**

Yes, this is a common issue often related to ALB health check path mismatches. 

**Quick Fixes:**
1. **Health Check Path**: Ensure your ALB health check is pointing to \`/api/health\` (or your specific health endpoint) and not just \`/\` if that route isn't handled.
2. **Target Group Port**: Verify that the Target Group is sending traffic to the correct container port (usually 4000 for API).
3. **Grace Period**: Check if your ECS Service "Health check grace period" is set high enough (recommended: 60-90s) to allow for application startup.

For more details, see the [ECS Runbook § 4.2](https://docs.mustcompany.com/engineering/ecs-runbook.md).
    `.trim(),

    'Who owns the Payments API and what stack does it use?': `
**Payments API (Project Atlas)**

*   **Owner**: Platform Engineering Team (@platform-leads)
*   **Team Lead**: Sarah Chen
*   **Stack**: 
    *   **Backend**: NestJS (Node.js 20)
    *   **Database**: PostgreSQL + pgvector
    *   **Cache**: Redis 7
    *   **Infrastructure**: AWS ECS (Fargate)

You can find the repository at [github.com/mustcompany/payments-api](https://github.com/mustcompany/payments-api).
    `.trim(),

    "What's the annual leave policy for new joiners?": `
**Annual Leave Policy — New Joiners**

Welcome to Must Company! Here's the summary of our leave policy:

*   **Entitlement**: 25 days per calendar year.
*   **Pro-rata**: For new joiners, leave is pro-rated from your start date.
*   **Carrying Over**: You can carry over up to 5 days to the next calendar year, to be used by March 31st.
*   **Booking**: Request leave via the [Must-HRM portal](https://hrm.mustcompany.com).

Full policy available in the [Employee Handbook § 12](https://docs.mustcompany.com/hr/employee-handbook.pdf).
    `.trim(),

    'What Jira tickets are open for the Redis timeout issue?': `
**Open Jira Tickets: Redis Timeout**

I've found 3 active tickets regarding the recent Redis timeout issues:

1.  **INFRA-102**: [Critical] Redis connection pool exhaustion in production. (In Progress)
2.  **INFRA-105**: [High] Implement exponential backoff for ioredis clients. (To Do)
3.  **INFRA-110**: [Medium] Update dev-cluster Redis version to 7.2. (Backlog)

You can view the full board here: [Must-IQ Jira Board](https://mustcompany.atlassian.net/jira/software/projects/INFRA/boards/12).
    `.trim(),
};
