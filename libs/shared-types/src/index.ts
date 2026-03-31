export * from './constants';

export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER";

export type WorkspaceType = "SLACK" | "JIRA" | "GITHUB" | "GENERIC";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamIds: string[];
  deepSearchEnabled: boolean;
  teams?: { id: string; name: string }[];
  tokenBudgetOverride?: number;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface RequestUser {
  sub: string;
  email: string;
  role: UserRole;
  teamIds: string[];
  workspace?: string;
  deepSearchEnabled?: boolean;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  teamIds: string[];
  teamNames?: string[];
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  tokensUsed?: number;
  sources?: DocumentChunk[];
  localImageId?: string;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  totalTokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IngestionSourceType = "slack" | "github" | "jira" | "doc";

export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  page?: number;
  score: number;
  workspace?: string;
}

export interface RagChunk {
  id: string;
  content: string;
  source: string;
  workspace: string;
  distance: number;
}

export interface RerankCandidate {
  id: string;
  content: string;
  source: string;
  page?: number;
  workspace: string;
  layer?: string;
  language?: string;
  techStack?: string;
  score: number;
}

export interface IngestRequest {
  source: string;
  workspace?: string;
  tags?: string[];
}

export interface TokenUsage {
  userId: string;
  date: string;
  tokensUsed: number;
  tokenBudget: number;
  percentUsed: number;
  remainingTokens: number;
}

export interface TokenLog {
  id: string;
  userId: string;
  sessionId: string;
  queryTokens: number;
  responseTokens: number;
  totalTokens: number;
  cached: boolean;
  model: string;
  createdAt: Date;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  stream?: boolean;
  deepSearch?: boolean;
  // Pre-resolved workspace identifiers (e.g. ["#backend-help", "vault-v2"]) — derived by the frontend from availableTeams
  workspaces?: string[];
  image?: string | null;
}

export interface ChatResponse {
  message: Message;
  sessionId: string;
  tokenUsage: TokenUsage;
}

export interface APIError {
  statusCode: number;
  message: string;
  code: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamIds: string[];
  deepSearchEnabled: boolean;
  teams?: { id: string, name: string }[];
  isActive: boolean;
  tokenBudget: number;
  tokensToday: number;
  tokenBudgetOverride?: number;
  createdAt: Date;
  lastActiveAt?: Date;
}

export interface AdminTeam {
  id: string;
  name: string;
  slackEnabled: boolean;
  githubEnabled: boolean;
  jiraEnabled: boolean;
  identifiers: string[];
  ownerEmail?: string;
  status: string;
  chunkCount: number;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  workspaces?: AdminWorkspace[];
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  user?: { name: string; email: string } | null;
  action: string;
  workspace?: string;
  tokensUsed?: number;
  metadata?: any;
  createdAt: Date;
}

export interface IngestionEvent {
  id: string;
  sourceId: string;
  sourceType: string;
  workspace: string;
  score?: number;
  status: string;
  chunksStored: number;
  metadata?: any;
  createdAt: Date;
}

export interface AdminWorkspace {
  id: string;
  type: WorkspaceType;
  name?: string;
  identifier: string;
  externalId?: string;
  tokenBudget: number;
  layer: string;
  techStack?: string | null;
  teamIds: string[];
  userCount: number;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  tokensToday: number;
  cacheRate: number;
  chunksByWorkspace: { workspace: string; count: number }[];
}

export interface AdminTokenUsage {
  todayTotal: number;
  yesterdayTotal: number;
  estCostToday: number;
  estCostYesterday: number;
  dailyTotals: Record<string, number>;
  topUsers: { name: string; tokens: number }[];
}

export interface BulkIngestRequest {
  teamId?: string;
  workspaceIds: string[];
  all?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface IngestionResult {
  status: string;
  chunksStored: number;
  workspace: string;
  source: string;
  zipUpload: boolean;
  error?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  shortName?: string;
  icon: string;
  model: string;
  description: string;
}

export interface NotificationModalContent {
  type: 'success' | 'error';
  title: string;
  message: string;
  details?: string;
}

export interface AIQueryParams {
    query: string;
    userId: string;
    workspace: string;
    sessionId: string;
    history: { role: "user" | "assistant"; content: string }[];
    useAgent?: boolean;
    stream?: boolean;
    onChunk?: (chunk: string) => void;
    workspaces?: string[];
    image?: string | null;
    // Set false for integration paths (Slack/Jira) where sources are unused
    includeSources?: boolean;
}

export interface AIQueryResult {
    response: string;
    provider: string;
    model: string;
    sessionId: string;
    sources?: any[];
}
