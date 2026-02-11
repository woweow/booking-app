import { prisma } from "@/lib/db";
import { encryptField, decryptField } from "@/lib/encryption";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

const TIMEZONE = "America/Los_Angeles";

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function getRedirectUri(): string {
  return `${getBaseUrl()}/api/auth/google/callback`;
}

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Generate OAuth URL for Google Calendar
export function generateOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
}> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to exchange authorization code");
  }

  const tokenData = await tokenResponse.json();

  // Get user email
  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const userInfo = await userInfoResponse.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    email: userInfo.email,
  };
}

// Refresh expired access token
async function refreshAccessToken(userId: string): Promise<string> {
  const connection = await prisma.googleConnection.findUnique({
    where: { userId },
  });

  if (!connection) throw new Error("No Google connection found");

  const refreshToken = decryptField(connection.refreshToken, "googleRefreshToken");
  if (!refreshToken) throw new Error("Failed to decrypt refresh token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error("Failed to refresh access token");

  const data = await response.json();
  const encryptedAccessToken = encryptField(data.access_token, "googleAccessToken");

  await prisma.googleConnection.update({
    where: { userId },
    data: {
      accessToken: encryptedAccessToken!,
      accessTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

// Get valid access token (refresh if expired)
async function getAccessToken(userId: string): Promise<string> {
  const connection = await prisma.googleConnection.findUnique({
    where: { userId },
  });

  if (!connection) throw new Error("No Google connection found");

  if (connection.accessTokenExpiry > new Date()) {
    const token = decryptField(connection.accessToken, "googleAccessToken");
    if (token) return token;
  }

  return refreshAccessToken(userId);
}

// Get artist user ID (first ARTIST user)
async function getArtistUserId(): Promise<string | null> {
  const artist = await prisma.user.findFirst({
    where: { role: "ARTIST" },
    select: { id: true },
  });
  return artist?.id || null;
}

// Get calendar ID for the artist
async function getCalendarId(userId: string): Promise<string> {
  const connection = await prisma.googleConnection.findUnique({
    where: { userId },
    select: { calendarId: true },
  });
  return connection?.calendarId || "primary";
}

// Sync a confirmed booking to Google Calendar
export async function syncBookingToGoogleCalendar(
  bookingId: string,
  clientName: string,
  bookingType: string,
  description: string,
  startTime: Date,
  endTime: Date,
  flashPieceName?: string
): Promise<string | null> {
  try {
    const artistId = await getArtistUserId();
    if (!artistId) return null;

    const accessToken = await getAccessToken(artistId);
    const calendarId = await getCalendarId(artistId);

    const title = flashPieceName
      ? `${clientName} - ${flashPieceName} (Flash)`
      : `${clientName} - ${bookingType} Tattoo`;

    const event = {
      summary: title,
      description: `Client: ${clientName}\nType: ${bookingType}\nDesign: ${description}\nBooking ID: ${bookingId}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: TIMEZONE,
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      console.error("Failed to create Google Calendar event:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Google Calendar sync error:", error);
    return null;
  }
}

// Sync a manual time block to Google Calendar
export async function syncTimeBlockToGoogleCalendar(
  timeBlockId: string,
  date: Date,
  startTime: string,
  endTime: string,
  notes?: string
): Promise<string | null> {
  try {
    const artistId = await getArtistUserId();
    if (!artistId) return null;

    const accessToken = await getAccessToken(artistId);
    const calendarId = await getCalendarId(artistId);

    const dateStr = date.toISOString().split("T")[0];
    const startDateTime = new Date(`${dateStr}T${startTime}:00`);
    const endDateTime = new Date(`${dateStr}T${endTime}:00`);

    const event = {
      summary: notes ? `Blocked: ${notes}` : "Blocked",
      description: `Time Block ID: ${timeBlockId}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Google Calendar time block sync error:", error);
    return null;
  }
}

// Delete a booking event from Google Calendar
export async function deleteBookingFromGoogleCalendar(googleEventId: string): Promise<void> {
  try {
    const artistId = await getArtistUserId();
    if (!artistId) return;

    const accessToken = await getAccessToken(artistId);
    const calendarId = await getCalendarId(artistId);

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  } catch (error) {
    console.error("Google Calendar delete error:", error);
  }
}

// Delete a time block event from Google Calendar
export async function deleteTimeBlockFromGoogleCalendar(googleEventId: string): Promise<void> {
  await deleteBookingFromGoogleCalendar(googleEventId);
}

// Store encrypted tokens for a new Google connection
export async function storeGoogleConnection(
  userId: string,
  email: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const encryptedAccessToken = encryptField(accessToken, "googleAccessToken")!;
  const encryptedRefreshToken = encryptField(refreshToken, "googleRefreshToken")!;

  await prisma.googleConnection.upsert({
    where: { userId },
    create: {
      userId,
      email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      accessTokenExpiry: new Date(Date.now() + expiresIn * 1000),
    },
    update: {
      email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      accessTokenExpiry: new Date(Date.now() + expiresIn * 1000),
    },
  });
}
