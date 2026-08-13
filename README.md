# Agent Platform web

Desktop-only React client for the local `ai-agent-platform` API.

```bash
npm install
cp .env.example .env
npm run dev
```

Start the backend separately from `../ai-agent-platform`:

```bash
cd ../ai-agent-platform
docker compose up -d
uv run app
```

For local Redis inspection, Redis Commander is available at
http://localhost:8083.

The UI uses the backend's WorkOS AuthKit flow for hosted sign-in/sign-up. The
backend establishes an HttpOnly session cookie; the browser sends it with API
requests. Configure `http://localhost:5173` as a redirect URI/allowed origin.
For an explicit local bypass, use the backend's gated development authentication
settings; production never silently falls back.

The UI supports agent creation and configuration, per-agent model and temperature,
user-scoped document uploads, TXT/PDF/DOCX chat attachments, and streamed chat
responses. Chat attachments are immediately available to the current turn and
are automatically indexed into the authenticated user's RAG document library for
future retrieval. The Documents tab opens after indexing and shows the original
filename. The model selector is populated from the backend runtime catalog;
`qwen3:8b` remains the fallback and default for newly created agents.

Desktop workspace navigation includes dedicated Agents, Sessions, Documents, and
Tool registry screens. Sessions aggregate retained history across agents and support
open/create/delete; Documents provide shared-library search, upload, and delete; and
the registry exposes each currently available tool and its input schema.

Session history hydrates from durable PostgreSQL checkpoints (with Redis used only
for hot cache/locking), and the document library hydrates from Qdrant with
authenticated user-scoped list/delete support. Tool,
retrieval, and preparation trace metadata is persisted with assistant turns.
Generated PDF and Markdown artifacts arrive as stream metadata and render as
authenticated download cards, including after a session is reloaded. Assistant
messages render safe GitHub-flavored Markdown and fenced code blocks with copy actions.

## Source layout

```text
src/
├── app/          # application composition and top-level state
├── pages/        # dashboard/workspace composition boundaries
├── components/   # app-level layout components
├── features/     # auth, agents, chat, documents, and models (API + hooks + UI)
└── shared/       # API client, config, generic hooks, helpers, and UI primitives
```

Dependencies flow from `app/pages` into `features`, then into `shared`; shared
code does not depend on feature or app code.
