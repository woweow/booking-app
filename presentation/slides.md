---
theme: default
title: "Owning Your Tools"
author: Brian Rogers
transition: fade
colorSchema: light
fonts:
  sans: Inter
  mono: Fira Code
---

# Owning Your Tools

<div class="divider"></div>

<h2>Built in one week. Replaced a subscription.</h2>

<!--
"I'm going to show you something I built in a week. Not a prototype. Not a demo app. A production platform that replaced a paid SaaS subscription my wife was using to run her tattoo business."

"My wife is a working tattoo artist. She was paying hundreds of dollars a month for a booking platform that didn't do what she needed. So I built her one."

Keep it direct. Let the simplicity of the slide do the work. Pause.
-->

---
layout: center
class: bg-warm
---

# $300/month for software that didn't fit.

<!--
"Tattoo artists rely on booking platforms — they're not optional. You need deposits, scheduling, client communication, consent forms. The existing platforms charge $200-400 a month. And the feature roadmaps are locked. You get what they ship."

"My wife had specific workflows these platforms couldn't support. Custom deposit flows. Specific booking types. The way she wanted to communicate with clients. None of it was available. She was adapting to the software instead of the software adapting to her."

"She was paying $300 a month for software that fought her every day."

Pause here. Let the number sit.
-->

---
layout: center
class: bg-green-soft
---

# So I built her one.

<!--
"This project is not about reinventing tattoo booking. It's about proving something bigger."

"Modern AI models — specifically Claude — make it possible for one person to build and ship real, production-grade infrastructure in a week. Not a mockup. Not a prototype. A deployed platform that replaced an existing paid subscription."

"AI as a development accelerator. One week from concept to production. Fully deployed and live. Replacing a service that cost $300 a month."

"The thesis is simple: you can own your tools now."
-->

---
layout: center
class: bg-forest
---

# Real integrations. Real infrastructure.

<div class="service-grid mt-12">
  <div class="service-pill">Stripe</div>
  <div class="service-pill">Twilio</div>
  <div class="service-pill">Google Calendar</div>
  <div class="service-pill">Vercel</div>
  <div class="service-pill">PostgreSQL</div>
  <div class="service-pill">Redis</div>
</div>

<!--
"Let me be concrete about what 'production-grade' means."

"Stripe is processing real deposits and payments, with full webhook handling and idempotency. Twilio sends SMS reminders — one week out, one day out, two hours before an appointment. Resend handles all email — confirmations, aftercare follow-ups six weeks later, touch-up offers six months later."

"Google Calendar has two-way OAuth sync. When she confirms a booking, it appears on her calendar. When she publishes her availability, those open days sync too."

"There's image upload for design references. Encrypted consent forms with medical data. A full client messaging system. Three different booking types — custom pieces, flash pieces, and ad-hoc links."

"All of it deployed on Vercel, backed by Neon PostgreSQL, rate-limited with Upstash Redis. This is not a toy."

Click through each service name. Let them land.
-->

---
layout: center
---

# Architecture

<div class="muted mt-4" style="font-size: 1.25rem;">
TODO
</div>

<!--
TODO: Add architecture diagram here.

Stack overview for when you present without it:
"Next.js on Vercel for the frontend and API. PostgreSQL on Neon through Prisma. Stripe webhooks for payment processing. Twilio for SMS, Resend for email. Google Calendar OAuth for scheduling sync. Vercel Blob for image storage. Upstash Redis for rate limiting."

"The point of showing this isn't complexity — it's credibility. These are all real, connected, production services."
-->

---
layout: center
class: bg-green-soft
---

<div class="big-number">$0/month</div>

<div class="divider"></div>

<h2>Full control. Ship today.</h2>

<!--
"The tangible outcome: she went from paying over $300 a month to $0. The hosting is free-tier Vercel. The database is free-tier Neon. The only costs are transactional — Stripe fees on actual payments, Twilio charges on actual messages sent."

"But honestly, the money isn't the real story. The real value is control. Every feature works exactly the way she needs it to. If she wants a new workflow tomorrow, I can build it tomorrow. Not next quarter. Not after it gets enough upvotes on a feature request board. Tomorrow."

"No vendor lock-in. No dependency on someone else's product roadmap. She owns the infrastructure."
-->

---
layout: center
class: bg-warm
---

# One person. One week.

<div class="divider"></div>

<h2 class="accent">This wasn't possible three years ago.</h2>

<!--
"I want to be honest about something. I'm a software engineer. I could have built this without AI — eventually. But it would have taken months, not a week."

"The AI didn't write the code for me. It accelerated every part of the development cycle — architecture decisions, integration patterns, edge case handling, test scenarios. Enough to compress what would have been months of weekends and evenings into one focused week."

"Built for one real person. Solves real daily friction. And that's the point — this is what changes when you can build at this speed. Software becomes personal again."
-->

---
layout: center
class: bg-forest
---

# Let me show you.

<!--
"Alright. Enough slides. Let me show you the actual platform."

Transition directly into the demo. Keep it tight.

DEMO SCRIPT (target: 5–7 minutes total):

1. CREATE A BOOKING (60s)
   Walk through the client-facing booking form. Show custom piece request vs flash piece selection. Show how the booking enters the artist's queue as PENDING.

2. PROCESS A STRIPE PAYMENT (60s)
   Show the deposit flow. Artist approves → client gets deposit request → Stripe checkout → webhook fires → booking status updates to CONFIRMED automatically.

3. SHOW CALENDAR SYNC (30s)
   Flip to Google Calendar. Show the confirmed appointment appearing. Mention two-way sync — open availability days also sync when books are published.

4. UPLOAD IMAGE REFERENCE (30s)
   Upload a design reference photo to the booking. Show it attached and viewable by both artist and client.

5. SHOW REMINDER FLOW (45s)
   Walk through the notification system. Show the scheduled notifications in admin: 1-week email, 1-day email+SMS, 2-hour SMS. Show aftercare and touch-up follow-ups.

6. SHOW CHAT WITH CLIENT (30s)
   Open the messaging interface. Show in-booking chat between artist and client. Show how payment requests can be sent inline.

7. ARTIST MANAGEMENT DASHBOARD (90s)
   Walk through: booking list with status filters, client database, flash piece catalog management, availability settings, consent form viewer with encrypted medical data, book publishing.

Keep each step punchy. No narrating what they can already see — explain why each feature matters.
-->
