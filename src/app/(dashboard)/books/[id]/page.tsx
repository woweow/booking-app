"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type DayHours = { start: string; end: string } | null;
type AvailableHours = Record<string, DayHours>;

type BookDetail = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  description?: string | null;
  depositAmountCents: number;
  activeFrom?: string | null;
  activeUntil?: string | null;
  availableHours: AvailableHours;
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<AvailableHours>({});

  useEffect(() => {
    async function fetchBook() {
      try {
        const res = await fetch(`/api/books/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setBook(data);
          setHours(
            typeof data.availableHours === "object" && data.availableHours
              ? data.availableHours
              : {}
          );
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [params.id]);

  function updateDay(day: string, field: "start" | "end", value: string) {
    setHours((prev) => ({
      ...prev,
      [day]: prev[day]
        ? { ...prev[day]!, [field]: value }
        : { start: field === "start" ? value : "09:00", end: field === "end" ? value : "17:00" },
    }));
  }

  function toggleDay(day: string) {
    setHours((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { start: "09:00", end: "17:00" },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/books/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableHours: hours }),
      });

      if (res.ok) {
        toast.success("Hours saved successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">Book not found</p>
        <Button asChild variant="outline">
          <Link href="/books">Back to books</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/books"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to books
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-light tracking-wide">{book.name}</h1>
          <Badge variant={book.type === "FLASH" ? "default" : "secondary"}>
            {book.type}
          </Badge>
          <Badge variant={book.isActive ? "outline" : "destructive"}>
            {book.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {book.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {book.description}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Book Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{book.type}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">
                {book.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit</span>
              <span className="font-medium">
                ${(book.depositAmountCents / 100).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Operating Hours</CardTitle>
            <CardDescription>
              Set the hours this book accepts appointments. Click a day to
              toggle it on/off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day) => {
              const dayHours = hours[day];
              const isOpen = dayHours !== null && dayHours !== undefined;

              return (
                <div key={day} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className="w-24 text-left text-sm capitalize"
                  >
                    <span
                      className={
                        isOpen ? "font-medium" : "text-muted-foreground line-through"
                      }
                    >
                      {day}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={dayHours.start}
                        onChange={(e) => updateDay(day, "start", e.target.value)}
                        className="w-28"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={dayHours.end}
                        onChange={(e) => updateDay(day, "end", e.target.value)}
                        className="w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Closed
                    </span>
                  )}
                </div>
              );
            })}

            <Separator />

            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving ? "Saving..." : "Save Hours"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {book.type === "FLASH" && (
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Flash Pieces</CardTitle>
            <CardDescription>
              Manage the flash designs in this book
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">
              Flash piece management coming soon
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
