"use client";

import React from "react";
// @ts-expect-error - bento-grid component not yet implemented
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import {
  CheckCircle,
  TrendingUp,
  Video,
  Globe,
} from "lucide-react";

const itemsSample: BentoItem[] = [
  {
    title: "Analytics Dashboard",
    meta: "v2.4.1",
    description:
      "Real-time metrics with AI-powered insights and predictive analytics",
    icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
    status: "Live",
    tags: ["Statistics", "Reports", "AI"],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: "Task Manager",
    meta: "84 completed",
    description: "Automated workflow management with priority scheduling",
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    status: "Updated",
    tags: ["Productivity", "Automation"],
  },
  {
    title: "Media Library",
    meta: "12GB used",
    description: "Cloud storage with intelligent content processing",
    icon: <Video className="w-4 h-4 text-purple-500" />,
    tags: ["Storage", "CDN"],
    colSpan: 2,
  },
  {
    title: "Global Network",
    meta: "6 regions",
    description: "Multi-region deployment with edge computing",
    icon: <Globe className="w-4 h-4 text-sky-500" />,
    status: "Beta",
    tags: ["Infrastructure", "Edge"],
  },
];

export function BentoGridDemo() {
  return (
    <div className="py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground dark:text-white">
          Platform Features
        </h2>
        <p className="text-center text-muted-foreground dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Comprehensive tools to streamline your workflow
        </p>
        <BentoGrid items={itemsSample} />
      </div>
    </div>
  );
}
