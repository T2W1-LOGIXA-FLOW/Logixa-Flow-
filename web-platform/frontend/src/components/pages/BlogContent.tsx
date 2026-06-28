"use client";

import Link from "next/link";

import LatestTicker from "@/components/LatestTicker";
import BlogSearch from "@/components/BlogSearch";
import StaticSphereBackground from "@/components/StaticSphereBackground";
import { Post } from "@/components/api";
import { useLocale } from "@/lib/LanguageContext";

const categories = ["Supply Chain", "Logistics", "Procurement", "Operations Excellence", "News"] as const;

interface BlogContentProps {
  posts: Post[];
  latestPosts: Post[];
  selectedCategory?: string;
}

export default function BlogContent({ posts, latestPosts, selectedCategory }: BlogContentProps) {
  const { t } = useLocale();

  return (
    <>
      <StaticSphereBackground variant="cyan" opacity="medium" position="right" />
      <main className="relative min-h-screen bg-slate-950 py-16 md:py-20 overflow-hidden">
        <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header Section */}
        <div className="blog-heading-grid mb-8">
          <div className="blog-heading-section">
            <div className="logixa-card page-heading">
              <p className="eyebrow">{t("blogEyebrow")}</p>
              <h1>{t("blogTitle")}</h1>
              <p className="leading-relaxed">{t("blogIntro")}</p>
            </div>
          </div>
          <div className="logixa-card">
            <LatestTicker posts={latestPosts} />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="logixa-card mb-8">
          <div className="category-tabs" aria-label="Insight categories">
            <Link className={!selectedCategory ? "category-tab active" : "category-tab"} href="/blog">
              {t("blogAllCategory")}
            </Link>
            {categories.map((category) => (
              <Link
                className={selectedCategory === category ? "category-tab active" : "category-tab"}
                href={`/blog?category=${encodeURIComponent(category)}`}
                key={category}
              >
                {category}
              </Link>
            ))}
          </div>
        </div>

        {/* Search Section */}
        <div className="logixa-card">
          <BlogSearch initialPosts={posts} category={selectedCategory} />
        </div>
        </div>
      </main>
    </>
  );
}
