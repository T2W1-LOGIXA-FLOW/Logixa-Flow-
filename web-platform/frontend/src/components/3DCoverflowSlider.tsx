"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Post } from "@/components/api";

interface CoverflowSliderProps {
  posts: Post[];
}

export default function CoverflowSlider({ posts }: CoverflowSliderProps) {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay || posts.length === 0) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % posts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPlay, posts.length]);

  if (posts.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-slate-100/5 border border-slate-200/10 rounded-lg">
        <p className="text-slate-400">No posts available</p>
      </div>
    );
  }

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % posts.length);
    setAutoPlay(false);
  };

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + posts.length) % posts.length);
    setAutoPlay(false);
  };

  return (
    <div className="w-full rounded-lg overflow-hidden">
      {/* Main Carousel */}
      <motion.div
        key={current}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <div className="relative w-full h-96 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden">
          {/* Background */}
          {posts[current]?.image_url && (
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url(${posts[current].image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center max-w-2xl z-10">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3"
              >
                {posts[current]?.type}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight"
              >
                {posts[current]?.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-slate-300 mb-6 line-clamp-2"
              >
                {posts[current]?.excerpt}
              </motion.p>
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                href={`/blog/${posts[current]?.slug}`}
                className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-orange-500 rounded-lg font-semibold hover:shadow-lg transition"
              >
                Read More
              </motion.a>
            </div>
          </div>

          {/* Navigation Buttons */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrev}
            onMouseEnter={() => setAutoPlay(false)}
            onMouseLeave={() => setAutoPlay(true)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            onMouseEnter={() => setAutoPlay(false)}
            onMouseLeave={() => setAutoPlay(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </motion.button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {posts.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setCurrent(index);
                  setAutoPlay(false);
                }}
                animate={{
                  scale: current === index ? 1.2 : 1,
                  opacity: current === index ? 1 : 0.5,
                }}
                className="w-2 h-2 rounded-full bg-white transition"
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Thumbnail Strip */}
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {posts.map((post, index) => (
          <motion.button
            key={index}
            onClick={() => {
              setCurrent(index);
              setAutoPlay(false);
            }}
            className={`flex-shrink-0 h-20 rounded-lg overflow-hidden cursor-pointer transition ${
              current === index ? "ring-2 ring-cyan-500" : "opacity-60 hover:opacity-100"
            }`}
            whileHover={{ scale: 1.05 }}
          >
            {post.image_url && (
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${post.image_url})`,
                }}
              />
            )}
            {!post.image_url && (
              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <p className="text-xs text-center text-slate-400 px-2 line-clamp-2">{post.title}</p>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
