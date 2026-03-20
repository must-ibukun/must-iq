# @must-iq/api

Must-IQ Backend API Gateway, built with NestJS.

## Key Features

- **Auth**: JWT-based authentication with role-aware access control (Admin, Manager, Employee, Viewer).
- **Chat Service**: Orchestrates the conversational pipeline, handles RAG context retrieval, and integrates with the AI Engine.
- **Settings**: Manages dynamic LLM provider configurations and API keys (AES encrypted at rest).
- **Token Management**: Tracks and enforces per-user and per-workspace token budgets.

## 🔍 Deep Search Policy Cascade

The API enforces a strict hierarchy for determining if "Deep Search" (Agentic Reasoning) is enabled for a given query:

1. **Admin Override**: Checked via `@must-iq/config`'s `getActiveSettings()`. If `agenticReasoningEnabled` is `false`, Deep Search is forced **OFF**.
2. **Per-Query Payload**: The `ChatRequest` DTO accepts an optional `deepSearch: boolean`.
3. **User Preference**: If no per-query flag is provided, the API uses the user's `deepSearchEnabled` preference stored in the database.
4. **System Default**: Fallback is `false`.

## API Endpoints

### Chat
- `POST /api/v1/chat`: Standard chat request.
- `POST /api/v1/chat/stream`: Streaming chat response (SSE).

**Payload Example:**
```json
{
  "message": "What are our latest security protocols?",
  "sessionId": "abc-123",
  "deepSearch": true,
  "workspaces": ["security-audit"]
}
```

### Profile
- `PATCH /api/v1/auth/profile`: Update user details including `deepSearchEnabled`.

### Admin
- `GET /api/v1/admin/llm-settings`: Retrieve global AI configuration.
- `PUT /api/v1/admin/llm-settings`: Update global AI configuration including `agenticReasoningEnabled`.
