import { auth } from "@/lib/auth";
import { Permission, hasPermission, hasAnyPermission } from "./permissions";
import { redirect } from "next/navigation";

export async function checkPermission(permission: Permission) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!hasPermission(session.user.role, permission)) {
    redirect("/unauthorized");
  }

  return session;
}

export async function checkAnyPermission(permissions: Permission[]) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!hasAnyPermission(session.user.role, permissions)) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}
