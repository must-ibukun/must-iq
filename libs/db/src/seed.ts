import { PrismaClient } from './generated-client';
import { hash } from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '@nestjs/common';

// Load environment variables from projects root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const logger = new Logger('DB Seed');

async function main() {
    logger.log('Starting DB seed...');

    const saltRounds = 10;
    const adminPassword = await hash('admin123', saltRounds);
    const managerPassword = await hash('manager123', saltRounds);
    const employeePassword = await hash('employee123', saltRounds);

    // ── Clean up existing to prevent dupes during seed testing ──────────────
    await prisma.workspace.deleteMany({});
    await prisma.team.deleteMany({});

    // ── Seed Teams (formerly Projects) with nested Workspace sources ────────
    const teamDefs = [
        {
            name: 'API Infrastructure',
            githubEnabled: true,
            slackEnabled: false,
            jiraEnabled: false,
            identifiers: ['must-iq/api', 'must-iq/core'],
            status: 'active',
            workspaces: [
                { type: 'GITHUB' as const, identifier: 'must-iq/api', tokenBudget: 25000 },
                { type: 'GITHUB' as const, identifier: 'must-iq/core', tokenBudget: 25000 },
            ]
        },
        {
            name: 'Frontend Excellence',
            githubEnabled: true,
            slackEnabled: true,
            jiraEnabled: false,
            identifiers: ['must-iq/web', '#frontend-dev'],
            status: 'active',
            workspaces: [
                { type: 'GITHUB' as const, identifier: 'must-iq/web', tokenBudget: 30000 },
                { type: 'SLACK' as const, identifier: '#frontend-dev', tokenBudget: 15000 },
            ]
        },
        {
            name: 'Onboarding Flow',
            slackEnabled: true,
            githubEnabled: false,
            jiraEnabled: false,
            identifiers: ['#hr-onboarding'],
            status: 'active',
            workspaces: [
                { type: 'SLACK' as const, identifier: '#hr-onboarding', tokenBudget: 10000 },
            ]
        },
        {
            name: 'Security Audit',
            jiraEnabled: true,
            slackEnabled: false,
            githubEnabled: false,
            identifiers: ['Global MSQ'],
            status: 'active',
            workspaces: [
                { type: 'JIRA' as const, identifier: 'Global MSQ', tokenBudget: 40000 },
            ]
        },
        {
            name: 'Compliance Center',
            jiraEnabled: true,
            slackEnabled: false,
            githubEnabled: false,
            identifiers: ['COMP'],
            status: 'active',
            workspaces: [
                { type: 'JIRA' as const, identifier: 'COMP', tokenBudget: 45000 },
                { type: 'GENERIC' as const, identifier: 'vault-v2', tokenBudget: 20000 },
            ]
        }
    ];

    // ── Pre-create shared workspaces for the seed ──────────────
    const sharedJira = await prisma.workspace.create({
        data: { type: 'JIRA', identifier: 'Global MSQ', tokenBudget: 40000 }
    });

    for (const t of teamDefs as any[]) {
        const isSecurityOrCompliance = t.name === 'Security Audit' || t.name === 'Compliance Center';

        await prisma.team.create({
            data: {
                name: t.name,
                githubEnabled: t.githubEnabled || false,
                slackEnabled: t.slackEnabled || false,
                jiraEnabled: t.jiraEnabled || false,
                identifiers: t.identifiers || [],
                status: t.status,
                workspaces: {
                    create: (t.workspaces ?? [])
                        .filter((w: any) => w.identifier !== 'Global MSQ') // Don't create shared ones again
                        .map((w: any) => ({
                            type: w.type,
                            identifier: w.identifier,
                            tokenBudget: w.tokenBudget,
                        })),
                    connect: isSecurityOrCompliance && t.identifiers.includes('Global MSQ')
                        ? [{ id: sharedJira.id }]
                        : undefined
                },
            },
        });
    }
    logger.log('Teams and Workspaces seeded.');

    // ── Load teams by name so we can assign team IDs to users ───────────────
    const teams = await prisma.team.findMany({ select: { id: true, name: true } });
    const teamByName = Object.fromEntries(teams.map(t => [t.name, t.id]));
    logger.log(`Teams loaded: ${teams.map(t => t.name).join(', ')}`);

    // ── Seed Users — connect via teamId FK ──────────────────────────────────
    const users = [
        {
            email: 'admin@mustcompany.com',
            password: adminPassword,
            name: 'Must Admin',
            role: 'ADMIN' as const,
            teamName: null,   // Admins have access to all teams; no single primary team
        },
        {
            email: 'manager@mustcompany.com',
            password: managerPassword,
            name: 'Must Manager',
            role: 'MANAGER' as const,
            teamName: 'API Infrastructure',
        },
        {
            email: 'employee@mustcompany.com',
            password: employeePassword,
            name: 'Must Employee',
            role: 'EMPLOYEE' as const,
            teamName: 'Frontend Excellence',
        },
        {
            email: 'hr@mustcompany.com',
            password: employeePassword,
            name: 'HR Lead',
            role: 'MANAGER' as const,
            teamName: 'Onboarding Flow',
        },
        {
            email: 'security@mustcompany.com',
            password: employeePassword,
            name: 'Security Analyst',
            role: 'EMPLOYEE' as const,
            teamName: 'Security Audit',
        },
        {
            email: 'compliance@mustcompany.com',
            password: employeePassword,
            name: 'Compliance Officer',
            role: 'EMPLOYEE' as const,
            teamName: 'Compliance Center',
        },
    ];

    for (const u of users) {
        const teamId = u.teamName ? teamByName[u.teamName] ?? null : null;

        const created = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                name: u.name,
                role: u.role,
                teams: teamId ? { set: [{ id: teamId }] } : { set: [] },
            },
            create: {
                email: u.email,
                passwordHash: u.password,
                name: u.name,
                role: u.role,
                teams: teamId ? { connect: [{ id: teamId }] } : undefined,
            },
            include: { teams: { select: { name: true } } },
        });

        const teamLabel = created.teams?.[0]?.name ?? (u.role === 'ADMIN' ? 'ALL TEAMS' : 'none');
        logger.log(`User seeded: ${created.email} → team: ${teamLabel}`);
    }

    const settingsValue = JSON.stringify({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.3,
        topK: 40,
        apiKeys: [
            // ── Google Gemini ──────────────────────────────────────
            { id: 'seed-gemini-1', provider: 'gemini', label: 'Must-IQ - Gemini (System Default)', model: 'gemini-1.5-flash', key: 'AIzaSyDTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxHPUs', isActive: false },
            { id: 'seed-gemini-2', provider: 'gemini', label: 'Must-IQ - Gemini (Primary Admin)', model: 'gemini-1.5-flash', key: 'AIzaSyAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxBNU0', isActive: false },
            { id: 'seed-gemini-3', provider: 'gemini', label: 'Must-IQ - Gemini (Secondary)', model: 'gemini-1.5-flash', key: 'AIzaSyAmxxxxxxxxxxxxxxxxxxxxxxxxxxxxSoLw', isActive: false },
            { id: 'seed-gemini-4', provider: 'gemini', label: 'Must-IQ - Gemini (DevOps)', model: 'gemini-1.5-flash', key: 'AIzaSyBtxxxxxxxxxxxxxxxxxxxxxxxxxxxxEJ_I', isActive: false },
            // ── OpenAI ────────────────────────────────────────────
            { id: 'seed-openai-1', provider: 'openai', label: 'Must-IQ - OpenAI (Pro)', model: 'gpt-4o-mini', key: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxvhwA', isActive: false },
            { id: 'seed-openai-2', provider: 'openai', label: 'Must-IQ - OpenAI (Backup)', model: 'gpt-4o', key: 'sk-proj-yyyyyyyyyyyyyyyyyyyyyyyyyyyyWqzP', isActive: false },
            // ── Anthropic Claude ──────────────────────────────────
            { id: 'seed-anthropic-1', provider: 'anthropic', label: 'Must-IQ - Anthropic (Sonnet)', model: 'claude-3-5-sonnet-20240620', key: 'sk-ant-axxxxxxxxxxxxxxxxxxxxxxxxxxxxTgAA', isActive: false },
            { id: 'seed-anthropic-2', provider: 'anthropic', label: 'Must-IQ - Anthropic (Opus)', model: 'claude-3-opus-20240229', key: 'sk-ant-byyyyyyyyyyyyyyyyyyyyyyyyyyyyRmBB', isActive: false },
            // ── xAI Grok ──────────────────────────────────────────
            { id: 'seed-xai-1', provider: 'xai', label: 'Must-IQ - xAI (Grok-3)', model: 'grok-3-mini', key: 'xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxMnZ1', isActive: false },
            { id: 'seed-xai-2', provider: 'xai', label: 'Must-IQ - xAI (Grok-Beta)', model: 'grok-beta', key: 'xai-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyKpQ2', isActive: false },
            // ── Local Ollama ──────────────────────────────────────
            { id: 'seed-ollama-1', provider: 'ollama', label: 'Must-IQ - Ollama (Llama 3)', model: 'llama3', key: 'local-no-key-required-xxxxxxxxxxxxLLM8', isActive: false },
            { id: 'seed-ollama-2', provider: 'ollama', label: 'Must-IQ - Ollama (Mistral)', model: 'mistral', key: 'local-no-key-required-yyyyyyyyyyyyMST2', isActive: false },
            { id: 'seed-ollama-3', provider: 'ollama', label: 'Must-IQ - Ollama (Gemma 3)', model: 'gemma3:27b', key: 'local-no-key-required-zzzzzzzzzzzzGMA3', isActive: false },
        ],
        slackIngestionEnabled: true,
        repoIngestionEnabled: true,
        jiraIngestionEnabled: true,
        autoCreateTeams: true,
        embeddingProvider: 'gemini',
        embeddingModel: 'gemini-embedding-2-preview',
        embeddingDimensions: 768,
        intentClassificationEnabled: true,
        intentClassificationThreshold: 15,
        intentClassificationPrompt: "Classify as 'GENERAL' or 'CODE'. Output one word.",
        intentMap: JSON.stringify({
            "CODE": "CODE_RETRIEVAL_QUERY",
            "GENERAL": "RETRIEVAL_QUERY"
        }),
        cacheL1Ttl: 60000,
        cacheL2Ttl: 600,
        cacheL2Key: "must-iq:settings:llm"
    });

    await prisma.setting.upsert({
        where: { key: 'llm' },
        update: { value: settingsValue },
        create: { key: 'llm', value: settingsValue },
    });
    logger.log('Default LLM settings seeded.');
    logger.log('✅ Seed completed successfully.');
}

main()
    .catch((e) => {
        logger.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
