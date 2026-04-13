import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton() {
  return (
    <div className="bg-white rounded-md p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="bg-white rounded-md flex flex-col w-[30%] flex-shrink-0 p-6">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="space-y-4 flex-1">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="flex gap-3 mt-6">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="bg-white rounded-md flex-1 min-w-0 p-6">
      <div className="flex flex-col h-full">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="flex-1 w-full" />
      </div>
    </div>
  );
}
