import { redirect } from "next/navigation";
import { routing } from "@/lib/i18n/routing";

export default function RootPage() {
  // Redirect to the default locale
  redirect(`/${routing.defaultLocale}`);
}
