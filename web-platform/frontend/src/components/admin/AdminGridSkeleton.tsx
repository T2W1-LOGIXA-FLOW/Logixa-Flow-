import Skeleton from "@/components/shadcn/Skeleton";

export default function AdminGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
