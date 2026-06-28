"use client";

/**
 * SEO Metadata Helper
 * Generates meta tags, Open Graph, and structured data
 */
export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  author?: string;
  image?: string;
  url: string;
  type?: "website" | "article" | "blog";
  publishedAt?: string;
  updatedAt?: string;
}

export function generateMetaTags(metadata: SEOMetadata) {
  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords?.join(", "),
    authors: metadata.author ? [{ name: metadata.author }] : undefined,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: metadata.url,
      type: metadata.type || "website",
      images: metadata.image ? [{ url: metadata.image, width: 1200, height: 630 }] : undefined,
      publishedTime: metadata.publishedAt,
      modifiedTime: metadata.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: metadata.image ? [metadata.image] : undefined,
    },
  };
}

/**
 * Structured Data (JSON-LD) Generator
 */
export interface SchemaArticle {
  title: string;
  description: string;
  image?: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  url: string;
  publisher?: string;
}

export function generateArticleSchema(article: SchemaArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.image,
    author: {
      "@type": "Person",
      name: article.author,
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
    publisher: {
      "@type": "Organization",
      name: article.publisher || "Logixa Flow",
    },
  };
}

export interface SchemaBreadcrumb {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(breadcrumbs: SchemaBreadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface SchemaOrganization {
  name: string;
  url: string;
  logo: string;
  description: string;
  socialProfiles?: string[];
}

export function generateOrganizationSchema(org: SchemaOrganization) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: org.url,
    logo: org.logo,
    description: org.description,
    sameAs: org.socialProfiles || [],
  };
}

/**
 * SEO Sitemap Generator
 */
export interface SitemapItem {
  url: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export function generateSitemap(items: SitemapItem[]): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items
  .map(
    (item) => `  <url>
    <loc>${item.url}</loc>
    ${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : ""}
    ${item.changefreq ? `<changefreq>${item.changefreq}</changefreq>` : ""}
    ${item.priority ? `<priority>${item.priority}</priority>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;
  return xml;
}

/**
 * Robots.txt Generator
 */
export interface RobotsConfig {
  userAgent?: string;
  disallow?: string[];
  allow?: string[];
  crawlDelay?: number;
  sitemaps?: string[];
}

export function generateRobots(config: RobotsConfig[]): string {
  let robots = "";
  config.forEach((rule) => {
    robots += `User-agent: ${rule.userAgent || "*"}\n`;
    rule.disallow?.forEach((path) => {
      robots += `Disallow: ${path}\n`;
    });
    rule.allow?.forEach((path) => {
      robots += `Allow: ${path}\n`;
    });
    if (rule.crawlDelay) {
      robots += `Crawl-delay: ${rule.crawlDelay}\n`;
    }
    robots += "\n";
  });

  if (config[0]?.sitemaps) {
    config[0].sitemaps.forEach((sitemap) => {
      robots += `Sitemap: ${sitemap}\n`;
    });
  }

  return robots;
}

/**
 * Meta Tags Component for Next.js
 */
export function SEOHead({ metadata }: { metadata: SEOMetadata }) {
  const tags = generateMetaTags(metadata);

  return (
    <>
      <title>{tags.title}</title>
      <meta name="description" content={tags.description} />
      {tags.keywords && <meta name="keywords" content={tags.keywords} />}
      {tags.authors?.[0] && <meta name="author" content={tags.authors[0].name} />}

      {/* Open Graph */}
      <meta property="og:title" content={tags.openGraph.title} />
      <meta property="og:description" content={tags.openGraph.description} />
      <meta property="og:url" content={tags.openGraph.url} />
      <meta property="og:type" content={tags.openGraph.type} />
      {tags.openGraph.images?.[0] && (
        <>
          <meta property="og:image" content={tags.openGraph.images[0].url} />
          <meta property="og:image:width" content={String(tags.openGraph.images[0].width)} />
          <meta property="og:image:height" content={String(tags.openGraph.images[0].height)} />
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content={tags.twitter.card} />
      <meta name="twitter:title" content={tags.twitter.title} />
      <meta name="twitter:description" content={tags.twitter.description} />
      {tags.twitter.images?.[0] && <meta name="twitter:image" content={tags.twitter.images[0]} />}

      {/* Canonical */}
      <link rel="canonical" href={metadata.url} />

      {/* Structured Data */}
      {metadata.type === "article" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              generateArticleSchema({
                title: metadata.title,
                description: metadata.description,
                image: metadata.image,
                author: metadata.author || "Logixa Flow",
                datePublished: metadata.publishedAt || new Date().toISOString(),
                dateModified: metadata.updatedAt,
                url: metadata.url,
              })
            ),
          }}
        />
      )}
    </>
  );
}

/**
 * SEO Best Practices Checker
 */
export function checkSEOScore(metadata: SEOMetadata): { score: number; issues: string[] } {
  const issues: string[] = [];

  if (!metadata.title) issues.push("Title is missing");
  if (metadata.title && metadata.title.length < 30) issues.push("Title is too short (min 30 chars)");
  if (metadata.title && metadata.title.length > 60) issues.push("Title is too long (max 60 chars)");

  if (!metadata.description) issues.push("Meta description is missing");
  if (metadata.description && metadata.description.length < 120)
    issues.push("Meta description is too short (min 120 chars)");
  if (metadata.description && metadata.description.length > 160)
    issues.push("Meta description is too long (max 160 chars)");

  if (!metadata.image) issues.push("OG image is missing");
  if (!metadata.keywords || metadata.keywords.length === 0) issues.push("Keywords are missing");
  if (!metadata.author) issues.push("Author is missing");

  const score = Math.max(0, 100 - issues.length * 10);

  return { score, issues };
}
