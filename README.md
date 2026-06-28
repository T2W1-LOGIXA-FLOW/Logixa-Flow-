# Logixa Flow

Logixa Flow is a supply-chain intelligence platform with:

- Next.js frontend in `web-platform/frontend`
- FastAPI backend in `web-platform/backend`
- Optional AI content agents in `agents`
- PostgreSQL for deployment and SQLite for local preview

## Local Preview

Backend:

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00\web-platform\backend"
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00\web-platform\frontend"
npm install
npm run dev -- -p 3000
```

Open:

- Site: http://localhost:3000
- API docs: http://127.0.0.1:8000/docs

## Deployment Shape

- Frontend: Vercel, root directory `web-platform/frontend`
- Backend: Render, Railway, Fly.io, or VPS
- Database: hosted PostgreSQL

Required frontend variable:

```text
NEXT_PUBLIC_API_URL=https://your-backend-url
```

Required backend variables depend on enabled features, but normally include:

```text
DATABASE_URL=postgresql://...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
JWT_SECRET=...
```

Do not commit real `.env` files. Keep only `.env.example` files in the repo.

## Checks

Frontend:

```powershell
cd web-platform\frontend
npm run build
```

Backend:

```powershell
cd web-platform\backend
python -m pytest -q
```

## Notes

- Local build folders, virtual environments, uploaded files, SQLite databases, and QA logs are ignored.
- `node_modules` and `.venv` are local-only and should be recreated with install commands.
- Some beta features intentionally show beta/demo notices until the production integrations are connected.
