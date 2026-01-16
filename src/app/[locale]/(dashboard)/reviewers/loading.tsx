import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewersLoading() {
  return (
    <div className="container py-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-8 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Results Info Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div className="flex items-start gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-5 w-10" />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
            <div className="p-4 pt-3 flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
}
