// ============================================================
// Must-IQ Agent — Barrel Export
//
// Any consumer that currently imports from 'must-iq-agent'
// can switch to importing from this index and get the same
// public surface:
//
//   import { buildMustIQAgent, runAgent, runAgentStream, AgentStreamEvent }
//     from '@must-iq/langchain/agent';
// ============================================================

export { buildMustIQAgent } from './agent.builder';
export { runAgent } from './agent.runner';
export { runAgentStream } from './agent.stream';
export type { AgentStreamEvent } from './agent.types';
