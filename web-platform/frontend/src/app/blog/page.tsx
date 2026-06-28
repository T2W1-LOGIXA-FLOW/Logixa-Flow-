import BlogContent from "@/components/pages/BlogContent";
import { getPosts } from "@/components/api";

export const metadata = {
  title: "Insights",
};

const categories = ["Supply Chain", "Logistics", "Procurement", "Operations Excellence", "News"] as const;

export default async function BlogList({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = categories.find((category) => category === params.category);
  const posts = await getPosts(50, selectedCategory);
  const latestPosts = await getPosts(3);

  return <BlogContent posts={posts} latestPosts={latestPosts} selectedCategory={selectedCategory} />;
}
