import { prisma } from "@/lib/db";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { sendEmail, appointmentReminderEmail, aftercareFollowUpEmail, touchUpOfferEmail } from "@/lib/email";
import { sendSMS, appointmentReminderSMS } from "@/lib/sms";

// Wrap a send operation with DB tracking
export async function trackNotification(opts: {
  bookingId: string;
  type: string;
  channel: "EMAIL" | "SMS";
  sendFn: () => Promise<boolean>;
  scheduledFor?: Date;
}): Promise<boolean> {
  const record = await prisma.bookingNotification.create({
    data: {
      bookingId: opts.bookingId,
      type: opts.type,
      channel: opts.channel as NotificationChannel,
      status: NotificationStatus.PENDING,
      scheduledFor: opts.scheduledFor ?? new Date(),
    },
  });

  try {
    const success = await opts.sendFn();
    if (success) {
      await prisma.bookingNotification.update({
        where: { id: record.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } else {
      await prisma.bookingNotification.update({
        where: { id: record.id },
        data: { status: NotificationStatus.FAILED, failedAt: new Date() },
      });
    }
    return success;
  } catch (error) {
    await prisma.bookingNotification.update({
      where: { id: record.id },
      data: { status: NotificationStatus.FAILED, failedAt: new Date() },
    }).catch(() => {});
    throw error;
  }
}

// Schedule all notifications for a booking — creates separate records per channel
export async function scheduleBookingNotifications(
  bookingId: string,
  appointmentDate: Date
): Promise<void> {
  const apptTime = appointmentDate.getTime();

  // Define schedule: each entry lists which channels get a record
  const schedule: { type: string; scheduledFor: Date; channels: NotificationChannel[] }[] = [
    {
      type: "REMINDER_1WEEK",
      scheduledFor: setTime(new Date(apptTime - 7 * 24 * 60 * 60 * 1000), 9, 0),
      channels: [NotificationChannel.EMAIL],
    },
    {
      type: "REMINDER_1DAY",
      scheduledFor: setTime(new Date(apptTime - 24 * 60 * 60 * 1000), 9, 0),
      channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    },
    {
      type: "REMINDER_2HOURS",
      scheduledFor: new Date(apptTime - 2 * 60 * 60 * 1000),
      channels: [NotificationChannel.SMS],
    },
    {
      type: "AFTERCARE_6WEEKS",
      scheduledFor: setTime(new Date(apptTime + 6 * 7 * 24 * 60 * 60 * 1000), 10, 0),
      channels: [NotificationChannel.EMAIL],
    },
    {
      type: "TOUCHUP_6MONTHS",
      scheduledFor: setTime(new Date(apptTime + 6 * 30 * 24 * 60 * 60 * 1000), 10, 0),
      channels: [NotificationChannel.EMAIL],
    },
  ];

  const now = new Date();
  const records: { bookingId: string; type: string; scheduledFor: Date; channel: NotificationChannel; status: NotificationStatus }[] = [];

  for (const entry of schedule) {
    if (entry.scheduledFor <= now) continue;
    for (const channel of entry.channels) {
      records.push({
        bookingId,
        type: entry.type,
        scheduledFor: entry.scheduledFor,
        channel,
        status: NotificationStatus.PENDING,
      });
    }
  }

  if (records.length > 0) {
    await prisma.bookingNotification.createMany({ data: records });
  }
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

// Cancel unsent notifications for a booking
export async function cancelBookingNotifications(bookingId: string): Promise<void> {
  await prisma.bookingNotification.deleteMany({
    where: { bookingId, status: NotificationStatus.PENDING },
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

  const dueNotifications = await prisma.bookingNotification.findMany({
    where: {
      scheduledFor: { lte: now },
      status: NotificationStatus.PENDING,
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

      const isEmail = notification.channel === NotificationChannel.EMAIL;
      const isSMS = notification.channel === NotificationChannel.SMS;
      let success = false;

      if (notification.type === "REMINDER_1WEEK" || notification.type === "REMINDER_1DAY") {
        if (isEmail) {
          const email = appointmentReminderEmail(client.name, apptDate, booking.placement || "N/A");
          success = await sendEmail(client.email, email.subject, email.html);
        }
        if (isSMS && client.phone) {
          const hoursUntil = notification.type === "REMINDER_1DAY" ? 24 : 168;
          const smsBody = appointmentReminderSMS(client.name, hoursUntil, apptDate);
          success = await sendSMS(client.phone, smsBody);
        }
      } else if (notification.type === "REMINDER_2HOURS") {
        if (isSMS && client.phone) {
          const smsBody = appointmentReminderSMS(client.name, 2, apptDate);
          success = await sendSMS(client.phone, smsBody);
        }
      } else if (notification.type === "AFTERCARE_6WEEKS") {
        if (isEmail) {
          const email = aftercareFollowUpEmail(client.name);
          success = await sendEmail(client.email, email.subject, email.html);
        }
      } else if (notification.type === "TOUCHUP_6MONTHS") {
        if (isEmail) {
          const email = touchUpOfferEmail(client.name);
          success = await sendEmail(client.email, email.subject, email.html);
        }
      }

      if (success) {
        await prisma.bookingNotification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.SENT, sentAt: new Date() },
        });
        sent++;
      } else {
        await prisma.bookingNotification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.FAILED, failedAt: new Date() },
        });
        failed++;
      }
    } catch (error) {
      console.error(`Failed to process notification ${notification.id}:`, error);
      await prisma.bookingNotification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED, failedAt: new Date() },
      }).catch(() => {});
      failed++;
    }
  }

  return { processed: dueNotifications.length, sent, failed };
}
