"use client";

/**
 * RegisterForm Component
 *
 * Tabbed interface for two different registration flows:
 * 1. Request Access - For users joining existing member organizations
 * 2. Join Programme - For organizations applying to join the programme
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Building2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestAccessForm } from "./request-access-form";
import { JoinProgrammeForm } from "./join-programme-form";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const [activeTab, setActiveTab] = useState<"access" | "join">("access");

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="space-y-4 text-center pb-2">
        <div>
          <CardTitle className="text-2xl font-bold text-slate-900 font-montserrat">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            {t("description")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "access" | "join")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger
              value="access"
              className="flex items-center gap-2 data-[state=active]:bg-icao data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.requestAccess")}</span>
              <span className="sm:hidden">{t("tabs.accessShort")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="join"
              className="flex items-center gap-2 data-[state=active]:bg-canso data-[state=active]:text-white"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.joinProgramme")}</span>
              <span className="sm:hidden">{t("tabs.joinShort")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="access" className="mt-0">
            <RequestAccessForm />
          </TabsContent>

          <TabsContent value="join" className="mt-0">
            <JoinProgrammeForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
