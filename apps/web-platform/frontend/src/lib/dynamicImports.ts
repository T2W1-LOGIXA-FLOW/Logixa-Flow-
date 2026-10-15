/**
 * Performance Optimization: Dynamic Imports for Code Splitting
 * 
 * In Next.js 15 App Router, code splitting is automatic for:
 * - Each route segment gets its own bundle
 * - Lazy-loaded components via dynamic() helper
 * 
 * This file is now deprecated in favor of Next.js 15's automatic code splitting.
 * Use React.lazy() + Suspense directly in .tsx files for better control.
 */

import dynamic from "next/dynamic";

export default dynamic;
