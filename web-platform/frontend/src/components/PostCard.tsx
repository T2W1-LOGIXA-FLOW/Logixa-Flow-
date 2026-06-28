"use client";

import Link from "next/link";

import Image from "next/image";
import { motion } from "framer-motion";
import { assetUrl, type Post } from "./api";
import FormattedDate from "./FormattedDate";

export default function PostCard({ post, wide = false }: { post: Post; wide?: boolean }) {
  const image = assetUrl(post.image_url);
  return (
    <motion.article
      className={(wide ? "logixa-card post-card wide" : "logixa-card post-card") + " card-gradient-hover"}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {image ? (
        <div className="relative w-full h-40 post-card-image-wrapper">
          <Image src={image} alt={post.title || ""} fill className="object-cover rounded-md post-card-image" />
        </div>
      ) : null}
      <div className="post-card-content">
        <div className="card-topline">
          <span className="post-card-category">{post.category}</span>
          <span className="post-card-date">
            {post.published_at ? <FormattedDate dateString={post.published_at} locale="my-MM" /> : <time>New</time>}
          </span>
        </div>
        <h3>{post.title}</h3>
        {post.excerpt ? <p>{post.excerpt}</p> : null}
      </div>
      <div className="post-card-actions">
        <Link href={`/blog/${post.slug}`} className="read-insight-link">
          Read insight
        </Link>
        {post.source_url ? (
          <a
            href={post.source_url}
            target="_blank"
            rel="noreferrer"
            className="source-link"
          >
            Source
          </a>
        ) : null}
      </div>
    </motion.article>
  );
}
