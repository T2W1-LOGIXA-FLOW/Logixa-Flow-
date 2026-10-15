import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";

interface AdminBreadcrumbProps {
  currentPage: string;
}

export default function AdminBreadcrumb({ currentPage }: AdminBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 mb-8 text-sm">
      <Link href="/admin" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition">
        <Home className="h-4 w-4" />
        Admin
      </Link>
      <ChevronRight className="h-4 w-4 text-slate-500" />
      <span className="text-slate-300">{currentPage}</span>
    </nav>
  );
}
