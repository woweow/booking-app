"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SignaturePad } from "./signature-pad";

const consentSchema = z.object({
  bookingId: z.string().min(1),
  fullLegalName: z.string().min(1, "Full legal name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().min(1, "Address is required").max(200, "Address too long"),
  emergencyContact: z.string().min(1, "Emergency contact name is required"),
  emergencyPhone: z.string().min(1, "Emergency contact phone is required").max(20),
  skinConditions: z.string().max(500).optional().or(z.literal("")),
  allergies: z.string().max(500).optional().or(z.literal("")),
  medications: z.string().max(500).optional().or(z.literal("")),
  bloodDisorders: z.boolean(),
  isPregnant: z.boolean(),
  recentSubstances: z.boolean(),
  risksAcknowledged: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge the risks",
  }),
  aftercareAgreed: z.boolean().refine((v) => v === true, {
    message: "You must agree to follow aftercare instructions",
  }),
  photoReleaseAgreed: z.boolean(),
  signatureDataUrl: z.string().min(1, "Signature is required"),
});

type ConsentValues = z.infer<typeof consentSchema>;

export function ConsentFormComponent({
  bookingId,
  userName,
}: {
  bookingId: string;
  userName?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const form = useForm<ConsentValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      bookingId,
      fullLegalName: userName || "",
      dateOfBirth: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      skinConditions: "",
      allergies: "",
      medications: "",
      bloodDisorders: false,
      isPregnant: false,
      recentSubstances: false,
      risksAcknowledged: false,
      aftercareAgreed: false,
      photoReleaseAgreed: false,
      signatureDataUrl: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: ConsentValues) {
    if (!values.signatureDataUrl) {
      setSignatureError("Signature is required");
      return;
    }

    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          toast.error("Consent form has already been submitted");
          router.push(`/bookings/${bookingId}`);
          return;
        }
        toast.error(data.error || "Failed to submit consent form");
        return;
      }

      toast.success("Consent form submitted successfully!");
      router.push(`/bookings/${bookingId}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  function onError() {
    // Scroll to first error
    const firstError = formRef.current?.querySelector("[aria-invalid=true]");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit, onError)}
        className="space-y-6"
      >
        {/* Section 1: Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Personal Information</CardTitle>
            <CardDescription>
              Please provide your personal details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="fullLegalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Full Legal Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Your full legal name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date of Birth <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" max={today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Your full address"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Emergency Contact Name{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Emergency contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Emergency Contact Phone{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 2: Medical History */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">Medical History</CardTitle>
            <CardDescription>
              Please answer all questions honestly. This information is
              confidential and necessary for your safety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="skinConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skin Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. eczema, psoriasis, keloids..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. latex, metals, inks, adhesives..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medications</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any current medications, especially blood thinners..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="bloodDisorders"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal leading-snug">
                      I have a blood clotting or bleeding disorder
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPregnant"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal leading-snug">
                      I am pregnant or may be pregnant
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recentSubstances"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal leading-snug">
                      I have consumed alcohol or recreational drugs in the past
                      24 hours
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Acknowledgments */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">
              Acknowledgments &amp; Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="risksAcknowledged"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="font-normal leading-snug">
                      I acknowledge the risks associated with getting a tattoo{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Including but not limited to: infection, allergic
                      reactions, scarring, and the permanent nature of tattoos.
                    </p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="aftercareAgreed"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="font-normal leading-snug">
                      I agree to follow all aftercare instructions{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      I understand that improper aftercare can affect the healing
                      and final appearance of my tattoo.
                    </p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="photoReleaseAgreed"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="font-normal leading-snug">
                      I consent to photos of my tattoo being used for portfolio
                      purposes
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      This is optional. Photos will only be used in the
                      artist&apos;s professional portfolio.
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 4: Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium">
              Digital Signature <span className="text-destructive">*</span>
            </CardTitle>
            <CardDescription>
              Please sign below to confirm you have read and agreed to all the
              information above
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignaturePad
              onChange={(dataUrl) => {
                form.setValue("signatureDataUrl", dataUrl);
                if (dataUrl) setSignatureError(null);
              }}
            />
            {(signatureError || form.formState.errors.signatureDataUrl) && (
              <p className="text-xs text-destructive">
                {signatureError ||
                  form.formState.errors.signatureDataUrl?.message}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              By signing above, I confirm that all information provided is true
              and accurate to the best of my knowledge. I understand that this
              is a legally binding document.
            </p>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isSubmitting ? "Submitting..." : "Submit Consent Form"}
        </Button>
      </form>
    </Form>
  );
}
