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

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_TIMEOUT_MS = 30000;
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

export function assetUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export async function getPosts(limit = 20, category?: string): Promise<Post[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);
    const response = await fetchWithTimeout(`${API_URL}/api/posts?${params.toString()}`, { next: { revalidate: 60 } });
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
    const response = await fetchWithTimeout(`${API_URL}/api/metrics`, { next: { revalidate: 30 } });
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

export async function login(username: string, password: string) {
  const response = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error("Login failed");
  return response.json() as Promise<{ access_token: string; role: string; token_type: string }>;
}

export async function validateAdminToken(token: string) {
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function adminFetch(path: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(await response.text());
  return response;
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
    const response = await fetchWithTimeout(`${API_URL}/api/posts/${slug}`, { next: { revalidate: 60 } });
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
