# AI Agents Setup

AI features are handled by the backend. The public frontend should call the backend and should not hold AI provider secrets.

## Backend Variables

Add provider keys to the Render backend environment, local root `.env`, or `web-platform/backend/.env`:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
GROQ_API_KEY=your-groq-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
REQUIRE_AI_KEY=false
STRICT_LLM_ERRORS=false
```

Only one provider is required for the app to answer. Multiple providers improve fallback options.

## Local Agent Pipeline

Backend:

```powershell
cd web-platform\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Agent pipeline:

```powershell
cd agents
python main_pipeline.py
```

Shared variables:

```text
BACKEND_URL=http://localhost:8000
API_SECRET_TOKEN=change-this-before-public-deploy
TEMPERATURE=0.55
PIPELINE_BATCH_LIMIT=3
MIN_SIMILARITY_TO_MERGE=0.74
ENABLE_SCHEDULER=false
AUTO_APPROVE_PUBLISH=false
```

## Production

For the current deployment, Render can run the web API and lightweight AI endpoints. A separate Koyeb worker is optional and should only be deployed after a stable worker command is finalized.

Optional worker variables:

```text
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
BACKEND_URL=https://your-render-backend.onrender.com
API_SECRET_TOKEN=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
HUGGINGFACE_API_KEY=...
```

## Checks

1. Open the backend `/health` endpoint.
2. Confirm AI provider status is ready in admin system status.
3. Test the public `/agent` page.
4. Test the admin agent chat.
5. Confirm no provider key appears in browser source, Vercel logs, GitHub, or screenshots.

## Security

- Never commit real API keys.
- Rotate any key that was pasted into a public place or committed by mistake.
- Keep production keys in Render or a secret manager.
- Keep Vercel limited to public `NEXT_PUBLIC_*` variables.
