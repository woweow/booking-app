import twilio from "twilio";

let twilioClient: twilio.Twilio | null = null;

function getTwilio(): twilio.Twilio | null {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER
  ) {
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  return twilioClient;
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  const client = getTwilio();
  if (!client) {
    console.warn("Twilio not configured, skipping SMS to:", to);
    return false;
  }

  if (!to || !/^\+\d{10,15}$/.test(to)) {
    console.warn("Invalid phone number format:", to);
    return false;
  }

  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
    });
    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
}

export function appointmentReminderSMS(
  name: string,
  hoursUntil: number,
  appointmentDate: string
): string {
  if (hoursUntil <= 3) {
    return `Hi ${name}! Your tattoo appointment at Studio Saturn is in ${hoursUntil} hours. See you soon!`;
  }
  if (hoursUntil <= 25) {
    return `Hi ${name}! Your tattoo appointment at Studio Saturn is tomorrow (${appointmentDate}). Remember to stay hydrated and avoid alcohol. See you then!`;
  }
  return `Hi ${name}! Your tattoo appointment at Studio Saturn is on ${appointmentDate}. Looking forward to seeing you!`;
}

export function depositReceivedSMS(name: string, appointmentDate: string): string {
  return `Hi ${name}! Your deposit for Studio Saturn has been received. Your appointment is confirmed for ${appointmentDate}. See you then!`;
}

export function bookingApprovedSMS(name: string, appointmentDate: string): string {
  return `Hi ${name}! Your booking at Studio Saturn has been approved for ${appointmentDate}. Please check your email to pay the deposit and confirm.`;
}
