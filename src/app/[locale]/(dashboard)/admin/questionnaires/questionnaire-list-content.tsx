"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Upload,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Shield,
  Calendar,
  Hash,
  RefreshCw,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface QuestionnaireListContentProps {
  locale: string;
}

export function QuestionnaireListContent({
  locale,
}: QuestionnaireListContentProps) {
  const t = useTranslations("admin.questionnaires");
  const router = useRouter();

  // State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hardDelete, setHardDelete] = useState(false);

  // Fetch questionnaires
  const { data: questionnaires, isLoading, refetch } = trpc.admin.questionnaire.list.useQuery({
    includeInactive: true,
  });

  // Delete mutation
  const deleteMutation = trpc.admin.questionnaire.delete.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.hard ? t("deleteHardSuccess") : t("deleteSoftSuccess")
      );
      refetch();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: string, hard: boolean) => {
    setDeleteId(id);
    setHardDelete(hard);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId, hardDelete });
    }
  };

  if (isLoading) {
    return <QuestionnaireListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
          <Button asChild>
            <Link href={`/${locale}/admin/questionnaires/import`}>
              <Upload className="h-4 w-4 mr-2" />
              {t("import")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{questionnaires?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.active")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {questionnaires?.filter((q) => q.isActive).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.ansCount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {questionnaires?.filter((q) => q.type === "ANS_USOAP_CMA").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.smsCount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {questionnaires?.filter((q) => q.type === "SMS_CANSO_SOE").length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Questionnaire Table */}
      <Card>
        <CardContent className="pt-6">
          {questionnaires && questionnaires.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.type")}</TableHead>
                  <TableHead>{t("table.code")}</TableHead>
                  <TableHead>{t("table.title")}</TableHead>
                  <TableHead>{t("table.version")}</TableHead>
                  <TableHead>{t("table.effectiveDate")}</TableHead>
                  <TableHead>{t("table.questions")}</TableHead>
                  <TableHead>{t("table.assessments")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionnaires.map((q) => (
                  <TableRow key={q.id} className={cn(!q.isActive && "opacity-60")}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          q.type === "ANS_USOAP_CMA"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400"
                        )}
                      >
                        {q.type === "ANS_USOAP_CMA" ? (
                          <FileText className="h-3 w-3 mr-1" />
                        ) : (
                          <Shield className="h-3 w-3 mr-1" />
                        )}
                        {q.type === "ANS_USOAP_CMA" ? "ANS" : "SMS"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{q.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{q.titleEn}</p>
                        <p className="text-xs text-muted-foreground">{q.titleFr}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{q.version}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(q.effectiveDate), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        {q._count.questions}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{q._count.assessments}</Badge>
                    </TableCell>
                    <TableCell>
                      {q.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                          {t("active")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t("inactive")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/${locale}/questionnaires/${q.type === "ANS_USOAP_CMA" ? "ans" : "sms"}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t("actions.view")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/${locale}/admin/questionnaires/${q.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(q.id, false)}
                            className="text-amber-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("actions.deactivate")}
                          </DropdownMenuItem>
                          {q._count.assessments === 0 && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(q.id, true)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">{t("empty.title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("empty.description")}
              </p>
              <Button asChild className="mt-4">
                <Link href={`/${locale}/admin/questionnaires/import`}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("empty.action")}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hardDelete ? t("deleteDialog.hardTitle") : t("deleteDialog.softTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hardDelete
                ? t("deleteDialog.hardDescription")
                : t("deleteDialog.softDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={cn(
                hardDelete && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {deleteMutation.isPending ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Skeleton component
function QuestionnaireListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { QuestionnaireListSkeleton };
