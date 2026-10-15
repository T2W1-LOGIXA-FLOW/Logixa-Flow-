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
        className="w-full relative"
      >
        {/* Navigation Buttons - Left */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrev}
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 -translate-x-3 p-3 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-full transition hover:bg-slate-800/70"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </motion.button>

        {/* Navigation Buttons - Right */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 translate-x-3 p-3 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-full transition hover:bg-slate-800/70"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </motion.button>

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
            <div className="text-center max-w-2xl z-10 bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/30">
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
                className="text-lg text-slate-200 mb-6 line-clamp-2"
              >
                {posts[current]?.excerpt}
              </motion.p>
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                href={`/blog/${posts[current]?.slug}`}
                className="inline-block px-6 py-3 bg-cyan-500 rounded-lg font-semibold text-white hover:bg-cyan-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Read More
              </motion.a>
            </div>
          </div>

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
      <div className="mt-6 flex gap-3 overflow-x-auto pb-2 justify-center">
        {posts.map((post, index) => (
          <motion.button
            key={index}
            onClick={() => {
              setCurrent(index);
              setAutoPlay(false);
            }}
            className={`flex-shrink-0 h-20 w-40 rounded-lg overflow-hidden cursor-pointer transition ${
              current === index 
                ? "ring-2 ring-cyan-500 bg-slate-800" 
                : "opacity-70 hover:opacity-100 bg-slate-900/50"
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
                <p className="text-xs text-center text-[#e2e8f0] px-2 line-clamp-2">{post.title}</p>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
