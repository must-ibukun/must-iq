# @must-iq/web

Next.js 14 (App Router) frontend for the Must-IQ internal AI platform.

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Public Landing Page |
| `/login` | `app/(auth)/login/page.tsx` | Sign-in page — email/password + SSO |
| `/chat` | `app/(chat)/chat/page.tsx` | Main chat interface |
| `/admin` | `app/(admin)/admin/page.tsx` | Admin dashboard |

## Component tree

```
src/
├── app/
│   ├── layout.tsx              ← root layout, sets up ThemeProvider & globals.css
│   ├── globals.css             ← design tokens + Tailwind base + light/dark classes
│   ├── page.tsx                ← LandingPage
│   ├── (auth)/login/page.tsx   ← LoginPage
│   ├── (chat)/chat/page.tsx    ← ChatPage
│   └── (admin)/admin/page.tsx  ← AdminPage
│
├── components/
│   ├── ThemeProvider.tsx       ← next-themes Provider for Light/Dark mode
│   ├── ui/index.tsx            ← Badge, Button, Toggle, ProgressBar
│   ├── chat/
│   │   ├── Sidebar.tsx         ← session history + scope selector + user footer
│   │   ├── ScopeSelector.tsx   ← department checkbox panel
│   │   ├── TopBar.tsx          ← title + active scope pills
│   │   ├── ChatWindow.tsx      ← messages, empty state, typing indicator
│   │   └── InputBar.tsx        ← textarea + send + mode toggle
│   └── TokenUsageBadge.tsx
│
├── store/
│   ├── auth.store.ts           ← Zustand: user, token, isAuthenticated
│   └── chat.store.ts           ← Zustand: messages, sessions, selectedDepts, mode
│
├── hooks/
│   └── useAuth.ts              ← redirect guard for protected pages
│
├── lib/
│   └── api.ts                  ← typed fetch wrappers (authApi, chatApi, adminApi)
│
└── middleware.ts               ← Next.js route protection (token cookie)
```

## Running locally

```bash
# From workspace root
cp apps/web/.env.local.example apps/web/.env.local
# Edit NEXT_PUBLIC_API_URL if needed

npm install
nx run web:dev
# → http://localhost:3000
```

## Demo credentials (dev mode only — no API required)

| Email | Password | Role |
|-------|----------|------|
| any@email.com | any (≥3 chars) | Employee |
| admin@email.com | any (≥3 chars) | Admin → can access `/admin` |

When `NEXT_PUBLIC_API_URL` is set, real API calls are made instead of the mock responses.

## Design system

- **Font:** DM Serif Display (headings) + Geist (body) + DM Mono (code/numbers)
- **Colors & Theming:** Supports both Dark and Light modes using `next-themes`. Base transitions from dark navy (`#05080f`) to clean white (`#ffffff`) with cyan (`#00b5d8` / `#00d4ff`) primary accents.
- **Background:** dot-grid pattern + animated radial glows on landing and auth pages
- **Palette vars:** dynamically defined in `globals.css` as CSS custom properties (`.dark` class)

## Key features

- **Deep Search Toggle** — users can switch between Quick Search (RAG) and Deep Search (Agentic Reasoning) directly in the input bar.
- **Auto-Reset Logic** — per-query overrides automatically reset to the user's default preference after the message is sent.
- **Profile Customization** — users can set their preferred search mode in Profile Settings.
- **Admin Master Switch** — global control for administrators to enable/disable agentic features.
- **Streaming chat** — SSE stream from `/api/v1/chat` with real-time support for both standard RAG and Agentic flows.
