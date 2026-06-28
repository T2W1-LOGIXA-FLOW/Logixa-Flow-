# Logixa Flow Local Preview

## 1. Backend

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00\web-platform\backend"
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/redoc

## 2. Frontend

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00\web-platform\frontend"
npm install
npm run dev -- -p 3000
```

Frontend URL:

- http://localhost:3000

## 3. Local Env Files

Create local env files from examples when needed:

```powershell
Copy-Item .env.example .env
Copy-Item web-platform\backend\.env.example web-platform\backend\.env
Copy-Item web-platform\frontend\.env.local.example web-platform\frontend\.env.local
```

Use local values only. Never commit real secrets.

## 4. Test Before Deploy

```powershell
cd web-platform\backend
python -m pytest -q

cd ..\frontend
npm run build
```

## 5. Common Fixes

| Issue | Fix |
| --- | --- |
| Frontend cannot reach backend | Check `NEXT_PUBLIC_API_URL` in `web-platform/frontend/.env.local` |
| Missing frontend dependencies | Run `npm install` in `web-platform/frontend` |
| Backend dependency error | Run `python -m pip install -r requirements.txt` in `web-platform/backend` |
| SQLite local DB issue | Stop backend and delete `web-platform/backend/logixa_flow.db` |

## 6. Deploy Reminder

For beta deployment, use Vercel for the frontend and a separate backend host with PostgreSQL.
