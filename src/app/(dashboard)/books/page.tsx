"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createBookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["FLASH", "CUSTOM"]),
  description: z.string().optional(),
  depositAmountCents: z.number().int().positive("Deposit amount is required"),
  activeFrom: z.string().optional(),
  activeUntil: z.string().optional(),
});

type CreateBookValues = z.infer<typeof createBookSchema>;

type Book = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  activeFrom?: string | null;
  activeUntil?: string | null;
  description?: string | null;
  depositAmountCents: number;
  _count?: { bookings: number };
};

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateBookValues>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      name: "",
      type: "CUSTOM",
      description: "",
      depositAmountCents: 10000,
      activeFrom: "",
      activeUntil: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    async function fetchBooks() {
      try {
        const res = await fetch("/api/books");
        if (res.ok) {
          const data = await res.json();
          setBooks(Array.isArray(data) ? data : data.books || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, []);

  async function onSubmit(values: CreateBookValues) {
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create book");
        return;
      }

      const newBook = await res.json();
      setBooks((prev) => [...prev, newBook]);
      toast.success("Book created successfully");
      setCreateOpen(false);
      form.reset();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function toggleActive(bookId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setBooks((prev) =>
          prev.map((b) =>
            b.id === bookId ? { ...b, isActive: !isActive } : b
          )
        );
        toast.success(isActive ? "Book deactivated" : "Book activated");
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Books</h1>
          <p className="text-sm text-muted-foreground">
            Manage your booking books
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create Book
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <BookOpen className="size-12 text-muted-foreground" />
            <div>
              <p className="font-medium">No books yet</p>
              <p className="text-sm text-muted-foreground">
                Create a book to start accepting bookings
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Create Your First Book
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{book.name}</p>
                    <div className="flex gap-1">
                      <Badge variant={book.type === "FLASH" ? "default" : "secondary"}>
                        {book.type}
                      </Badge>
                      <Badge variant={book.isActive ? "outline" : "destructive"}>
                        {book.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {book.activeFrom && (
                      <span>
                        From {format(new Date(book.activeFrom), "MMM d, yyyy")}
                      </span>
                    )}
                    {book.activeFrom && book.activeUntil && " — "}
                    {book.activeUntil && (
                      <span>
                        Until {format(new Date(book.activeUntil), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create book dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Book</DialogTitle>
            <DialogDescription>
              Set up a new booking book for clients
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Q1 2026 Flash" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FLASH">Flash</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="depositAmountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={field.value / 100}
                        onChange={(e) =>
                          field.onChange(Math.round(Number(e.target.value) * 100))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="activeFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activeUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closes (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create Book
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
