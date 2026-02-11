"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Zap, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FlashBook = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  pieceCount: number;
  priceRange: { min: number | null; max: number | null } | null;
};

export default function FlashBooksPage() {
  const [books, setBooks] = useState<FlashBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const res = await fetch("/api/flash-catalog");
        if (res.ok) {
          const data = await res.json();
          setBooks(data.books || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">Flash Books</h1>
        <p className="text-sm text-muted-foreground">
          Browse available flash designs
        </p>
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Zap className="size-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No flash books available right now</p>
            <p className="text-sm text-muted-foreground">
              Check back soon!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Link key={book.id} href={`/flash/${book.id}`}>
              <Card className="h-full transition-colors hover:border-ring">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    {book.name}
                  </CardTitle>
                  {book.description && (
                    <CardDescription className="line-clamp-2">
                      {book.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {book.pieceCount}{" "}
                      {book.pieceCount === 1 ? "piece" : "pieces"}
                    </span>
                    {book.priceRange &&
                      book.priceRange.min != null &&
                      book.priceRange.max != null && (
                        <span>
                          ${(book.priceRange.min / 100).toFixed(0)} - $
                          {(book.priceRange.max / 100).toFixed(0)}
                        </span>
                      )}
                  </div>
                  {(book.startDate || book.endDate) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {book.startDate &&
                        format(new Date(book.startDate), "MMM d")}
                      {book.startDate && book.endDate && " – "}
                      {book.endDate &&
                        format(new Date(book.endDate), "MMM d, yyyy")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
