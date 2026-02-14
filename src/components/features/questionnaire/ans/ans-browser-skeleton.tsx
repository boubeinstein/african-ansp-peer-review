import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ANSBrowserSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <div className="hidden lg:block w-72 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <Skeleton className="h-10 w-full" />

              {/* Review Area filter items */}
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-10 rounded" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-8 ml-auto rounded-full" />
                </div>
              ))}

              {/* Additional filters */}
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Grouped Sections */}
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-2">
              {/* Section header */}
              <div className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-muted bg-muted/30">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-7 w-12 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>

              {/* Question cards */}
              <div className="ml-2 pl-4 border-l-2 border-muted space-y-2">
                {[1, 2, 3].map((card) => (
                  <Card key={card}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-10 w-16 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <div className="flex gap-1.5">
                            <Skeleton className="h-4 w-16 rounded-full" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
