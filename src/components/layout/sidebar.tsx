"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  CalendarDays,
  MessageSquare,
  UserCircle,
  Users,
  Calendar,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

const artistNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

function NavItems({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-light transition-colors",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role: "CLIENT" | "ARTIST" }) {
  const pathname = usePathname();
  const items = role === "ARTIST" ? artistNav : clientNav;

  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-background p-4 lg:flex">
      <div className="mb-6 px-3">
        <Link href="/dashboard" className="text-lg font-light tracking-wide">
          Studio Saturn
        </Link>
      </div>

      <NavItems items={items} pathname={pathname} />

      <div className="mt-auto">
        <Separator className="my-4" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 font-light text-muted-foreground hover:text-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-5" />
          Log out
        </Button>
      </div>
    </aside>
  );
}

export { NavItems, clientNav, artistNav };
export type { NavItem };
