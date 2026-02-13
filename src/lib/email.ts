import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM = "Studio Saturn <onboarding@resend.dev>";

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("Resend not configured, skipping email to:", to);
    return false;
  }

  try {
    console.log(`[Email] Sending to=${to} subject="${subject}" from=${FROM}`);
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[Email] Resend returned error:", JSON.stringify(error));
      return false;
    }
    console.log(`[Email] Sent successfully, id=${data?.id}`);
    return true;
  } catch (error) {
    console.error("[Email] Exception sending email:", error);
    return false;
  }
}

// Shared styles
const bg = "#FAF9F6";
const charcoal = "#2C2C2C";
const taupe = "#B8A898";
const sage = "#7D8471";

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:${bg};font-family:Georgia,serif;color:${charcoal}">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
<div style="text-align:center;margin-bottom:32px">
<h1 style="font-size:24px;font-weight:normal;letter-spacing:1px;margin:0">Studio Saturn</h1>
<div style="width:40px;height:2px;background:${taupe};margin:12px auto"></div>
</div>
<h2 style="font-size:18px;font-weight:normal;margin-bottom:16px">${title}</h2>
${body}
<div style="margin-top:40px;padding-top:20px;border-top:1px solid ${taupe};text-align:center;font-size:12px;color:#999">
<p>Studio Saturn</p>
</div>
</div></body></html>`;
}

function button(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:${charcoal};color:#fff;text-decoration:none;font-size:14px;letter-spacing:0.5px;margin:16px 0">${text}</a>`;
}

export function bookingConfirmationEmail(
  name: string,
  bookingId: string,
  description: string,
  dates: string[]
): { subject: string; html: string } {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return {
    subject: "Booking Request Received - Studio Saturn",
    html: wrap(
      `Hi ${name},`,
      `<p>Your booking request has been received and is being reviewed by Jane.</p>
<p style="color:${sage};font-weight:bold">Request Details:</p>
<p>${description}</p>
<p><strong>Preferred Dates:</strong> ${dates.join(", ")}</p>
<p>You'll receive an update once your request is reviewed.</p>
${button("View Your Booking", `${baseUrl}/bookings/${bookingId}`)}`
    ),
  };
}

export function bookingApprovedEmail(
  name: string,
  bookingLink: string
): { subject: string; html: string } {
  return {
    subject: "Booking Approved — Choose Your Appointment Time",
    html: wrap(
      `Hi ${name},`,
      `<p>Your booking has been approved! The next step is to choose your appointment time.</p>
<p>Click below to view available dates and pick the slot that works best for you.</p>
${button("Choose Your Time", bookingLink)}
<p style="font-size:13px;color:#666">Once you've selected a time, you'll be asked to pay the deposit to confirm.</p>`
    ),
  };
}

export function depositRequestEmail(
  name: string,
  amount: number,
  appointmentDate: string,
  paymentLink: string
): { subject: string; html: string } {
  const formatted = (amount / 100).toFixed(2);
  return {
    subject: "Booking Approved - Deposit Required",
    html: wrap(
      `Hi ${name},`,
      `<p>Your booking has been approved! To confirm your appointment, please pay the deposit.</p>
<p style="color:${sage};font-weight:bold">Appointment Details:</p>
<p><strong>Date:</strong> ${appointmentDate}</p>
<p><strong>Deposit:</strong> $${formatted}</p>
${button("Pay Deposit", paymentLink)}
<p style="font-size:13px;color:#666">This deposit secures your appointment time.</p>`
    ),
  };
}

export function appointmentReminderEmail(
  name: string,
  appointmentDate: string,
  placement: string
): { subject: string; html: string } {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return {
    subject: "Appointment Reminder - Studio Saturn",
    html: wrap(
      `Hi ${name},`,
      `<p>This is a friendly reminder about your upcoming tattoo appointment.</p>
<p><strong>Date:</strong> ${appointmentDate}</p>
<p><strong>Placement:</strong> ${placement}</p>
<p style="color:${sage};font-weight:bold">Before Your Appointment:</p>
<ul>
<li>Get a good night's sleep</li>
<li>Eat a healthy meal beforehand</li>
<li>Stay hydrated</li>
<li>Avoid alcohol and blood thinners for 24 hours</li>
<li>Wear comfortable, accessible clothing</li>
</ul>
${button("View Booking Details", `${baseUrl}/dashboard`)}`
    ),
  };
}

export function aftercareFollowUpEmail(name: string): { subject: string; html: string } {
  return {
    subject: "How's Your Tattoo Healing? - Studio Saturn",
    html: wrap(
      `Hi ${name},`,
      `<p>It's been about 6 weeks since your tattoo session. How's everything healing?</p>
<p>By now, your tattoo should be mostly healed. Here are a few ongoing care tips:</p>
<ul>
<li>Continue to moisturize daily</li>
<li>Apply sunscreen when exposed to UV</li>
<li>Avoid prolonged soaking in water</li>
</ul>
<p>If you have any concerns about the healing process, don't hesitate to reach out.</p>
<p style="color:${taupe}">Jane at Studio Saturn</p>`
    ),
  };
}

export function touchUpOfferEmail(name: string): { subject: string; html: string } {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return {
    subject: "Time for Your Next Piece? - Studio Saturn",
    html: wrap(
      `Hi ${name},`,
      `<p>It's been a while since your last session. I'd love to see how your tattoo has settled in!</p>
<p>If you're thinking about your next piece or need any touch-ups, I'm here to help.</p>
${button("Book Your Next Appointment", `${baseUrl}/bookings/new`)}
<p style="color:${taupe}">Jane at Studio Saturn</p>`
    ),
  };
}

export function paymentRequestEmail(
  name: string,
  amountCents: number,
  note: string | null,
  bookingLink: string
): { subject: string; html: string } {
  const formatted = (amountCents / 100).toFixed(2);
  return {
    subject: "Payment Requested - Studio Saturn",
    html: wrap(
      `Hi ${name},`,
      `<p>Jane has requested a payment of <strong>$${formatted}</strong> for your booking.</p>
${note ? `<p style="color:${sage};font-style:italic">"${note}"</p>` : ""}
<p>You can view the details and pay securely through the link below.</p>
${button("View & Pay", bookingLink)}
<p style="font-size:13px;color:#666">You'll be redirected to a secure payment page to complete the transaction.</p>`
    ),
  };
}

export function passwordResetEmail(
  name: string,
  resetLink: string,
  expirationMinutes: number
): { subject: string; html: string } {
  return {
    subject: "Password Reset - Studio Saturn",
    html: wrap(
      `Hi ${name},`,
      `<p>We received a request to reset your password.</p>
${button("Reset Password", resetLink)}
<p style="font-size:13px;color:#666">This link expires in ${expirationMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>`
    ),
  };
}
