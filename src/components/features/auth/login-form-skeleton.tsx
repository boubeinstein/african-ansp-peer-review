/**
 * Login Form Skeleton
 *
 * Loading skeleton for the login form while it's being loaded.
 */

export function LoginFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2 text-center">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
        <div className="h-4 w-56 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}
