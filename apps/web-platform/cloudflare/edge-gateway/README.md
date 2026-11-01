# Logixa Flow — Cloudflare Edge Gateway Worker

Edge Telemetry, IoT Signals, and Webhook Ingestion Gateway deployed on Cloudflare Workers for sub-10ms global latency and DDoS protection.

## Deployment

```bash
cd apps/web-platform/cloudflare/edge-gateway
npm install
npx wrangler deploy
```

## Environment Variables

Configure in `wrangler.jsonc` or Cloudflare Dashboard:
* `UPSTREAM_API`: URL of the Logixa Flow Render FastAPI backend (e.g. `https://logixa-flow-api.onrender.com`)
* `GATEWAY_SECRET`: Shared secret forwarded in `X-Logixa-Gateway-Secret` header to verify edge traffic
* `ALLOWED_ORIGIN`: Allowed CORS origin (e.g. `https://logixa-flow.vercel.app`)
