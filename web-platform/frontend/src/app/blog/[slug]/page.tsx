import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { assetUrl, getPost } from "@/components/api";
import ShareButtons from "@/components/ShareButtons";
import BlogPDFExport from "@/components/BlogPDFExport";
import PageBackground from "@/components/PageBackground";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = `${siteUrl}/blog/${post.slug}`;
  const imageUrl = assetUrl(post.image_url);

  return {
    title: post.title,
    description: post.excerpt || `Read the latest ${post.type} insight from Logixa Flow.`,
    keywords: [post.category, "supply chain", "logistics", "procurement"],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || `Read the latest ${post.type} insight from Logixa Flow.`,
      url,
      type: "article",
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: ["Logixa Flow"],
      tags: [post.category],
      images: imageUrl
        ? [{ url: imageUrl, alt: post.title || "Logixa Flow blog image" }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || `Read the latest insight from Logixa Flow.`,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    notFound();
  }
  const image = assetUrl(post.image_url);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // JSON-LD Structured Data for Article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: image,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: "Logixa Flow",
      url: site,
    },
    publisher: {
      "@type": "Organization",
      name: "Logixa Flow",
      url: site,
      logo: {
        "@type": "ImageObject",
        url: `${site}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${site}/blog/${post.slug}`,
    },
  };

  return (
    <PageBackground overlayOpacity={0.15}>
      <main className="article-shell">
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <p className="eyebrow">{post.type}</p>
      <h1>{post.title}</h1>
      <div className="article-meta">
        {post.published_at ? new Date(post.published_at).toLocaleDateString("my-MM") : "Draft"}
      </div>
      {image ? (
        <div className="relative w-full h-64">
          <Image src={image} alt={post.title || ""} fill className="object-cover rounded-md article-image" />
        </div>
      ) : null}
      <article className="article-body" dangerouslySetInnerHTML={{ __html: post.content_html }} />
      <div className="mt-8 flex gap-2 flex-wrap items-center">
        <ShareButtons title={post.title} url={`${site}/blog/${post.slug}`} description={post.excerpt} />
        <BlogPDFExport title={post.title} htmlContent={post.content_html} publishedAt={post.published_at || undefined} />
      </div>
      {post.source_url ? (
        <p className="article-source">
          <a href={post.source_url} target="_blank" rel="noreferrer">
            Source
          </a>
        </p>
      ) : null}
    </main>
    </PageBackground>
  );
}
