"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlashPieceStats } from "@/components/flash/flash-piece-stats";
import { FlashPieceGrid } from "@/components/flash/flash-piece-grid";
import { FlashPieceForm } from "@/components/flash/flash-piece-form";

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

type FlashPieceWithSizes = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl: string;
  isRepeatable: boolean;
  isClaimed: boolean;
  sizes: { size: string; priceAmountCents: number; durationMinutes: number }[];
  _count: { bookings: number };
};

type BookDetail = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  depositAmountCents?: number | null;
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
  const router = useRouter();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDates, setSavingDates] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [hours, setHours] = useState<AvailableHours>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [editingDates, setEditingDates] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [flashPieces, setFlashPieces] = useState<FlashPieceWithSizes[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<FlashPieceWithSizes | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);

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
          setDepositAmount(
            data.depositAmountCents ? (data.depositAmountCents / 100).toString() : ""
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

  async function fetchFlashPieces() {
    try {
      const res = await fetch(`/api/books/${params.id}/flash-pieces`);
      if (res.ok) {
        const data = await res.json();
        setFlashPieces(data.flashPieces);
      }
    } catch {
      /* silently fail */
    }
  }

  useEffect(() => {
    if (book?.type === "FLASH") fetchFlashPieces();
  }, [book?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeleteFlashPiece(piece: FlashPieceWithSizes) {
    if (!confirm(`Delete "${piece.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/flash-pieces/${piece.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Flash piece deleted");
        fetchFlashPieces();
      } else if (res.status === 409) {
        toast.error("Cannot delete — this piece has active bookings");
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  function handleCopyCatalogLink() {
    const url = `${window.location.origin}/flash/${params.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Catalog link copied to clipboard");
  }

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

  async function handleSaveDeposit() {
    setSavingDeposit(true);
    try {
      const cents = depositAmount ? Math.round(parseFloat(depositAmount) * 100) : null;
      const res = await fetch(`/api/books/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositAmountCents: cents }),
      });

      if (res.ok) {
        const data = await res.json();
        setBook(data);
        setEditingDeposit(false);
        toast.success("Default deposit updated");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to save deposit");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingDeposit(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Book deleted");
        router.push("/books");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete book");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/books/${params.id}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        setBook((prev) => (prev ? { ...prev, isActive: true } : prev));
        toast.success("Book is now live!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to publish");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/books/${params.id}/publish`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBook((prev) => (prev ? { ...prev, isActive: false } : prev));
        setUnpublishOpen(false);
        toast.success("Book unpublished");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to unpublish");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPublishing(false);
    }
  }

  const hasOperatingHours = Object.values(hours).some((h) => h !== null && h !== undefined);
  const hasStartDate = !!book?.startDate;
  const hasFlashPieces = flashPieces.length > 0 && flashPieces.some((p) => p.sizes.length > 0);
  const hasDeposit = !!book?.depositAmountCents;

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
          {book.isActive ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              LIVE
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
              DRAFT
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            {book.isActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnpublishOpen(true)}
                disabled={publishing}
              >
                {publishing && <Loader2 className="mr-2 size-4 animate-spin" />}
                Unpublish
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing && <Loader2 className="mr-2 size-4 animate-spin" />}
                Go Live
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
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
        {!book.isActive && (
          <Card className="lg:col-span-2 border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="font-medium">Publish Checklist</CardTitle>
              <CardDescription>
                Complete these items before going live
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {hasOperatingHours ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={hasOperatingHours ? "" : "text-muted-foreground"}>
                  Operating hours configured
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {hasStartDate ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={hasStartDate ? "" : "text-muted-foreground"}>
                  Start date set
                </span>
              </div>
              {book.type === "FLASH" && (
                <div className="flex items-center gap-2 text-sm">
                  {hasFlashPieces ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  <span className={hasFlashPieces ? "" : "text-muted-foreground"}>
                    Flash pieces added
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                {hasDeposit ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={hasDeposit ? "" : "text-muted-foreground"}>
                  Deposit amount set
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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
                {book.isActive ? "Live" : "Draft"}
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
        {/* Default Deposit Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-medium">Default Deposit</CardTitle>
              {!editingDeposit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDeposit(true)}
                >
                  <Pencil className="mr-1 size-3" />
                  Edit
                </Button>
              )}
            </div>
            <CardDescription>
              Pre-filled deposit amount when approving bookings from this book
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editingDeposit ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="e.g. 100"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveDeposit} disabled={savingDeposit} size="sm">
                    {savingDeposit && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {savingDeposit ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDepositAmount(
                        book.depositAmountCents
                          ? (book.depositAmountCents / 100).toString()
                          : ""
                      );
                      setEditingDeposit(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <span className="font-medium">
                  {book.depositAmountCents
                    ? `$${(book.depositAmountCents / 100).toFixed(2)}`
                    : "Not set"}
                </span>
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
        <div className="space-y-4">
          <FlashPieceStats pieces={flashPieces} />

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="font-medium">Flash Pieces</CardTitle>
                  <CardDescription>
                    Manage the flash designs in this book
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCatalogLink}
                  >
                    <LinkIcon className="mr-1 size-3" />
                    Copy Link
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingPiece(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1 size-4" />
                    Add Piece
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {flashPieces.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No flash pieces yet. Add your first design!
                </p>
              ) : (
                <FlashPieceGrid
                  pieces={flashPieces}
                  onEdit={(p) => {
                    setEditingPiece(p);
                    setFormOpen(true);
                  }}
                  onDelete={handleDeleteFlashPiece}
                />
              )}
            </CardContent>
          </Card>

          <FlashPieceForm
            open={formOpen}
            onOpenChange={setFormOpen}
            bookId={params.id as string}
            piece={editingPiece}
            onSuccess={fetchFlashPieces}
          />
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{book.name}&rdquo;? This
              will hide it from your books list. Any existing bookings will be
              preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unpublishOpen} onOpenChange={setUnpublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish Book</DialogTitle>
            <DialogDescription>
              This will take &ldquo;{book.name}&rdquo; offline. Clients will no
              longer be able to book from it. Existing bookings are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnpublishOpen(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={publishing}
            >
              {publishing && <Loader2 className="mr-2 size-4 animate-spin" />}
              {publishing ? "Unpublishing..." : "Unpublish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
