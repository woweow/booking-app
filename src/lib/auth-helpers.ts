import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireArtist() {
  const user = await requireAuth();
  if (user.role !== UserRole.ARTIST) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireClient() {
  const user = await requireAuth();
  if (user.role !== UserRole.CLIENT) {
    redirect("/admin");
  }
  return user;
}

export async function isArtist(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === UserRole.ARTIST;
}

export async function isClient(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === UserRole.CLIENT;
}
