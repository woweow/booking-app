"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type SizeRow = {
  size: string;
  price: string;
  duration: string;
};

const sizeOptions = [
  { value: "SMALL", label: "Small (<2\")" },
  { value: "MEDIUM", label: "Medium (2-4\")" },
  { value: "LARGE", label: "Large (4-6\")" },
  { value: "EXTRA_LARGE", label: "Extra Large (6\"+)" },
];

export function FlashPieceForm({
  open,
  onOpenChange,
  bookId,
  piece,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  piece?: FlashPieceWithSizes | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isRepeatable, setIsRepeatable] = useState(true);
  const [sizes, setSizes] = useState<SizeRow[]>([
    { size: "", price: "", duration: "" },
  ]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(piece?.name || "");
      setDescription(piece?.description || "");
      setImageUrl(piece?.imageUrl || "");
      setImagePreview(piece?.imageUrl || "");
      setIsRepeatable(piece?.isRepeatable ?? true);
      setSizes(
        piece?.sizes.map((s) => ({
          size: s.size,
          price: (s.priceAmountCents / 100).toString(),
          duration: s.durationMinutes.toString(),
        })) || [{ size: "", price: "", duration: "" }]
      );
    }
  }, [open, piece]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      } else {
        toast.error("Failed to upload image");
        setImagePreview(piece?.imageUrl || "");
      }
    } catch {
      toast.error("Upload failed");
      setImagePreview(piece?.imageUrl || "");
    } finally {
      setUploading(false);
    }
  }

  function updateSize(index: number, field: keyof SizeRow, value: string) {
    setSizes((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeSize(index: number) {
    setSizes((prev) => prev.filter((_, i) => i !== index));
  }

  function addSize() {
    setSizes((prev) => [...prev, { size: "", price: "", duration: "" }]);
  }

  const usedSizes = sizes.map((s) => s.size).filter(Boolean);
  const canAddSize = sizes.length < 4 && usedSizes.length < sizeOptions.length;

  async function handleSave() {
    if (
      !name.trim() ||
      !imageUrl ||
      sizes.some((s) => !s.size || !s.price || !s.duration)
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl,
        isRepeatable,
        sizes: sizes.map((s) => ({
          size: s.size,
          priceAmountCents: Math.round(parseFloat(s.price) * 100),
          durationMinutes: parseInt(s.duration, 10),
        })),
      };

      const url = piece
        ? `/api/flash-pieces/${piece.id}`
        : `/api/books/${bookId}/flash-pieces`;
      const method = piece ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(piece ? "Flash piece updated" : "Flash piece created");
        onSuccess();
        onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {piece ? "Edit Flash Piece" : "Add Flash Piece"}
          </DialogTitle>
          <DialogDescription>
            {piece
              ? "Update the details for this flash design."
              : "Add a new flash design to this book."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Image upload */}
          <div className="space-y-2">
            <Label>Design Image</Label>
            <label className="block cursor-pointer">
              {imagePreview ? (
                <div className="relative aspect-square max-w-[200px] rounded-lg overflow-hidden border">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="size-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground hover:border-foreground/50 transition-colors">
                  <ImagePlus className="size-8" />
                  <span className="text-sm">Click to upload image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="flash-name">Name</Label>
            <Input
              id="flash-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Crescent Moon"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="flash-desc">Description (optional)</Label>
            <Textarea
              id="flash-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Style notes, placement suggestions..."
              maxLength={1000}
              rows={3}
            />
          </div>

          {/* Repeatable */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="flash-repeatable"
              checked={isRepeatable}
              onCheckedChange={(checked) =>
                setIsRepeatable(checked === true)
              }
            />
            <div className="space-y-0.5">
              <Label htmlFor="flash-repeatable" className="cursor-pointer">
                Repeatable
              </Label>
              <p className="text-xs text-muted-foreground">
                Repeatable designs can be booked by multiple clients.
                Non-repeatable designs are one-of-a-kind.
              </p>
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-3">
            <Label>Sizes &amp; Pricing</Label>
            {sizes.map((row, i) => {
              const availableSizes = sizeOptions.filter(
                (opt) => opt.value === row.size || !usedSizes.includes(opt.value)
              );

              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-end"
                >
                  <div>
                    {i === 0 && (
                      <span className="text-xs text-muted-foreground mb-1 block">
                        Size
                      </span>
                    )}
                    <Select
                      value={row.size}
                      onValueChange={(val) => updateSize(i, "size", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSizes.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {i === 0 && (
                      <span className="text-xs text-muted-foreground mb-1 block">
                        Price ($)
                      </span>
                    )}
                    <Input
                      type="number"
                      min={1}
                      step={0.01}
                      placeholder="$"
                      value={row.price}
                      onChange={(e) => updateSize(i, "price", e.target.value)}
                    />
                  </div>
                  <div>
                    {i === 0 && (
                      <span className="text-xs text-muted-foreground mb-1 block">
                        Minutes
                      </span>
                    )}
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      placeholder="min"
                      value={row.duration}
                      onChange={(e) => updateSize(i, "duration", e.target.value)}
                    />
                  </div>
                  <div>
                    {i === 0 && <span className="mb-1 block text-xs">&nbsp;</span>}
                    {sizes.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        onClick={() => removeSize(i)}
                      >
                        <X className="size-4" />
                      </Button>
                    ) : (
                      <div className="size-9" />
                    )}
                  </div>
                </div>
              );
            })}
            {canAddSize && (
              <Button
                variant="outline"
                size="sm"
                onClick={addSize}
                className="w-full"
              >
                <Plus className="size-3 mr-1" />
                Add Size
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {piece ? "Save Changes" : "Create Piece"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
