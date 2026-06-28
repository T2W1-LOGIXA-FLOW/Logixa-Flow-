import { Search } from "lucide-react";

interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AdminSearchBar({ value, onChange, placeholder = "Search..." }: AdminSearchBarProps) {
  return (
    <div className="mb-6 relative">
      <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 bg-slate-800/40 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
      />
    </div>
  );
}
