import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">{t("appName")}</h1>
      <p className="text-xl text-muted-foreground mb-8">{t("appTagline")}</p>
      <div className="flex gap-4">
        <Link
          href="/en/login"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
        >
          English
        </Link>
        <Link
          href="/fr/login"
          className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg"
        >
          Français
        </Link>
      </div>
    </main>
  );
}
