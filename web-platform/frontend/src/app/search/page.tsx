'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getPosts, Post } from '@/components/api';
import PostCard from '@/components/PostCard';
import PageBackground from '@/components/PageBackground';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [results, setResults] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    // Load posts
    getPosts(50).then(posts => {
      setAllPosts(posts);
      setLoading(false);
    });
    // Load search history from localStorage
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const availableTags = ['Supply Chain', 'Logistics', 'Procurement', 'Operations', 'Analysis', 'Tutorial'];

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);

    const filtered = allPosts.filter(post =>
      (post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTags.length === 0 || selectedTags.some(tag => post.category?.includes(tag)))
    );

    setResults(filtered);

    // Save to history
    if (searchTerm.trim() && !searchHistory.includes(searchTerm)) {
      const newHistory = [searchTerm, ...searchHistory].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);

    const filtered = allPosts.filter(post =>
      (query === '' || post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(query.toLowerCase())) &&
      (newTags.length === 0 || newTags.some(tag => post.category?.includes(tag)))
    );

    setResults(filtered);
  };

  return (
    <PageBackground overlayOpacity={0.85}>
      <main className="min-h-screen py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
            Search Insights
          </h1>
          <p className="text-slate-400 mt-2">Find exactly what you&apos;re looking for</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search posts..."
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="w-full px-6 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500">
              🔍
            </span>
          </div>
        </motion.div>

        {/* Tag Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <p className="text-sm text-slate-400 mb-3 uppercase tracking-wider">Filter by Tag</p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <motion.button
                key={tag}
                onClick={() => toggleTag(tag)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedTags.includes(tag)
                    ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Search History (if empty search) */}
        {query === '' && searchHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <p className="text-sm text-slate-400 mb-3 uppercase tracking-wider">Recent Searches</p>
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 5).map(item => (
                <motion.button
                  key={item}
                  onClick={() => handleSearch(item)}
                  whileHover={{ scale: 1.05 }}
                  className="px-3 py-1 bg-slate-800/50 border border-slate-700 text-slate-300 rounded text-sm hover:border-slate-600 transition"
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        <div className="mt-12">
          <p className="text-sm text-slate-400 mb-6">
            {loading ? 'Loading...' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
          </p>

          {!loading && results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="logixa-card border border-slate-700 rounded-lg p-12 text-center"
            >
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-slate-400">No posts found. Try adjusting your search or filters.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {results.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </main>
    </PageBackground>
  );
}
