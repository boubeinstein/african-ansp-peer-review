import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";

export default async function UnauthorizedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <ShieldX className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>You don&apos;t have permission to access this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">If you believe this is an error, please contact your administrator.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href={`/${locale}/dashboard`}>Return to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
