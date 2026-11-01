export interface Env {
  UPSTREAM_API: string;
  GATEWAY_SECRET?: string;
  ALLOWED_ORIGIN?: string;
}

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
]);

function corsHeaders(origin: string, allowedOrigin?: string): HeadersInit {
  const allow = allowedOrigin || "*";
  return {
    "Access-Control-Allow-Origin": origin === allow || allow === "*" ? origin : allow,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Logixa-Signature, X-Telegram-Bot-Api-Secret-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env.ALLOWED_ORIGIN) });
    }

    // Health check endpoint
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          service: "logixa-flow-edge-gateway",
          edge_region: (request as any).cf?.colo || "global",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin, env.ALLOWED_ORIGIN) },
        }
      );
    }

    const upstreamBase = env.UPSTREAM_API.replace(/\/$/, "");
    const targetUrl = new URL(upstreamBase + url.pathname + url.search);

    const headers = new Headers(request.headers);
    for (const h of HOP_BY_HOP) {
      headers.delete(h);
    }

    if (env.GATEWAY_SECRET) {
      headers.set("X-Logixa-Gateway-Secret", env.GATEWAY_SECRET);
    }
    headers.set("X-Logixa-Edge", "cloudflare-worker");
    headers.set("X-Forwarded-Host", url.host);
    headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    const isBodyMethod = request.method !== "GET" && request.method !== "HEAD";
    const upstreamReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: isBodyMethod ? request.body : undefined,
      redirect: "manual",
    });

    try {
      const upstreamRes = await fetch(upstreamReq);
      const resHeaders = new Headers(upstreamRes.headers);
      const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);
      for (const [k, v] of Object.entries(cors)) {
        resHeaders.set(k, v);
      }
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: resHeaders,
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "Upstream API unavailable",
          detail: err?.message || String(err),
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin, env.ALLOWED_ORIGIN) },
        }
      );
    }
  },
};
