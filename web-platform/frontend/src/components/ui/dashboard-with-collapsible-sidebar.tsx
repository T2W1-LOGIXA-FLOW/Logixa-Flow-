"use client"
import React, { useState } from "react";
import {
  Home,
  Lightbulb,
  FileText,
  BookOpen,
  Zap,
  Bot,
  BarChart3,
  ChevronDown,
  ChevronsRight,
  TrendingUp,
  Bell,
  Settings,
  HelpCircle,
  User,
} from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-shiny-text";

// Color maps first (before interfaces)



// Explicit type definitions

// Interface အတွက် Backend Data
interface ActivityItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  time: string;
  color: string;
}

interface StatsCard {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  change: string;
  color: string;
}

export const Example = () => {
  return (
    <div className="flex min-h-screen w-full bg-slate-950">
      <div className="flex w-full bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 text-slate-100">
        <Sidebar />
        <ExampleContent />
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState("Dashboard");

  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-out ${
        open ? "w-64" : "w-16"
      } border-slate-700/50 bg-gradient-to-b from-slate-900/95 to-slate-900/80 p-2 shadow-2xl`}
    >
      <TitleSection open={open} />

      <div className="space-y-1 mb-8">
        <Option
          Icon={Home}
          title="Dashboard"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Lightbulb}
          title="Insights"
          selected={selected}
          setSelected={setSelected}
          open={open}
          notifs={3}
        />
        <Option
          Icon={FileText}
          title="Drafts"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={BookOpen}
          title="Articles"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Bot}
          title="AI Agents"
          selected={selected}
          setSelected={setSelected}
          open={open}
          notifs={2}
        />
        <Option
          Icon={Zap}
          title="Controllers"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={BarChart3}
          title="Analytics"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
      </div>

      {open && (
        <div className="border-t border-slate-700 pt-4 space-y-1">
          <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
            Account
          </div>
          <Option
            Icon={Settings}
            title="Settings"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
          <Option
            Icon={HelpCircle}
            title="Help & Support"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
        </div>
      )}

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

interface OptionProps {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  selected: string;
  setSelected: (value: string) => void;
  open: boolean;
  notifs?: number;
}

const Option: React.FC<OptionProps> = ({ Icon, title, selected, setSelected, open, notifs }) => {
  const isSelected = selected === title;

  return (
    <button
      onClick={() => setSelected(title)}
      className={`relative flex h-11 w-full items-center rounded-lg transition-all duration-300 group ${
        isSelected
          ? "bg-gradient-to-r from-slate-800 to-slate-700 text-cyan-300 shadow-xl border-l-2 border-cyan-400"
          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 hover:shadow-md"
      }`}
    >
      <div className={`grid h-full w-12 place-content-center transition-transform duration-300 ${
        isSelected ? "scale-110" : "group-hover:scale-105"
      }`}>
        <Icon className="h-4 w-4" />
      </div>

      {open && (
        <span
          className={`text-sm font-medium transition-all duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </span>
      )}

      {notifs && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-xs text-white font-bold shadow-lg">
          {notifs}
        </span>
      )}
    </button>
  );
};

interface TitleSectionProps {
  open: boolean;
}

const TitleSection: React.FC<TitleSectionProps> = ({ open }) => {
  return (
    <div className="mb-6 border-b border-slate-700 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div className={`transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}>
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-cyan-300">
                    Logixa Flow
                  </span>
                  <span className="block text-xs text-slate-400">
                    Content Admin
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
      <svg
        width="20"
        height="auto"
        viewBox="0 0 50 39"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="fill-white"
      >
        <path
          d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z"
        />
        <path
          d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z"
        />
      </svg>
    </div>
  );
};

interface ToggleCloseProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const ToggleClose: React.FC<ToggleCloseProps> = ({ open, setOpen }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-slate-700/50 transition-all duration-300 hover:bg-slate-800/40 active:bg-slate-800/60 group"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-all duration-300 text-slate-400 group-hover:text-slate-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-slate-300 transition-all duration-200 group-hover:text-white ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            Hide
          </span>
        )}
      </div>
    </button>
  );
};

const ExampleContent = () => {
  const statsData: StatsCard[] = [
    {
      icon: Lightbulb,
      title: "Total Insights",
      value: "247",
      change: "+12% from last month",
      color: "blue",
    },
    {
      icon: FileText,
      title: "Draft Articles",
      value: "34",
      change: "+5% from last week",
      color: "green",
    },
    {
      icon: BookOpen,
      title: "Published Articles",
      value: "156",
      change: "+8% from yesterday",
      color: "purple",
    },
    {
      icon: Bot,
      title: "AI Agents Active",
      value: "12",
      change: "+2 new this week",
      color: "orange",
    },
  ];

  const activityData: ActivityItem[] = [
    {
      icon: Lightbulb,
      title: "New insight created",
      desc: "AI-powered market analysis",
      time: "2 min ago",
      color: "green",
    },
    {
      icon: BookOpen,
      title: "Article published",
      desc: "'Future of AI in Content' published",
      time: "5 min ago",
      color: "blue",
    },
    {
      icon: FileText,
      title: "Draft saved",
      desc: "'Q3 Market Trends' draft saved",
      time: "10 min ago",
      color: "purple",
    },
    {
      icon: Bot,
      title: "AI Agent completed",
      desc: "Content analysis agent finished",
      time: "1 hour ago",
      color: "orange",
    },
    {
      icon: Zap,
      title: "Controller triggered",
      desc: "Auto-publish workflow executed",
      time: "2 hours ago",
      color: "red",
    },
  ];

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-1">
          <AnimatedText
            text="Content Hub"
            gradientColors="linear-gradient(90deg, #0891b2, #ffffff, #f97316)"
            gradientAnimationDuration={1.5}
            hoverEffect={true}
            textClassName="font-black text-3xl md:text-4xl"
            className="py-0"
          />
          <p className="text-slate-400 font-medium">Manage your insights, articles, and AI agents</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative group p-3 rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/40 text-slate-300 hover:text-cyan-300 transition-all duration-300 hover:bg-slate-800/70 hover:border-slate-600/60 hover:shadow-lg">
            <Bell className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-gradient-to-br from-red-400 to-red-600 rounded-full animate-pulse shadow-lg"></span>
          </button>
          <button className="group p-3 rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/40 text-slate-300 hover:text-cyan-300 transition-all duration-300 hover:bg-slate-800/70 hover:border-slate-600/60 hover:shadow-lg">
            <User className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsData.map((stat, i) => (
          <StatCard key={i} stat={stat} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                Recent Activity
              </h3>
              <button className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold transition-all duration-300 hover:translate-x-1">
                View all →
              </button>
            </div>
            <div className="space-y-4">
              {activityData.map((activity, i) => (
                <ActivityRow key={i} activity={activity} />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">
              Performance Metrics
            </h3>
            <div className="space-y-5">
              <StatProgress label="Content Engagement" value="76%" percentage={76} />
              <StatProgress label="AI Agent Success" value="92%" percentage={92} />
              <StatProgress label="Reader Retention" value="64%" percentage={64} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">
              Top Content
            </h3>
            <div className="space-y-2">
              {["AI Analysis Report", "Market Insights", "Trend Forecast", "Content Guide"].map(
                (item, i) => (
                  <div key={i} className="group flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gradient-to-r hover:from-slate-700/40 hover:to-transparent transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-600/30">
                    <span className="text-sm text-slate-300 group-hover:text-white font-medium transition-colors duration-200">{item}</span>
                    <span className="text-sm font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors duration-200">
                      {Math.floor(Math.random() * 50 + 10)} 👁️
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ stat }: { stat: StatsCard }) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/20",
    green: "bg-green-500/20",
    purple: "bg-purple-500/20",
    orange: "bg-orange-500/20",
  };

  const iconColorClasses: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
  };

  return (
    <div className="group relative p-6 rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-slate-600/60 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 ${colorClasses[stat.color]} rounded-lg transition-all duration-300 group-hover:scale-110`}>
            <stat.icon className={`h-5 w-5 ${iconColorClasses[stat.color]}`} />
          </div>
          <TrendingUp className="h-4 w-4 text-green-400 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
        <h3 className="font-medium text-slate-400 mb-1 text-xs uppercase tracking-wider">{stat.title}</h3>
        <p className="text-3xl font-bold text-white">{stat.value}</p>
        <p className="text-sm text-green-400 mt-2 font-medium">{stat.change}</p>
      </div>
    </div>
  );
};

const ActivityRow = ({ activity }: { activity: ActivityItem }) => {
  const bgColorClasses: Record<string, string> = {
    green: "bg-green-500/20",
    blue: "bg-blue-500/20",
    purple: "bg-purple-500/20",
    orange: "bg-orange-500/20",
    red: "bg-red-500/20",
  };

  const iconColorClasses: Record<string, string> = {
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    red: "text-red-400",
  };

  return (
    <div className="group flex items-center space-x-4 p-4 rounded-lg hover:bg-gradient-to-r hover:from-slate-700/40 hover:to-slate-700/20 transition-all duration-300 cursor-pointer border border-slate-700/30 hover:border-slate-600/60 hover:shadow-md hover:pl-5">
      <div className={`p-3 rounded-lg transition-all duration-300 group-hover:scale-110 ${bgColorClasses[activity.color]}`}>
        <activity.icon className={`h-4 w-4 ${iconColorClasses[activity.color]} transition-transform duration-300 group-hover:rotate-12`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors duration-200">
          {activity.title}
        </p>
        <p className="text-xs text-slate-400 truncate group-hover:text-slate-300 transition-colors duration-200">{activity.desc}</p>
      </div>
      <div className="text-xs text-slate-500 group-hover:text-slate-400 whitespace-nowrap transition-colors duration-200">{activity.time}</div>
    </div>
  );
};

const StatProgress = ({ label, value, percentage }: { label: string; value: string; percentage: number }) => {
  // Determine color based on percentage value
  let colorClass = "bg-green-500";
  if (percentage <= 45) {
    colorClass = "bg-blue-500";
  } else if (percentage <= 66) {
    colorClass = "bg-orange-500";
  } else {
    colorClass = "bg-green-500";
  }

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-sm text-slate-300 group-hover:text-white transition-colors duration-200">{label}</span>
        <span className="text-sm font-bold text-cyan-300 group-hover:text-cyan-200 transition-colors duration-200">{value}</span>
      </div>
      <div className="w-full bg-gradient-to-r from-slate-700/40 to-slate-700/20 rounded-full h-3 overflow-hidden border border-slate-600/30 shadow-inner group-hover:border-slate-600/50 transition-all duration-300">
        <div
          className={`${colorClass} h-3 rounded-full transition-all duration-500 shadow-lg group-hover:shadow-xl`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default Example;
