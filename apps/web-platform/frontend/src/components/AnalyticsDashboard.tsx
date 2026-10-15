"use client";

import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AnimatedNumber } from "./PremiumEffects";

// Sample data
const lineChartData = [
  { month: "Jan", value: 4000, revenue: 2400 },
  { month: "Feb", value: 3000, revenue: 1398 },
  { month: "Mar", value: 2000, revenue: 9800 },
  { month: "Apr", value: 2780, revenue: 3908 },
  { month: "May", value: 1890, revenue: 4800 },
  { month: "Jun", value: 2390, revenue: 3800 },
];

const barChartData = [
  { category: "Supply Chain", value: 85 },
  { category: "Logistics", value: 72 },
  { category: "Procurement", value: 68 },
  { category: "Operations", value: 91 },
];

const pieChartData = [
  { name: "Active", value: 45, color: "#00A3FF" },
  { name: "Pending", value: 30, color: "#FF6B00" },
  { name: "Completed", value: 25, color: "#10b981" },
];

export function AnalyticsLineChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="logixa-card p-6"
    >
      <h3 className="text-lg font-bold text-white mb-4">Performance Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={lineChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,150,200,0.1)" />
          <XAxis stroke="rgba(200,200,200,0.5)" />
          <YAxis stroke="rgba(200,200,200,0.5)" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(20,25,40,0.9)", 
              border: "1px solid rgba(0,163,255,0.3)",
              borderRadius: "8px"
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#00A3FF" strokeWidth={2} dot={{ fill: "#00A3FF", r: 5 }} />
          <Line type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={2} dot={{ fill: "#FF6B00", r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function AnalyticsBarChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="logixa-card p-6"
    >
      <h3 className="text-lg font-bold text-white mb-4">Category Performance</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,150,200,0.1)" />
          <XAxis stroke="rgba(200,200,200,0.5)" dataKey="category" angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="rgba(200,200,200,0.5)" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(20,25,40,0.9)", 
              border: "1px solid rgba(0,163,255,0.3)",
              borderRadius: "8px"
            }}
          />
          <Bar dataKey="value" fill="#00A3FF" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function AnalyticsPieChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="logixa-card p-6"
    >
      <h3 className="text-lg font-bold text-white mb-4">Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(20,25,40,0.9)", 
              border: "1px solid rgba(0,163,255,0.3)",
              borderRadius: "8px"
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function AnalyticsKPICard({
  title,
  value,
  change,
  icon,
  color = "cyan",
}: {
  title: string;
  value: number;
  change: number;
  icon?: string;
  color?: "cyan" | "orange" | "green" | "red";
}) {
  const colors = {
    cyan: "from-cyan-500 to-blue-500",
    orange: "from-orange-500 to-red-500",
    green: "from-green-500 to-teal-500",
    red: "from-red-500 to-pink-500",
  };

  const isPositive = change >= 0;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`logixa-card p-6 bg-gradient-to-br ${colors[color]} bg-opacity-10`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-4xl font-bold text-white mt-2">
            <AnimatedNumber value={value} duration={2} />
          </h3>
          <p className={`text-sm mt-2 flex items-center gap-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
            <span>{isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(change)}% from last month</span>
          </p>
        </div>
        {icon && <span className="text-4xl">{icon}</span>}
      </div>
    </motion.div>
  );
}

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsKPICard title="Total Insights" value={1247} change={12} icon="📊" color="cyan" />
        <AnalyticsKPICard title="Active Users" value={892} change={8} icon="👥" color="orange" />
        <AnalyticsKPICard title="Engagement" value={76} change={-2} icon="⚡" color="green" />
        <AnalyticsKPICard title="Growth Rate" value={34} change={5} icon="📈" color="cyan" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsLineChart />
        <AnalyticsBarChart />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnalyticsPieChart />
      </div>
    </div>
  );
}
