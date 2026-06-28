import type { Post } from "@/components/api";
import { API_URL } from "@/components/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || API_URL;

async function fetchPublishedPosts(): Promise<Post[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/posts?limit=200`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return [];
    }
    const posts: Post[] = await response.json();
    return posts.filter((post) => post.status === "published" || post.is_published);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export default async function sitemap() {
  const posts = await fetchPublishedPosts();

  const urls = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at ?? post.published_at,
  }));

  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/blog` },
    ...urls,
  ];
}
