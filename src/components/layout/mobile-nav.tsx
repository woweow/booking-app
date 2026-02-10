"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { NavItems, clientNav, artistNav } from "./sidebar";

export function MobileNav({ role }: { role: "CLIENT" | "ARTIST" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = role === "ARTIST" ? artistNav : clientNav;

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9">
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-4">
          <SheetHeader className="mb-6 px-3">
            <SheetTitle className="text-left text-lg font-light tracking-wide">
              Studio Saturn
            </SheetTitle>
          </SheetHeader>

          <NavItems
            items={items}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
          />

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
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="text-lg font-light tracking-wide">
        Studio Saturn
      </Link>
    </div>
  );
}
