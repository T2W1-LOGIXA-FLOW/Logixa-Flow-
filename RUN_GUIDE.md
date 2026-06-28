# Logixa Flow Run Guide

Project root:

```text
D:\1 main\Logixa Flow ver.1.1.1.00
```

## Prerequisites

- Python 3.11+
- Node.js 22+
- Docker optional

## Backend API

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00\web-platform\backend"
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open:

- Swagger: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

Local preview uses SQLite by default. Deployment should use PostgreSQL.

## Frontend

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00\web-platform\frontend"
npm install
npm run dev -- -p 3000
```

Open:

- http://localhost:3000

## AI Agents

Backend must be running first.

```powershell
cd "D:\1 main\Logixa Flow ver.1.1.1.00"
python -m pip install -r agents\requirements.txt
cd agents
python main_pipeline.py
```

Generated drafts are saved under `agents\data\drafts\`.

## Environment Files

| File | Purpose |
| --- | --- |
| `.env.example` | Root template, safe to commit |
| `.env` | Local root secrets, do not commit |
| `web-platform/backend/.env.example` | Backend template |
| `web-platform/backend/.env` | Local backend config, do not commit |
| `web-platform/frontend/.env.local.example` | Frontend template |
| `web-platform/frontend/.env.local` | Local frontend config, do not commit |

## Troubleshooting

| Problem | Solution |
| --- | --- |
| Port already in use | Stop the old process or use another port |
| Frontend cannot reach backend | Check `NEXT_PUBLIC_API_URL` |
| `npm install` fails | Delete `node_modules` only, then run `npm install` again |
| Python import errors | Run `python -m pip install -r requirements.txt` |
| SQLite DB issue | Stop backend and delete `web-platform/backend/logixa_flow.db` |

Do not delete `package-lock.json`; Vercel should use it for reproducible installs.
