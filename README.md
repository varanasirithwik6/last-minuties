# 🎟️ Last Minuties — College Ticket Exchange Platform

> **"Plans changed at the last minute? Find or pass on your ticket within your campus community."**

**Last Minuties** is a mobile-first Progressive Web Application (PWA) built specifically for college students to exchange spare last-minute movie tickets safely, fairly, and quickly. Powered by **Supabase**, **Gemini Vision AI**, and **Realtime** updates.

---

## 🌟 Key Features

- **🔒 Zero-Knowledge Privacy & Verification:** Student phone numbers are never publicly visible. Identity is verified via campus credentials and Phone OTP, displaying trust badges (`✓ Phone Verified`, `✓ College Verified`).
- **✨ Gemini Vision AI Ticket Scanner:** Sellers upload a ticket screenshot; Gemini automatically extracts movie, cinema, showtime, seats, and price with field-level confidence ratings.
- **⚡ Dynamic Urgency Engine:** Real-time countdowns (`2h 14m left`, `🔥 Happening Soon`, `🚨 Very Urgent`) prioritize tickets happening right now without price manipulation.
- **🎯 Explainable Match Engine:** Buyers set movie, venue, showtime, and budget preferences to receive instant, explainable match recommendations (`🎯 95% Match — Same Movie & Within Budget`).
- **💬 Secure Connection & In-App Chat:** Dedicated state machine (`PENDING` → `ACCEPTED` → `COMPLETED`) with in-app chat for seamless buyer-seller handover.
- **🛡️ Anti-Scalping & Fair Pricing:** Enforces fair pricing rules—asking price can never exceed original ticket price.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Vanilla CSS design system
- **Backend & Database:** Supabase PostgreSQL, Row Level Security (RLS), Supabase Storage
- **Real-Time:** Supabase Realtime (Live notifications, requests, and messaging)
- **AI / Vision:** Google Gemini 1.5 Flash Vision API
- **Mobile / PWA:** Progressive Web App with offline caching & install prompt

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/varanasirithwik6/last-minuties.git
cd last-minuties
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase & Gemini credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```
*(Note: Without Supabase credentials, the app runs in full offline **Demo Mode** with mock data).*

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 📂 Project Architecture

```
├── public/                 # Favicons and PWA manifest assets
├── src/
│   ├── components/         # Common UI, layouts, PWA prompt, and ticket components
│   ├── lib/                # Supabase client, Gemini AI extractor, Urgency engine, Crypto
│   ├── pages/              # App routes (Home, Find, Sell, Requests, Chat, Match, Activity, Auth)
│   ├── stores/             # Zustand stores (Auth, Listings, Connections, Matches, Notifications)
│   └── types/              # Core TypeScript interfaces and domain models
└── supabase/
    └── migrations/         # 001 to 005 SQL migrations with full RLS & triggers
```
