export interface Post {
  id: number;
  title: string;
  slug: string;
  type: "news" | "education" | "analysis";
  category: "Supply Chain" | "Logistics" | "Procurement" | "Operations Excellence" | "News";
  excerpt: string;
  content_html: string;
  image_url?: string | null;
  source_url?: string | null;
  is_published: boolean;
  status: "draft" | "published";
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntelligenceSource {
  id: number;
  title: string;
  url?: string | null;
  source_type: "manual" | "url" | "rss" | "file";
  category: Post["category"];
  trust_level: "standard" | "verified" | "high";
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AiMemory {
  id: number;
  category: Post["category"];
  source_title: string;
  source_url?: string | null;
  prompt: string;
  content: string;
  summary: string;
  status: "pending" | "approved" | "rejected" | "published";
  is_public: boolean;
  post_slug?: string | null;
  confidence_score: number;
  hallucination_score: number;
  created_at: string;
  updated_at: string;
}

export interface AgentStep {
  id: number;
  run_id: number;
  step_order: number;
  agent: string;
  message: string;
  created_at: string;
}

export interface AgentRun {
  id: number;
  objective: string;
  model: string;
  status: string;
  final_memory_id?: number | null;
  steps: AgentStep[];
  memory?: AiMemory | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRunsPage {
  items: AgentRun[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface AnalyticsData {
  date: string;
  agent_runs: number;
  pending_approvals: number;
  published_posts: number;
  sources_added: number;
}

export interface SystemStatus {
  missing_env: string[];
  scheduler_enabled: boolean;
  ai_key_configured: boolean;
  user_active_provider?: string;
  user_active_model?: string;
  admin_active_provider?: string;
  admin_active_model?: string;
  active_provider?: string;
  active_model?: string;
  scheduler_status?: {
    enabled: boolean;
    interval_hours: number;
  };
  providers: {
    key: string;
    label: string;
    env: string;
    configured: boolean;
    required: boolean;
    state: "ready" | "missing" | "fallback";
  }[];
  cache_backend: string;
  rate_limit_backend: string;
  counts: {
    sources: number;
    pending_brain: number;
    agent_runs: number;
    analytics_events: number;
    published_posts: number;
  };
}

export interface EnvProviderStatus {
  key: string;
  label: string;
  env: string;
  configured: boolean;
  required: boolean;
  state: "ready" | "missing" | "fallback";
}

export interface DashboardMetric {
  id: number;
  key: string;
  title: string;
  value: string;
  display_order: number;
  updated_at: string;
}

export interface AdminActivityEntry {
  time?: string | null;
  title: string;
  detail: string;
  tone: "cyan" | "violet" | "amber";
}

export interface AdminChatSession {
  id: number;
  session_id: string;
  title: string;
  agent_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminChatMessage {
  id: number;
  session_id: number;
  role: "user" | "agent" | "system";
  content: string;
  agent_id?: string | null;
  model_used?: string | null;
  tokens_used?: number | null;
  cost_estimate?: number | null;
  created_at: string;
  updated_at?: string;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://logixa-flow.onrender.com";
const API_TIMEOUT_MS = 30000;

// These are intentionally publishable client-side values. Supabase Auth uses
// a publishable/anon key in the browser; service-role/secret keys are never
// included here.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ephrnmigiwjhdjksreos.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_5d66_MvgxdoU06X3l_d5Pw_upXMW2Ml";

type NextFetchInit = RequestInit & { next?: { revalidate?: number | false } };

async function fetchWithTimeout(input: RequestInfo | URL, init: NextFetchInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function supabaseAuthRequest(
  grantType: "password" | "refresh_token",
  body: Record<string, string>,
) {
  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/auth/v1/token?grant_type=${grantType}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.msg === "string" ? data.msg : "Authentication failed");
  }
  return data as {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user?: { id: string; email?: string };
  };
}

export function assetUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export async function getPosts(limit = 20, category?: string): Promise<Post[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);
    const response = await fetchWithTimeout(`${API_URL}/api/posts?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    return response.ok ? response.json() : [];
  } catch {
    return [];
  }
}

export async function searchPosts(query: string, category?: string): Promise<Post[]> {
  try {
    const params = new URLSearchParams({ q: query });
    if (category) params.set("category", category);
    const response = await fetchWithTimeout(`${API_URL}/api/posts/search?${params.toString()}`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export async function getMetrics(): Promise<DashboardMetric[]> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/metrics`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) throw new Error("Metrics unavailable");
    return response.json();
  } catch {
    return [
      { id: 1, key: "disruption-risk", title: "Supply Chain Disruption Risk", value: "Low", display_order: 1, updated_at: "" },
      { id: 2, key: "market-demand", title: "Market Demand Shifts", value: "+12%", display_order: 2, updated_at: "" },
      { id: 3, key: "port-congestion", title: "Logistics & Port Congestion", value: "2.1d", display_order: 3, updated_at: "" },
      { id: 4, key: "inventory-cover", title: "Inventory Cover Projections", value: "38d", display_order: 4, updated_at: "" },
    ];
  }
}

export async function login(email: string, password: string) {
  return supabaseAuthRequest("password", { email, password });
}

export async function refreshAdminSession() {
  const { getAdminRefreshToken, setAdminSession } = await import("@/lib/adminSession");
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return false;
  try {
    const data = await supabaseAuthRequest("refresh_token", { refresh_token: refreshToken });
    setAdminSession(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function validateAdminToken(token: string) {
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) return true;
  } catch {
    // Attempt refresh below.
  }
  return refreshAdminSession();
}

export async function adminFetch(path: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    const refreshed = await refreshAdminSession();
    if (refreshed) {
      const { getAdminSessionToken } = await import("@/lib/adminSession");
      const refreshedToken = getAdminSessionToken();
      if (refreshedToken) {
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        response = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });
      }
    }
  }

  if (!response.ok) throw new Error(await response.text());
  return response;
}

export async function listAdminChatSessions(token: string): Promise<AdminChatSession[]> {
  try {
    const response = await adminFetch("/api/chat/sessions", token);
    return (await response.json()) as AdminChatSession[];
  } catch {
    throw new Error("Admin chat sessions unavailable");
  }
}

export async function getAdminChatSession(token: string, sessionId: string): Promise<AdminChatSession> {
  try {
    const response = await adminFetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, token);
    return (await response.json()) as AdminChatSession;
  } catch {
    throw new Error("Admin chat session unavailable");
  }
}

export async function getAdminChatMessages(token: string, sessionId: string): Promise<AdminChatMessage[]> {
  try {
    const response = await adminFetch(
      `/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      token,
    );
    return (await response.json()) as AdminChatMessage[];
  } catch {
    throw new Error("Admin chat history unavailable");
  }
}

export async function publicChatQuery(payload: {
  query: string;
  context?: { role: "user" | "agent" | "system"; content: string }[];
  agent_id?: string;
}) {
  const response = await fetchWithTimeout(`${API_URL}/api/chat/public-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Public chat failed");
  return response.json() as Promise<{ response: string; agent_id: string; model_used: string }>;
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/posts/${slug}`, {
      next: { revalidate: 60 },
    });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

export async function submitContact(payload: {
  name: string;
  email: string;
  company?: string;
  message: string;
}) {
  const response = await fetchWithTimeout(`${API_URL}/api/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Message submission failed");
  return response.json();
}

export async function subscribe(email: string) {
  const response = await fetchWithTimeout(`${API_URL}/api/subscribers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error("Subscription failed");
  return response.json();
}

export async function getAnalytics(token: string): Promise<AnalyticsData[]> {
  const response = await adminFetch("/api/admin/analytics", token);
  return response.json();
}

export async function getSystemStatus(token: string): Promise<SystemStatus> {
  const response = await adminFetch("/api/admin/system/status", token);
  return response.json();
}
