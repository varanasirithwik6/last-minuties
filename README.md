# 🎟️ Last Minuties — College Ticket Exchange Platform

> **"Plans changed at the last minute? Find or pass on your ticket within your campus community."**

**Last Minuties** is a mobile-first Progressive Web Application (PWA) built for college students to exchange spare last-minute movie tickets safely, fairly, and instantly. Powered by **Supabase**, **Google Gemini Vision AI**, and **Realtime** subscriptions.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange.svg)](#pwa)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg)](https://supabase.com)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-blue.svg)](https://aistudio.google.com)

---

## 🌟 Feature Overview

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Phone OTP Authentication (Supabase) | ✅ Done |
| 1 | One-user model (buyer + seller) | ✅ Done |
| 2 | College profile & verification | ✅ Done |
| 3 | Ticket listing marketplace | ✅ Done |
| 3 | Search, filter & sort | ✅ Done |
| 3 | Real-time urgency countdown engine | ✅ Done |
| 4 | Buyer-seller connection system | ✅ Done |
| 4 | Private in-app messaging | ✅ Done |
| 4 | Offer & negotiation flow | ✅ Done |
| 5 | AI ticket scanner (Gemini Vision) | ✅ Done |
| 5 | Smart match engine | ✅ Done |
| 5 | Duplicate detection | ✅ Done |
| 6 | Seller reputation & star ratings | ✅ Done |
| 6 | Content reporting & moderation | ✅ Done |
| 6 | User blocking & privacy controls | ✅ Done |
| 7 | PWA icons & offline banner | ✅ Done |
| 7 | Skeleton loaders & performance polish | ✅ Done |
| 7 | Vercel deployment config | ✅ Done |

---

## ⚡ Product Boundary

**Last Minuties is a connector, not a seller.**

We help buyers and sellers find each other. **All payments and ticket transfers happen directly between students.** Last Minuties does not:
- Process payments
- Hold money in escrow
- Guarantee transactions
- Resell or redistribute tickets

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Vanilla CSS (custom design system) |
| **State** | Zustand (7 stores) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **AI** | Google Gemini 1.5 Flash Vision API |
| **PWA** | Vite PWA Plugin (Workbox) |
| **Deployment** | Vercel |
| **Routing** | React Router v6 |

---

## 🏗️ Architecture

```
src/
├── pages/
│   ├── auth/
│   │   ├── LandingPage.tsx       # Public landing with live demo tickets
│   │   └── PhoneAuthPage.tsx     # Phone OTP auth (4-step wizard)
│   └── app/
│       ├── HomePage.tsx          # Personalized feed (Matches, Urgent, Fresh)
│       ├── FindPage.tsx          # Full search with filters & sort
│       ├── SellPage.tsx          # AI-powered sell wizard
│       ├── EditListingPage.tsx   # Edit active listings
│       ├── TicketDetailPage.tsx  # Ticket detail + contact request
│       ├── ActivityPage.tsx      # My listings (Active, Sold, Expired, Cancelled)
│       ├── RequestsPage.tsx      # Buyer/seller request management
│       ├── ChatPage.tsx          # In-app messaging + offer flow
│       ├── MatchPage.tsx         # Set match preferences
│       ├── NotificationsPage.tsx # Real-time notification center
│       └── ProfilePage.tsx       # Profile, reputation, privacy, account
├── components/
│   ├── common/
│   │   ├── LoadingScreen.tsx
│   │   ├── OfflineBanner.tsx     # Network status banner
│   │   └── UserAvatar.tsx
│   ├── layout/
│   │   ├── AppShell.tsx          # Main layout (sidebar + topbar + bottomnav)
│   │   ├── BottomNav.tsx         # Mobile navigation
│   │   ├── TopBar.tsx            # Mobile top bar
│   │   └── Sidebar.tsx           # Desktop sidebar
│   ├── pwa/
│   │   └── InstallPrompt.tsx     # Android/iOS PWA install prompt
│   ├── safety/
│   │   ├── RatingModal.tsx       # Post-transaction star ratings
│   │   ├── ReportModal.tsx       # Content/user reporting
│   │   ├── SafetyBanner.tsx      # In-chat safety banner
│   │   └── PrivacyCenterModal.tsx # Privacy settings & account control
│   └── tickets/
│       └── TicketCard.tsx        # Ticket card with live urgency countdown
├── stores/
│   ├── authStore.ts             # Auth, session, profile management
│   ├── listingsStore.ts         # Ticket listings CRUD + filters
│   ├── connectionStore.ts       # Buyer-seller connection state machine
│   ├── chatStore.ts             # Real-time messaging
│   ├── matchPreferenceStore.ts  # Smart match preferences
│   ├── notificationStore.ts     # Real-time notification subscription
│   └── safetyStore.ts           # Ratings, reports, blocks
├── lib/
│   ├── supabase.ts              # Supabase client + DEMO_MODE detection
│   ├── gemini.ts                # Gemini Vision API + mock fallback
│   ├── urgency.ts               # Time-to-show urgency engine + match scoring
│   ├── crypto.ts                # AES-GCM message encryption
│   └── demoData.ts              # Sample data for DEMO_MODE
└── types/
    └── index.ts                 # All TypeScript types and interfaces
```

---

## 🗄️ Database Schema

```
supabase/migrations/
├── 001_auth_profiles.sql        # profiles, college_verifications
├── 002_connections.sql          # connections, messages, notifications
├── 003_ticket_marketplace.sql   # listings table
├── 004_match_preferences.sql    # match_preferences table
├── 005_notifications_rls.sql    # RLS policies for notifications
└── 006_trust_safety_reputation.sql # ratings, reports, blocks
```

All tables are protected by **Row Level Security (RLS)** policies. Users can only read/write their own data, with careful exceptions for community-visible fields (e.g., listings, reputation scores).

**Key security rules:**
- Phone numbers are **never exposed** in any public-facing query
- Student IDs are never stored or displayed
- Messages are encrypted client-side (AES-GCM)
- Block lists are enforced at DB trigger level

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) A [Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/varanasirithwik6/last-minuties.git
cd last-minuties
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here   # Optional
VITE_APP_VERSION=1.0.0
```

> **Demo Mode:** Without Supabase credentials, the app runs in **full Demo Mode** with sample data. No real auth will work. Configure Supabase to go live.

### 3. Set Up Supabase Database

Run migrations in order in the Supabase SQL Editor:

```bash
# Run each file in the Supabase SQL Editor:
supabase/migrations/001_auth_profiles.sql
supabase/migrations/002_connections.sql
supabase/migrations/003_ticket_marketplace.sql
supabase/migrations/004_match_preferences.sql
supabase/migrations/005_notifications_rls.sql
supabase/migrations/006_trust_safety_reputation.sql
```

Enable **Phone OTP** in your Supabase dashboard:
- Go to `Authentication → Providers → Phone`
- Connect a Twilio account for SMS OTP
- Or use test phone numbers (Supabase dashboard) for local development

### 4. Run Locally

```bash
npm run dev
```

App runs at `http://localhost:5173`.

### 5. Build for Production

```bash
npm run build
```

---

## 🌐 Deployment (Vercel)

### Automatic (Recommended)

1. Connect the GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy — SPA routing is handled by `vercel.json`

### Manual

```bash
npm run build
npx vercel --prod
```

The included `vercel.json` handles:
- SPA routing (all routes → `/index.html`)
- PWA service worker caching headers
- Immutable asset caching for `/assets/*`

---

## 📱 PWA Features

Last Minuties is installable as a Progressive Web App on Android and iOS:

- **Android (Chrome):** "Add to Home Screen" prompt auto-shows after 15 seconds
- **iOS (Safari):** Step-by-step guide prompt shows for Safari users
- **Offline:** Offline banner appears when network is lost; core app cached for offline browsing
- **Push-ready:** Supabase Realtime provides live updates via WebSocket when online

PWA Icons:
- `public/pwa-192x192.png` — Android home screen icon
- `public/pwa-512x512.png` — Splash screen & maskable icon
- `public/apple-touch-icon.png` — iOS home screen icon

---

## 🔒 Privacy & Security

| Protection | Implementation |
|---|---|
| Phone number privacy | Never shown in UI; never returned from DB |
| Student ID privacy | Never stored or displayed |
| Message privacy | AES-GCM encryption in `crypto.ts` |
| RLS enforcement | Every Supabase table has strict RLS policies |
| Block enforcement | DB triggers prevent blocked users from interacting |
| Report moderation | Reports stored privately; only admins can see |
| Anti-scalping | `asking_price ≤ original_price` enforced at DB constraint |

---

## 🎯 User Journey

```
1. Landing page          → Demo tickets, "Get Started" CTA
2. Phone auth            → Enter phone → OTP → Verified
3. Profile setup         → Name, college, avatar (with AI scan option)
4. Home feed             → Personalized: Matches, Urgent, Fresh, Budget
5. Find tickets          → Search, filter by time/price/date
6. Ticket detail         → Trust badge, rating, "Request to Buy"
7. Seller reviews        → Accept/Decline the request
8. Chat opens            → Private messaging with offer flow
9. Agree & exchange      → Buyer/seller exchange ticket directly
10. Rate the experience  → Star rating → builds reputation
```

---

## 🧩 Stores & State Management

| Store | Purpose |
|---|---|
| `authStore` | Auth session, user profile, initAuth |
| `listingsStore` | CRUD for listings, filters, my listings |
| `connectionStore` | Connection requests, accept/decline, state machine |
| `chatStore` | Real-time messages, send, subscription |
| `matchPreferenceStore` | Buyer's preferences for smart matching |
| `notificationStore` | Real-time notification feed, unread count |
| `safetyStore` | Ratings, reports, blocks, privacy settings |

---

## 🔔 Notification Types

| Event | Notification |
|---|---|
| Contact request received | "Student X wants to buy your ticket" |
| Request accepted | "Your request was accepted — chat now" |
| Request declined | "Request declined" |
| New message | "New message in your conversation" |
| Listing expiring | "Your listing expires in 1 hour" |
| Listing sold | "🎉 Your ticket was sold" |
| Rating received | "You received a new rating" |
| Match found | "New ticket matches your preferences" |

---

## 🛡️ Reputation System

Each user builds a trust profile:

- **Star ratings** (1–5) after each completed transaction
- **Total transactions** counter
- **Verified** badges: Phone Verified, College Verified
- **Report flagging** for scam/spam/harassment
- **Block** system with DB-level enforcement

Reputation is displayed on TicketDetailPage (seller), RequestsPage (both parties), and ProfilePage.

---

## 📄 License

MIT © 2026 Rithwik Varanasi

---

## 🙌 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

*Last Minuties — Built with ❤️ for college students who love movies.*
