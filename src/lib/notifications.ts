import { prisma } from "@/lib/db";
import { sendEmail, appointmentReminderEmail, aftercareFollowUpEmail, touchUpOfferEmail } from "@/lib/email";
import { sendSMS, appointmentReminderSMS } from "@/lib/sms";

// Schedule all notifications for a booking
export async function scheduleBookingNotifications(
  bookingId: string,
  appointmentDate: Date
): Promise<void> {
  const apptTime = appointmentDate.getTime();

  const notifications = [
    {
      type: "REMINDER_1WEEK",
      scheduledFor: setTime(new Date(apptTime - 7 * 24 * 60 * 60 * 1000), 9, 0),
      channel: "EMAIL",
    },
    {
      type: "REMINDER_1DAY",
      scheduledFor: setTime(new Date(apptTime - 24 * 60 * 60 * 1000), 9, 0),
      channel: "BOTH",
    },
    {
      type: "REMINDER_2HOURS",
      scheduledFor: new Date(apptTime - 2 * 60 * 60 * 1000),
      channel: "SMS",
    },
    {
      type: "AFTERCARE_6WEEKS",
      scheduledFor: setTime(new Date(apptTime + 6 * 7 * 24 * 60 * 60 * 1000), 10, 0),
      channel: "EMAIL",
    },
    {
      type: "TOUCHUP_6MONTHS",
      scheduledFor: setTime(new Date(apptTime + 6 * 30 * 24 * 60 * 60 * 1000), 10, 0),
      channel: "EMAIL",
    },
  ];

  // Filter out notifications scheduled in the past
  const now = new Date();
  const futureNotifications = notifications.filter((n) => n.scheduledFor > now);

  if (futureNotifications.length > 0) {
    await prisma.scheduledNotification.createMany({
      data: futureNotifications.map((n) => ({
        bookingId,
        type: n.type,
        scheduledFor: n.scheduledFor,
        channel: n.channel,
      })),
    });
  }
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

// Cancel unsent notifications for a booking
export async function cancelBookingNotifications(bookingId: string): Promise<void> {
  await prisma.scheduledNotification.deleteMany({
    where: { bookingId, sentAt: null },
  });
}

// Process due notifications (called by cron job)
export async function processScheduledNotifications(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date();
  let sent = 0;
  let failed = 0;

  const dueNotifications = await prisma.scheduledNotification.findMany({
    where: {
      scheduledFor: { lte: now },
      sentAt: null,
    },
    include: {
      booking: {
        include: {
          client: { select: { name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
  });

  for (const notification of dueNotifications) {
    try {
      const { booking } = notification;
      const client = booking.client;
      const apptDate = booking.appointmentDate
        ? new Date(booking.appointmentDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "TBD";

      const shouldEmail = notification.channel === "EMAIL" || notification.channel === "BOTH";
      const shouldSMS = notification.channel === "SMS" || notification.channel === "BOTH";

      let emailSent = false;
      let smsSent = false;

      // Send based on notification type
      if (notification.type === "REMINDER_1WEEK" || notification.type === "REMINDER_1DAY") {
        if (shouldEmail) {
          const email = appointmentReminderEmail(client.name, apptDate, booking.placement);
          emailSent = await sendEmail(client.email, email.subject, email.html);
        }
        if (shouldSMS && client.phone) {
          const hoursUntil = notification.type === "REMINDER_1DAY" ? 24 : 168;
          const smsBody = appointmentReminderSMS(client.name, hoursUntil, apptDate);
          smsSent = await sendSMS(client.phone, smsBody);
        }
      } else if (notification.type === "REMINDER_2HOURS") {
        if (shouldSMS && client.phone) {
          const smsBody = appointmentReminderSMS(client.name, 2, apptDate);
          smsSent = await sendSMS(client.phone, smsBody);
        }
      } else if (notification.type === "AFTERCARE_6WEEKS") {
        if (shouldEmail) {
          const email = aftercareFollowUpEmail(client.name);
          emailSent = await sendEmail(client.email, email.subject, email.html);
        }
      } else if (notification.type === "TOUCHUP_6MONTHS") {
        if (shouldEmail) {
          const email = touchUpOfferEmail(client.name);
          emailSent = await sendEmail(client.email, email.subject, email.html);
        }
      }

      // Mark as sent regardless of delivery success (best effort)
      await prisma.scheduledNotification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });

      if (emailSent || smsSent || (!shouldEmail && !shouldSMS)) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to process notification ${notification.id}:`, error);
      // Still mark as sent to prevent infinite retry
      await prisma.scheduledNotification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      }).catch(() => {});
      failed++;
    }
  }

  return { processed: dueNotifications.length, sent, failed };
}
