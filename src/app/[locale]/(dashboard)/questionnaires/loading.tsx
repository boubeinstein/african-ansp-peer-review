import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

function QuestionnaireCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      {/* Top bar skeleton */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        <div className="space-y-2 pt-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>

        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <Skeleton className="h-3 w-32 mt-1" />
      </CardHeader>

      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg bg-muted/50 p-3">
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
}

export default function QuestionnairesLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Type Selection Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />

        <div className="grid gap-6 md:grid-cols-2">
          <QuestionnaireCardSkeleton />
          <QuestionnaireCardSkeleton />
        </div>
      </div>

      {/* Quick Info Section Skeleton */}
      <div className="rounded-lg border bg-muted/30 p-6">
        <Skeleton className="h-5 w-40 mb-3" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
