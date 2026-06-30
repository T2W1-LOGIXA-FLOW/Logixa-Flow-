# AI Agents API Key Configuration Guide

## 🤖 Where to Add AI Agent API Keys

AI agents read API keys from the **project root `.env` file**. The agents directory automatically loads configuration from:

```
D:\1 main\logixa-flow-github-clean\.env
```

### 📋 Required API Keys

Depending on which LLM provider you choose, add the corresponding keys to `.env`:

#### 1. **Gemini AI (Google)** - Recommended
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL_NAME=gemini-2.5-flash
```

#### 2. **OpenRouter AI** - Free tier available
```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL_NAME=meta-llama/llama-3-8b-instruct:free
OPENROUTER_FALLBACK_MODEL_NAME=deepseek/deepseek-r1:free
```

#### 3. **Groq AI** - Fast, free tier
```env
LLM_PROVIDER=groq
GROQ_API_KEY=your-groq-key
GROQ_MODEL_NAME=llama-3.1-8b-instant
```

#### 4. **HuggingFace** - Optional
```env
HF_TOKEN=your-huggingface-token
HUGGINGFACE_API_KEY=your-huggingface-token
HUGGINGFACE_MODEL_NAME=
```

### 🔑 Additional Configuration

```env
# Agent Pipeline Settings
TEMPERATURE=0.55
PIPELINE_BATCH_LIMIT=3
STRICT_LLM_ERRORS=false
ENABLE_SCHEDULER=false
AUTO_APPROVE_PUBLISH=false

# Backend Connection
BACKEND_URL=http://localhost:8000
API_SECRET_TOKEN=change-this-before-public-deploy

# Memory and Similarity
MIN_SIMILARITY_TO_MERGE=0.74
```

## 🚀 Production Deployment API Keys

### For Render Backend (render.yaml)

The `render.yaml` file includes these optional AI keys (set `sync: false`):

```yaml
- key: GEMINI_API_KEY
  sync: false
- key: OPENROUTER_API_KEY
  sync: false
- key: GROQ_API_KEY
  sync: false
- key: REDIS_URL
  sync: false
```

**In Render Dashboard:**
1. Go to your backend service
2. Navigate to Environment Variables
3. Add your chosen AI provider API keys
4. Set `REQUIRE_AI_KEY=false` for basic functionality without AI

### For Vercel Frontend

Frontend does NOT need AI API keys directly. The frontend calls the backend, and the backend handles AI operations.

Only set in Vercel:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

## 🧪 Testing AI Configuration

### Local Preview
```powershell
# 1. Add API keys to .env in project root
# 2. Start backend
cd web-platform/backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 3. Run agents (in new terminal)
cd agents
python main_pipeline.py
```

### Production Check
After deployment, check AI status:
```bash
# Access the admin diagnostics endpoint
GET https://your-backend.onrender.com/api/admin/diagnostics
```

## ⚠️ Security Notes

1. **Never commit `.env` files** - They are in `.gitignore`
2. **Use environment-specific keys** - Different keys for dev/prod
3. **Rotate keys regularly** - Especially for production
4. **Monitor usage** - Track API costs and rate limits
5. **Fallback configuration** - Set `REQUIRE_AI_KEY=false` if AI is optional

## 📊 Cost Estimates

Current configuration per 1k tokens:
```env
AI_COST_PER_1K=0.002
EMBEDDING_COST_PER_1K=0.0004
```

- **Gemini 2.5 Flash**: ~$0.075/1M input tokens, ~$0.30/1M output tokens
- **OpenRouter Free Tier**: Rate-limited but free
- **Groq Llama 3.1**: Free tier available with rate limits

## 🔧 Troubleshooting

### Agents not connecting to backend
- Check `BACKEND_URL` in `.env`
- Verify `API_SECRET_TOKEN` matches backend
- Ensure backend is running

### AI API errors
- Verify API key is valid
- Check provider rate limits
- Try different LLM provider
- Set `STRICT_LLM_ERRORS=false` for debugging

### Memory not saving
- Check `data/` directory permissions
- Verify SQLite database file creation
- Check `MIN_SIMILARITY_TO_MERGE` threshold
