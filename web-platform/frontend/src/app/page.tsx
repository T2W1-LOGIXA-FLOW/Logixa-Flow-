"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/LanguageContext";

// Count-up component with intersection observer
const CountUp = ({ end, duration = 1.5, suffix = "" }: { end: number | string; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (nodeRef.current) {
      observer.observe(nodeRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const numericEnd = typeof end === 'string' ? parseFloat(end.replace(/[^0-9.]/g, '')) : end;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      // Ease-out function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = easeOut * numericEnd;

      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(numericEnd);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration, suffix]);

  const formattedCount = typeof end === 'string' && end.includes('%') 
    ? `${Math.round(count)}%` 
    : typeof end === 'string' && end.includes('+')
    ? `${Math.round(count).toLocaleString()}+`
    : typeof end === 'string' && end.includes('.')
    ? count.toFixed(1)
    : Math.round(count).toLocaleString();

  return <span ref={nodeRef}>{formattedCount}</span>;
};
import MouseGlow from "@/components/MouseGlow";
import PostCard from "@/components/PostCard";
import NewsletterForm from "@/components/NewsletterForm";
import CoverflowSlider from "@/components/3DCoverflowSlider";
import { getPosts, Post } from "@/components/api";

import Card from "@/components/shadcn/Card";
import MyanmarFlowMap from "@/components/MyanmarFlowMap";
import { DotGlobeHero } from "@/components/ui/globe-hero";
import ScrollBackground from "@/components/ScrollBackground";
import { WorldMap } from "@/components/ui/map";

export default function Home() {
  const { t } = useLocale();
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);

  useEffect(() => {
    getPosts(3).then(setLatestPosts);
  }, []);

  const capabilities = [
    { title: "Visibility", description: "Real-time inventory, port flow, and demand signal clarity." },
    { title: "Logistics", description: "Route intelligence, carrier cadence, and shipment health in one view." },
    { title: "Procurement", description: "Supplier signals, contract timing, and sourcing readiness." },
    { title: "Operations", description: "Daily operations flow, exception alerts, and process coherence." },
    { title: "Market Intel", description: "Market narratives, briefing notes, and commercial context." },
  ];

  const samplePosts: Post[] = [
    {
      id: 1001,
      title: "Myanmar port congestion eases",
      slug: "myanmar-port-congestion",
      type: "news",
      category: "Logistics",
      excerpt: "Port dwell times are improving after operational changes at Yangon port.",
      content_html: "",
      image_url: null,
      source_url: null,
      is_published: true,
      status: "published",
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 1002,
      title: "Procurement windows: Q3 planning tips",
      slug: "procurement-windows-q3",
      type: "analysis",
      category: "Procurement",
      excerpt: "Practical procurement timing advice for Myanmar importers.",
      content_html: "",
      image_url: null,
      source_url: null,
      is_published: true,
      status: "published",
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 1003,
      title: "Last-mile delivery improvements",
      slug: "last-mile-delivery-improvements",
      type: "education",
      category: "Operations Excellence",
      excerpt: "Small operational changes that improve delivery times and reduce costs.",
      content_html: "",
      image_url: null,
      source_url: null,
      is_published: true,
      status: "published",
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const postsToShow = latestPosts.length > 0 ? latestPosts : samplePosts;

  const knowledgeHub = [
    { title: "Procurement Playbooks", desc: "Step-by-step guidance for supplier and sourcing decisions." },
    { title: "Logistics Control Notes", desc: "Actionable checklists for transport, warehousing, and delivery." },
    { title: "Operations Briefs", desc: "Quick summaries for execution, approval, and supply flow." },
  ];

  const stats = [
    { value: "4", label: "CORE SCM CATEGORIES" },
    { value: "3", label: "Featured Insight Topics" },
    { value: "1", label: "APPROVAL-FIRST WORKFLOW" },
    { value: "24/7", label: "24/7 Signal Monitoring" },
  ];

  return (
    <>
      <main className="relative z-20 bg-slate-950">
      <MouseGlow />
      <ScrollBackground opacity={0.15} />

      {/* Hero Section with DotGlobe */}
      <DotGlobeHero
        rotationSpeed={0.004}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 z-[2] pointer-events-none bg-cyan-500/3 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 z-[2] pointer-events-none bg-orange-500/2 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 mx-auto max-w-5xl space-y-8 px-4 py-10 text-center sm:space-y-12 sm:px-6 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-cyan-500/20 px-4 py-2 shadow-2xl backdrop-blur-xl sm:gap-3 sm:px-6 sm:py-3"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 animate-pulse" />
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
              <span className="relative z-10 text-xs font-bold uppercase tracking-wider text-cyan-400 sm:text-sm">
                Supply Chain Intelligence
              </span>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping animation-delay-500" />
            </motion.div>

            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="select-none text-[2.7rem] font-black leading-[0.92] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
              >
                <span className="mb-3 block text-3xl font-light text-slate-400 sm:text-4xl md:text-6xl lg:text-7xl">
                  Intelligence-Powered
                </span>
                <span className="block relative">
                  <span className="bg-gradient-to-br from-cyan-500 via-white to-orange-500 bg-clip-text text-transparent font-black relative z-10">
                    Supply Chain
                  </span>
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-white to-orange-500 bg-clip-text text-transparent font-black blur-2xl opacity-50 scale-105"
                  >
                    Supply Chain
                  </div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, delay: 1.2, ease: "easeOut" }}
                    className="absolute -bottom-6 left-0 h-3 bg-gradient-to-r from-cyan-500 via-orange-500/80 to-transparent rounded-full shadow-lg shadow-cyan-500/50"
                  />
                </span>
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="max-w-3xl mx-auto space-y-4"
            >
              <p className="text-base font-medium leading-relaxed text-slate-300 sm:text-xl md:text-2xl">
                Actionable logistics intelligence, market signal analysis, and{" "}
                <span className="text-white font-semibold bg-gradient-to-r from-cyan-500/20 to-orange-500/20 px-2 py-1 rounded-md">
                  execution-ready guidance
                </span>
              </p>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-lg">
                Deep-dive supply chain intelligence, procurement signal clarity, and operational strategy for Myanmar business teams.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row sm:gap-6"
          >
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow:
                  "0 20px 40px rgba(0,0,0,0.2), 0 0 25px rgba(6, 182, 212, 0.3)",
                y: -2,
              }}
              whileTap={{ scale: 0.98 }}
              className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-cyan-400/20 bg-gradient-to-r from-cyan-500 via-cyan-500 to-cyan-600 px-6 py-3 text-base font-semibold text-white shadow-xl transition-all duration-500 hover:shadow-cyan-500/30 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.8 }}
              />
              <span className="relative z-10 tracking-wide">Explore All Insights</span>
              <svg className="relative z-10 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.button>


          </motion.div>
        </div>
      </DotGlobeHero>

      {/* Original Hero Section - Removed - Replaced with DotGlobeHero */}

      {/* Live Metrics Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-cyan-600 to-slate-900 bg-clip-text text-transparent">
              Live Metrics
            </h2>
            <p className="mt-4 text-slate-300 text-lg">Real-time supply chain performance indicators</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -8 }}
              className="lenis-card flex h-full flex-col items-center justify-center p-6 text-center sm:p-8"
            >
              <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">Flow Index</p>
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-orange-600 bg-clip-text text-transparent sm:text-5xl md:text-6xl"><CountUp end="97.4" /></div>
              <p className="text-sm text-slate-300 mt-3">Supply chain signal pulse</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -8 }}
              className="lenis-card flex h-full flex-col items-center justify-center p-6 text-center sm:p-8"
            >
              <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">Active Users</p>
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-orange-600 bg-clip-text text-transparent sm:text-5xl md:text-6xl"><CountUp end="2,347" /></div>
              <p className="text-sm text-slate-300 mt-3">Connected operators</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -8 }}
              className="lenis-card flex h-full flex-col items-center justify-center p-6 text-center sm:p-8"
            >
              <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">Uptime</p>
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-orange-600 bg-clip-text text-transparent sm:text-5xl md:text-6xl"><CountUp end="99.97%" /></div>
              <p className="text-sm text-slate-300 mt-3">Enterprise standard</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -8 }}
              className="lenis-card flex h-full flex-col items-center justify-center p-6 text-center sm:p-8"
            >
              <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">Growth Rate</p>
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-orange-600 bg-clip-text text-transparent sm:text-5xl md:text-6xl"><CountUp end="8,450+" /></div>
              <p className="text-sm text-slate-300 mt-3">Active operations</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Premium Intelligence Layer */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="flex">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="logixa-card flex h-full w-full flex-col justify-between p-6 md:min-h-[420px] md:p-8"
              >
                <div>
                  <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold">PREMIUM INTELLIGENCE LAYER</p>
                  <h2 className="mt-3 max-w-xl text-2xl font-bold leading-tight md:text-4xl">
                    Live supply chain control surface for intelligent operations.
                  </h2>
                  <p className="mt-5 max-w-2xl text-slate-300 leading-relaxed">
                    An active, premium dashboard that fuses surface intelligence, signal maps, and tactical sourcing insights.
                  </p>
                </div>
                <div className="mt-8">
                  <p className="font-semibold text-sm text-white">Operational Highlights</p>
                  <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] mt-2"></span>
                      <span className="rounded-lg border border-cyan-500/15 bg-slate-950/30 p-3 text-sm text-slate-200 flex-1">Real-time logistics signals</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] mt-2"></span>
                      <span className="rounded-lg border border-cyan-500/15 bg-slate-950/30 p-3 text-sm text-slate-200 flex-1">High-fidelity sourcing data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] mt-2"></span>
                      <span className="rounded-lg border border-cyan-500/15 bg-slate-950/30 p-3 text-sm text-slate-200 flex-1">Geo-enabled maps and alerts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] mt-2"></span>
                      <span className="rounded-lg border border-cyan-500/15 bg-slate-950/30 p-3 text-sm text-slate-200 flex-1">Premium analytics streams</span>
                    </li>
                  </ul>
                </div>
              </motion.div>

            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="logixa-card flex h-full w-full flex-col justify-between p-6 md:min-h-[420px] md:p-8"
            >
              <div className="mb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Logixa Flow</h3>
                    <p className="text-sm text-slate-300">Myanmar Intelligence</p>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-extrabold">42</div>
                      <div className="text-sm text-slate-400">Active Logistics</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-extrabold">98%</div>
                      <div className="text-sm text-slate-400">Data Signal</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 items-center">
                <MyanmarFlowMap />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-4">Premium Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-cyan-600 to-orange-600 bg-clip-text text-transparent">
              Premium SCM Experience, Practical Business Insights
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {capabilities.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="bg-slate-900/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 h-full min-h-[168px] hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-500/15 to-orange-500/10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-lg font-bold relative z-10 text-white group-hover:text-cyan-400 transition-colors">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-300 relative z-10 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles - 3D Coverflow */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-orange-500 text-sm uppercase tracking-widest font-bold mb-4">Latest Intelligence</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-orange-600 to-cyan-600 bg-clip-text text-transparent">
              Latest SCM Insights & Trends
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="hidden md:block"
          >
            <CoverflowSlider posts={postsToShow} />
          </motion.div>
          <div className="grid grid-cols-1 md:hidden gap-6">
            {postsToShow.length > 0 ? (
              postsToShow.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <Card className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground italic">No insights yet. Run agent to generate.</p>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="logixa-card overflow-hidden p-0"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.6fr] gap-6">
              <div className="flex min-h-[300px] flex-col justify-center rounded-lg border border-cyan-500/10 bg-slate-950/35 p-5 backdrop-blur-sm sm:min-h-[360px] sm:p-8 md:p-10">
                <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold">GLOBAL NETWORK</p>
                <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">Global Edge Network</h2>
                <p className="mt-4 text-slate-300 leading-relaxed">
                  Route context, port connectivity, and logistics signal flow are grouped with the world map so the section reads as one network layer.
                </p>
                <ul className="mt-6 grid gap-5 text-sm text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] mt-2"></span>
                    <span className="rounded-lg border border-cyan-500/15 bg-slate-950/35 p-3 flex-1">Major shipping corridors in a global network view</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] mt-2"></span>
                    <span className="rounded-lg border border-cyan-500/15 bg-slate-950/35 p-3 flex-1">Port hub connectivity and logistics signal flow</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] mt-2"></span>
                    <span className="rounded-lg border border-cyan-500/15 bg-slate-950/35 p-3 flex-1">Rapid route visibility for strategic decisions</span>
                  </li>
                </ul>
              </div>
              <div className="min-h-[280px] rounded-lg border border-cyan-500/10 bg-slate-950/35 p-3 backdrop-blur-sm sm:min-h-[360px] sm:p-6">
                <WorldMap
                  dots={[
                    { start: { lat: 37.7749, lng: -122.4194, label: "San Francisco" }, end: { lat: 51.5074, lng: -0.1278, label: "London" } },
                    { start: { lat: 51.5074, lng: -0.1278, label: "London" }, end: { lat: 28.6139, lng: 77.209, label: "New Delhi" } },
                    { start: { lat: 35.6895, lng: 139.6917, label: "Tokyo" }, end: { lat: -33.8688, lng: 151.2093, label: "Sydney" } },
                  ]}
                  lineColor="#0ea5e9"
                  showLabels
                  loop
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Knowledge Hub */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-4">Knowledge Hub</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Practical SCM Playbooks
            </h2>
            <p className="mt-4 text-slate-300 text-lg">Without leaving the flow, access expert guidance</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {knowledgeHub.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="logixa-card p-8 h-full"
              >
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="flex justify-center mt-12"
          >
            <Link href="/blog" className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-orange-600 rounded-full text-white font-semibold hover:shadow-lg hover:shadow-cyan-600/30 transition transform hover:scale-105">
              Explore All Insights
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="logixa-card p-6 text-center sm:p-8"
              >
                <motion.div
                  whileInView={{ scale: 1 }}
                  initial={{ scale: 0.8 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 + 0.2 }}
                  className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-orange-600 bg-clip-text text-transparent sm:text-5xl md:text-6xl"
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-slate-400 mt-3 font-medium uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Operating Model + Newsletter */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold">OPERATING MODEL</p>
              <h2 className="text-3xl font-bold mt-2">Insight-driven editorial flow</h2>
              <p className="mt-4 text-slate-300">
                Stream the decision-making model, approval workflows, and editorial signal into a single operating plane that supports execution and intelligence together.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <NewsletterForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Agent Chat Section */}
      {process.env.NEXT_PUBLIC_USER_AI_ENABLED === "true" ? (
<section className="py-24 bg-gradient-to-b from-slate-900/20 to-slate-950/20">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-4">AI-Powered Insights</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-cyan-600 to-orange-600 bg-clip-text text-transparent">
              Ask Our AI Agent
            </h2>
            <p className="mt-4 text-slate-300 text-lg">Get instant answers about Myanmar business, supply chain, and more</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="logixa-card p-8 md:p-12"
          >
            <div className="space-y-6">
              <p className="text-slate-300 text-center">
                Sample questions you can ask:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {process.env.NEXT_PUBLIC_USER_AI_ENABLED === "true" ? <button
                  onClick={() => window.location.href = "/agent"}
                  className="text-left p-4 rounded-lg bg-slate-900/40 hover:bg-slate-800/50 transition border border-white/10 hover:border-cyan-500/50 backdrop-blur"
                >
                  <p className="font-semibold text-white">{t("aiQuestion1")}</p>
                  <p className="text-sm text-slate-400">{t("aiQuestion1Desc")}</p>
                </button>
                <button
                  onClick={() => window.location.href = "/agent"}
                  className="text-left p-4 rounded-lg bg-slate-900/40 hover:bg-slate-800/50 transition border border-white/10 hover:border-cyan-500/50 backdrop-blur"
                >
                  <p className="font-semibold text-white">{t("aiQuestion2")}</p>
                  <p className="text-sm text-slate-400">{t("aiQuestion2Desc")}</p>
                </button>
                <button
                  onClick={() => window.location.href = "/agent"}
                  className="text-left p-4 rounded-lg bg-slate-900/40 hover:bg-slate-800/50 transition border border-white/10 hover:border-cyan-500/50 backdrop-blur"
                >
                  <p className="font-semibold text-white">{t("aiQuestion3")}</p>
                  <p className="text-sm text-slate-400">{t("aiQuestion3Desc")}</p>
                </button>
                <button
                  onClick={() => window.location.href = "/agent"}
                  className="text-left p-4 rounded-lg bg-slate-900/40 hover:bg-slate-800/50 transition border border-white/10 hover:border-cyan-500/50 backdrop-blur"
                >
                  <p className="font-semibold text-white">{t("aiQuestion4")}</p>
                  <p className="text-sm text-slate-400">{t("aiQuestion4Desc")}</p>
                </button> : null}
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex justify-center mt-8"
            >
              <Link
                href="/agent"
                className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-cyan-600 to-orange-600 rounded-full text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105 transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                  <path d="M6 7a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V7z" />
                </svg>
                Chat with AI Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
) : null}

      </main>
    </>
  );
}
