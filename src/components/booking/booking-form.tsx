"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PhotoUpload, type PhotoFile } from "./photo-upload";

type FormData = {
  description: string;
  size: string;
  placement: string;
  isFirstTattoo: boolean;
  medicalNotes: string;
};

type BookingFormProps = {
  initialData?: Partial<FormData>;
  bookingId?: string;
  isEdit?: boolean;
};

const STEPS = ["Tattoo Details", "Photos", "Review"];

const sizeOptions = [
  { value: "SMALL", label: "Small (Under 2\")" },
  { value: "MEDIUM", label: "Medium (2-4\")" },
  { value: "LARGE", label: "Large (4-6\")" },
  { value: "EXTRA_LARGE", label: "Extra Large (Over 6\")" },
];

export function BookingForm({ initialData, bookingId, isEdit }: BookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    description: initialData?.description || "",
    size: initialData?.size || "",
    placement: initialData?.placement || "",
    isFirstTattoo: initialData?.isFirstTattoo || false,
    medicalNotes: initialData?.medicalNotes || "",
  });

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateStep(): boolean {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (formData.description.length < 10)
        newErrors.description = "Description must be at least 10 characters";
      if (!formData.size) newErrors.size = "Please select a size";
      if (!formData.placement.trim())
        newErrors.placement = "Placement is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      let photoUrls: string[] = [];

      if (photos.length > 0) {
        const uploads = photos.map(async (photo) => {
          const fd = new FormData();
          fd.append("file", photo.file);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          return data.url as string;
        });
        photoUrls = await Promise.all(uploads);
      }

      const body = {
        description: formData.description,
        size: formData.size,
        placement: formData.placement,
        isFirstTattoo: formData.isFirstTattoo,
        medicalNotes: formData.medicalNotes || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      };

      const url = isEdit ? `/api/bookings/${bookingId}` : "/api/bookings";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to submit booking");
        return;
      }

      const result = await response.json();
      toast.success(
        isEdit
          ? "Booking updated successfully!"
          : "Booking request submitted successfully!"
      );
      router.push(`/bookings/${result.booking?.id || bookingId}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                i < step
                  ? "bg-[hsl(82_8%_48%)] text-white"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                i === step ? "font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <Separator className="flex-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Tattoo Details */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Tattoo Details</CardTitle>
            <CardDescription>
              Describe the tattoo you&apos;d like
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your tattoo idea in detail..."
                rows={4}
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {errors.description && (
                  <span className="text-destructive">{errors.description}</span>
                )}
                {formData.description.length < 10 && (
                  <span className="ml-auto">
                    {formData.description.length} characters (min 10)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">
                Size <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.size}
                onValueChange={(v) => updateField("size", v)}
              >
                <SelectTrigger id="size">
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.size && (
                <p className="text-xs text-destructive">{errors.size}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="placement">
                Placement <span className="text-destructive">*</span>
              </Label>
              <Input
                id="placement"
                placeholder="e.g. Upper arm, Wrist, Back"
                value={formData.placement}
                onChange={(e) => updateField("placement", e.target.value)}
              />
              {errors.placement && (
                <p className="text-xs text-destructive">{errors.placement}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="firstTattoo"
                checked={formData.isFirstTattoo}
                onCheckedChange={(checked) =>
                  updateField("isFirstTattoo", checked === true)
                }
              />
              <Label htmlFor="firstTattoo" className="font-normal">
                This will be my first tattoo
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Photos */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Inspiration Photos</CardTitle>
            <CardDescription>
              Upload reference images for Jane to review (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEdit ? (
              <p className="text-sm text-muted-foreground">
                Photo editing is not available when updating a booking. Your
                existing photos will be preserved.
              </p>
            ) : (
              <PhotoUpload files={photos} onChange={setPhotos} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Review Your Booking</CardTitle>
            <CardDescription>
              Please review the details before submitting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Size</span>
                <span className="text-sm font-medium">
                  {sizeOptions.find((o) => o.value === formData.size)?.label}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Placement</span>
                <span className="text-sm font-medium">
                  {formData.placement}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  First tattoo
                </span>
                <span className="text-sm font-medium">
                  {formData.isFirstTattoo ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1 text-sm">{formData.description}</p>
            </div>

            {photos.length > 0 && (
              <div>
                <Label className="text-muted-foreground">
                  Photos ({photos.length})
                </Label>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {photos.map((photo) => (
                    <img
                      key={photo.preview}
                      src={photo.preview}
                      alt={photo.file.name}
                      className="aspect-square rounded-lg object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="medicalNotes">
                Medical Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional, kept confidential)
                </span>
              </Label>
              <Textarea
                id="medicalNotes"
                placeholder="Any allergies, medical conditions, or medications we should know about..."
                rows={3}
                value={formData.medicalNotes}
                onChange={(e) => updateField("medicalNotes", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
        >
          Previous
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSubmitting
              ? "Submitting..."
              : isEdit
                ? "Update Booking"
                : "Submit Booking Request"}
          </Button>
        )}
      </div>
    </div>
  );
}
