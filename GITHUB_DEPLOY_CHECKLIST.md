# GitHub and Beta Deploy Checklist

## Before `git add .`

These files and folders must not be committed:

- `.env`
- `web-platform/backend/.env`
- `web-platform/frontend/.env.local`
- `node_modules/`
- `.next/`
- `.venv/`
- `__pycache__/`
- `.pytest_cache/`
- `*.db`
- `logs/`
- `uploads/`

They are covered by `.gitignore`. Do not use `git add -f` on any secret or generated file.

## Recommended Fresh Git Setup

The old `.git` folder showed object corruption. Use a fresh Git repo before pushing.

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00"
Rename-Item .git .git_corrupt_backup
git init
git branch -M main
git add .
git status --short
```

Check `git status --short` before committing. It must not show `.env`, `.env.local`, `node_modules`, `.next`, `.venv`, or local databases.

Then:

```powershell
git commit -m "Prepare Logixa Flow beta deploy"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## Vercel Frontend

- Framework: Next.js
- Root directory: `web-platform/frontend`
- Install command: `npm install`
- Build command: `npm run build`

Required environment variable:

```text
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

Do not add `DATABASE_URL` to Vercel for the beta deploy. The frontend calls the Render backend, and the backend owns database access.

### AI Keys for Frontend
Frontend does NOT need AI API keys. All AI operations are handled by the backend.

## Backend

Deploy the FastAPI backend separately on Render, Railway, Fly.io, or a VPS.

Required production environment variables:

```text
DATABASE_URL=postgresql://...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
JWT_SECRET=...
API_SECRET_TOKEN=...
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-domain.vercel.app
REQUIRE_AI_KEY=false
```

Optional AI provider keys (add one or more):

```text
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key
REDIS_URL=redis://...
```

**Important:** AI keys are optional. Set `REQUIRE_AI_KEY=false` to run without AI features.

Use PostgreSQL for beta users. SQLite is local preview only.

## AI Agents Configuration

AI agents read API keys from the project root `.env` file. See `AI_AGENTS_SETUP.md` for detailed configuration.

**For Production Deployment:**
- AI agents are optional for basic functionality
- Add AI keys to Render backend environment variables
- Set `REQUIRE_AI_KEY=false` if AI features are not required
- Agents can be run separately as background services

**Required for AI Agents:**
```text
# In project root .env or Render backend
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
BACKEND_URL=https://your-backend-url.onrender.com
API_SECRET_TOKEN=your-secure-token
```
