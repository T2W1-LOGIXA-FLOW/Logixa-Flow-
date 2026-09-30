# AI Agents Setup

AI provider secrets stay on the backend and worker. The Vercel frontend must
only call the backend API and must never store provider keys.

## Backend AI Variables

Add these to the Render backend environment:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=<gemini-api-key>
OPENROUTER_API_KEY=<openrouter-api-key>
GROQ_API_KEY=<groq-api-key>
HUGGINGFACE_API_KEY=<huggingface-api-key>
REQUIRE_AI_KEY=false
STRICT_LLM_ERRORS=false
```

Only one provider is required for the app to answer. Multiple providers improve
fallback behavior.

## Render Worker

The background agent worker is designed to run separately from the FastAPI web
service.

Render worker settings:

```text
Service Type: Background Worker
Runtime: Docker
Branch: main
Docker Build Context Directory: .
Dockerfile Path: agents/Dockerfile
Docker Command: python worker_loop.py
```

Worker environment variables:

```text
BACKEND_URL=https://your-render-backend.onrender.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<same-admin-password-as-backend>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<gemini-api-key>
OPENROUTER_API_KEY=<openrouter-api-key>
GROQ_API_KEY=<groq-api-key>
HUGGINGFACE_API_KEY=<huggingface-api-key>
PIPELINE_BATCH_LIMIT=3
AUTO_APPROVE_PUBLISH=false
WORKER_MODE=web-pipeline
WORKER_INTERVAL_SECONDS=3600
WORKER_RUN_ON_START=true
WORKER_ONCE=false
```

`WORKER_MODE=web-pipeline` logs into the backend, runs the preview pipeline,
and keeps output in the admin review flow.

## Manual Local Run

Backend:

```powershell
cd web-platform\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

One agent run:

```powershell
cd agents
python main_pipeline.py --web-pipeline
```

Long-running local worker:

```powershell
cd agents
python worker_loop.py
```

## Checks

1. Backend `/health` is reachable.
2. Admin system status shows at least one AI provider as ready.
3. Public `/agent` returns a live response.
4. Admin agent chat returns a live response.
5. Brain queue loads without an API error.
6. Worker logs show `starting run mode=web-pipeline`.
7. No provider key appears in browser source, Vercel logs, GitHub, or screenshots.

## Security

- Never commit real API keys.
- Rotate any key that was pasted into a public place or committed by mistake.
- Keep production keys in Render environment variables.
- Keep Vercel limited to public `NEXT_PUBLIC_*` variables.
