"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { Post } from "./api";
import PostCard from "./PostCard";
import { PremiumInput } from "./PremiumInputs";

interface EnhancedSearchProps {
  initialPosts: Post[];
  category?: string;
}

const categories = ["Supply Chain", "Logistics", "Procurement", "Operations Excellence", "News"] as const;
const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "popular", label: "Most Popular" },
  { value: "trending", label: "Trending" },
] as const;

export default function EnhancedSearchAndFilter({ initialPosts, category }: EnhancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "trending">("recent");
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search logic
  const filteredPosts = useMemo(() => {
    let results = initialPosts;

    // Filter by category
    if (selectedCategory) {
      results = results.filter((post) => post.category === selectedCategory);
    }

    // Search by title, excerpt, content
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      results = results.filter(
        (post) =>
          post.title?.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.category.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === "recent") {
      results.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
    } else if (sortBy === "popular") {
      // Beta-local popularity score until analytics ranking is connected.
      results.sort(() => Math.random() - 0.5);
    }

    return results;
  }, [initialPosts, selectedCategory, searchTerm, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex-1 w-full sm:w-auto">
          <PremiumInput
            placeholder="Search insights, articles, topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-2"
        >
          ⚙️ {showFilters ? "Hide" : "Show"} Filters
        </button>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="logixa-card p-6 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Category</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(undefined)}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === undefined
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                        : "hover:bg-slate-700"
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === cat
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                          : "hover:bg-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Sort By</label>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        sortBy === option.value
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/50"
                          : "hover:bg-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(searchTerm || selectedCategory || sortBy !== "recent") && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm flex items-center gap-2 hover:bg-cyan-500/30"
                  >
                    Search: &quot;{searchTerm}&quot; ✕
                  </button>
                )}
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(undefined)}
                    className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm flex items-center gap-2 hover:bg-orange-500/30"
                  >
                    {selectedCategory} ✕
                  </button>
                )}
                {sortBy !== "recent" && (
                  <button
                    onClick={() => setSortBy("recent")}
                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-2 hover:bg-purple-500/30"
                  >
                    Sort: {sortOptions.find((o) => o.value === sortBy)?.label} ✕
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-slate-400"
      >
        Found <span className="text-cyan-400 font-semibold">{filteredPosts.length}</span> insight
        {filteredPosts.length !== 1 ? "s" : ""}
      </motion.div>

      {/* Search Results */}
      <AnimatePresence mode="wait">
        {filteredPosts.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-slate-400 text-lg">No insights found matching your criteria</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory(undefined);
                setSortBy("recent");
              }}
              className="mt-4 px-6 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              Reset Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
