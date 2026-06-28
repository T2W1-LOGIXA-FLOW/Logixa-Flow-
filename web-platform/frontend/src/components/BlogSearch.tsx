"use client";

import { useEffect, useState } from "react";
import { Post, searchPosts } from "./api";
import PostCard from "./PostCard";
import Card from "@/components/shadcn/Card";
import Skeleton from "@/components/shadcn/Skeleton";

interface BlogSearchProps {
  initialPosts: Post[];
  category?: string;
}

export default function BlogSearch({ initialPosts, category }: BlogSearchProps) {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let isMounted = true;
    async function runSearch() {
      if (!debouncedQuery) {
        setPosts(initialPosts);
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);
      try {
        const results = await searchPosts(debouncedQuery, category);
        if (!isMounted) return;
        setPosts(results);
      } catch {
        if (!isMounted) return;
        setError(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    runSearch();
    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, category, initialPosts]);

  return (
    <section className="blog-search-section">
      <div className="search-input-wrapper">
        <label htmlFor="blog-search" className="sr-only">
          Search insights by keyword
        </label>
        <input
          id="blog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search insights by keyword"
          className="search-input"
        />
      </div>
      {loading ? <p className="search-status py-2 text-sm text-slate-300">Searching insights...</p> : null}
      {error ? <p className="search-error py-2 text-sm text-red-400">Unable to search insights. Please try again.</p> : null}
      <div className="post-list space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="mb-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-24 w-24 flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-6 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </Card>
          ))
        ) : posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} wide />)
        ) : (
          <div className="logixa-card empty-state p-8 text-center text-slate-400">
            No published insights match your search.
          </div>
        )}
      </div>
    </section>
  );
}
