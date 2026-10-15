"use client";

import Link from "next/link";

import Image from "next/image";
import { motion } from "framer-motion";
import { assetUrl, type Post } from "./api";
import { useLocale } from "@/lib/LanguageContext";

export default function LatestTicker({ posts }: { posts: Post[] }) {
  const { t } = useLocale();
  const visiblePosts = posts.slice(0, 3);
  return (
    <aside className="latest-ticker" aria-label="Latest updated articles">
      <div className="ticker-heading">
        <p className="eyebrow">{t("latestUpdatesEyebrow")}</p>
        <strong>{t("recentlyPublished")}</strong>
      </div>
      <div className="ticker-track">
        {visiblePosts.map((post, index) => {
          const image = assetUrl(post.image_url);
          return (
            <Link className="ticker-item" href={`/blog/${post.slug}`} key={`${post.slug}-${index}`}>
              <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: index * 0.05 }}>
                {image ? <Image src={image} alt={post.title || ""} width={32} height={32} className="rounded-full flex-shrink-0" /> : <span className="w-8 h-8 bg-cyan-500/20 rounded-full flex-shrink-0" />}
                <span className="truncate">{post.title}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
