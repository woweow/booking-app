"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2, Pencil } from "lucide-react";
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
  startDate?: string | null;
  endDate?: string | null;
  availableHours: AvailableHours;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Not set";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function BookDetailPage() {
  const params = useParams();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDates, setSavingDates] = useState(false);
  const [hours, setHours] = useState<AvailableHours>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingDates, setEditingDates] = useState(false);

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
          setStartDate(toInputDate(data.startDate));
          setEndDate(toInputDate(data.endDate));
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

  async function handleSaveHours() {
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

  async function handleSaveDates() {
    setSavingDates(true);
    try {
      const res = await fetch(`/api/books/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBook(data);
        setEditingDates(false);
        toast.success("Dates updated successfully");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to save dates");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingDates(false);
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

        {/* Date range display */}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          <span>
            {formatDate(book.startDate)} &mdash; {formatDate(book.endDate)}
          </span>
        </div>
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
          </CardContent>
        </Card>

        {/* Book Dates Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-medium">Book Dates</CardTitle>
              {!editingDates && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDates(true)}
                >
                  <Pencil className="mr-1 size-3" />
                  Edit
                </Button>
              )}
            </div>
            <CardDescription>
              The date range this book is open for appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editingDates ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveDates} disabled={savingDates} size="sm">
                    {savingDates && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {savingDates ? "Saving..." : "Save Dates"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate(toInputDate(book.startDate));
                      setEndDate(toInputDate(book.endDate));
                      setEditingDates(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opens</span>
                  <span className="font-medium">{formatDate(book.startDate)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closes</span>
                  <span className="font-medium">{formatDate(book.endDate)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-medium">Operating Hours</CardTitle>
          <CardDescription>
            Set the hours this book accepts appointments. Click a day to
            toggle it on or off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            Click a day name to enable or disable it
          </p>
          {DAYS.map((day) => {
            const dayHours = hours[day];
            const isOpen = dayHours !== null && dayHours !== undefined;

            return (
              <div
                key={day}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className="w-24 text-left text-sm capitalize cursor-pointer flex items-center gap-1.5 group"
                >
                  <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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

          <Button onClick={handleSaveHours} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {saving ? "Saving..." : "Save Hours"}
          </Button>
        </CardContent>
      </Card>

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
