// ============================================================
// Last Minuties — Demo / Seed Data
// Used when Supabase is not configured
// All data is entirely fictional
// ============================================================
import type { Listing, AppNotification, Connection } from '../types';

const now = new Date();

function addHours(h: number) {
  return new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
}

function subtractHours(h: number) {
  return new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
}

function tomorrowAt(hhmm: string): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  const [hh, mm] = hhmm.split(':').map(Number);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function dateString(offset = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Demo Listings (25 tickets)
// ============================================================
export const DEMO_LISTINGS: Listing[] = [
  {
    id: 'demo-1',
    sellerId: 'user-1',
    seller: {
      id: 'user-1', name: 'Rahul Sharma', college: 'IIT Madras',
      phoneVerified: true, collegeVerified: true,
      rating: 4.8, ratingCount: 12, connectionCount: 12,
    },
    movie: 'Coolie',
    theatre: 'PVR VR Chennai',
    date: dateString(0),
    showTime: addHours(1.7).slice(11, 16),
    seats: ['G12', 'G13'],
    quantity: 2,
    originalPrice: 220,
    askingPrice: 180,
    status: 'available',
    urgencyScore: 92,
    urgencyLevel: 'urgent',
    createdAt: subtractHours(3),
    expiresAt: addHours(1.7),
    isDemo: true,
  },
  {
    id: 'demo-2',
    sellerId: 'user-2',
    seller: {
      id: 'user-2', name: 'Priya Nair', college: 'BITS Pilani',
      phoneVerified: true, collegeVerified: false,
      rating: 4.5, ratingCount: 7, connectionCount: 7,
    },
    movie: 'F1: The Movie',
    theatre: 'INOX GVK One',
    date: dateString(0),
    showTime: addHours(3.5).slice(11, 16),
    seats: ['D7'],
    quantity: 1,
    originalPrice: 300,
    askingPrice: 250,
    status: 'available',
    urgencyScore: 74,
    urgencyLevel: 'hot',
    createdAt: subtractHours(1),
    expiresAt: addHours(3.5),
    isDemo: true,
  },
  {
    id: 'demo-3',
    sellerId: 'user-3',
    seller: {
      id: 'user-3', name: 'Arjun Reddy', college: 'VIT Vellore',
      phoneVerified: true, collegeVerified: true,
      rating: 5.0, ratingCount: 3, connectionCount: 3,
    },
    movie: 'Jurassic World: Rebirth',
    theatre: 'Cinepolis Nexus',
    date: dateString(0),
    showTime: addHours(5).slice(11, 16),
    seats: ['A1', 'A2', 'A3'],
    quantity: 3,
    originalPrice: 180,
    askingPrice: 150,
    status: 'available',
    urgencyScore: 58,
    urgencyLevel: 'soon',
    createdAt: subtractHours(2),
    expiresAt: addHours(5),
    isDemo: true,
  },
  {
    id: 'demo-4',
    sellerId: 'user-4',
    seller: {
      id: 'user-4', name: 'Sneha Iyer', college: 'NIT Trichy',
      phoneVerified: true, collegeVerified: true,
      rating: 4.2, ratingCount: 5, connectionCount: 5,
    },
    movie: 'Avengers: Doomsday',
    theatre: 'PVR Forum Mall',
    date: dateString(0),
    showTime: addHours(7).slice(11, 16),
    seats: ['F5', 'F6'],
    quantity: 2,
    originalPrice: 350,
    askingPrice: 280,
    status: 'available',
    urgencyScore: 45,
    urgencyLevel: 'soon',
    createdAt: subtractHours(0.5),
    expiresAt: addHours(7),
    isDemo: true,
  },
  {
    id: 'demo-5',
    sellerId: 'user-5',
    seller: {
      id: 'user-5', name: 'Karthik Menon', college: 'Amrita University',
      phoneVerified: true, collegeVerified: false,
      rating: 4.6, ratingCount: 9, connectionCount: 9,
    },
    movie: 'Interstellar (Re-release)',
    theatre: 'IMAX Forum',
    date: dateString(0),
    showTime: addHours(2.3).slice(11, 16),
    seats: ['J15'],
    quantity: 1,
    originalPrice: 450,
    askingPrice: 350,
    status: 'available',
    urgencyScore: 85,
    urgencyLevel: 'urgent',
    createdAt: subtractHours(4),
    expiresAt: addHours(2.3),
    isDemo: true,
  },
  {
    id: 'demo-6',
    sellerId: 'user-6',
    seller: {
      id: 'user-6', name: 'Ananya Das', college: 'SRM Chennai',
      phoneVerified: true, collegeVerified: true,
      rating: 4.9, ratingCount: 21, connectionCount: 21,
    },
    movie: 'Coolie',
    theatre: 'AGS Cinemas OMR',
    date: dateString(1),
    showTime: tomorrowAt('10:00').slice(11, 16),
    seats: ['B3', 'B4'],
    quantity: 2,
    originalPrice: 200,
    askingPrice: 160,
    status: 'available',
    urgencyScore: 22,
    urgencyLevel: 'available',
    createdAt: subtractHours(0.2),
    expiresAt: tomorrowAt('10:00'),
    isDemo: true,
  },
  {
    id: 'demo-7',
    sellerId: 'user-7',
    seller: {
      id: 'user-7', name: 'Vikram Singh', college: 'IIT Bombay',
      phoneVerified: true, collegeVerified: true,
      rating: 4.7, ratingCount: 15, connectionCount: 15,
    },
    movie: 'F1: The Movie',
    theatre: 'PVR Phoenix Market City',
    date: dateString(0),
    showTime: addHours(0.75).slice(11, 16),
    seats: ['H8'],
    quantity: 1,
    originalPrice: 320,
    askingPrice: 270,
    status: 'available',
    urgencyScore: 97,
    urgencyLevel: 'urgent',
    createdAt: subtractHours(2),
    expiresAt: addHours(0.75),
    isDemo: true,
  },
  {
    id: 'demo-8',
    sellerId: 'user-8',
    seller: {
      id: 'user-8', name: 'Divya Krishnan', college: 'Loyola Chennai',
      phoneVerified: true, collegeVerified: false,
      rating: 4.1, ratingCount: 4, connectionCount: 4,
    },
    movie: 'Pushpa 3',
    theatre: 'Rohini Silver Screens',
    date: dateString(0),
    showTime: addHours(4).slice(11, 16),
    seats: ['C9', 'C10', 'C11'],
    quantity: 3,
    originalPrice: 160,
    askingPrice: 120,
    status: 'available',
    urgencyScore: 62,
    urgencyLevel: 'hot',
    createdAt: subtractHours(1.5),
    expiresAt: addHours(4),
    isDemo: true,
  },
  {
    id: 'demo-9',
    sellerId: 'user-1',
    seller: {
      id: 'user-1', name: 'Rahul Sharma', college: 'IIT Madras',
      phoneVerified: true, collegeVerified: true,
      rating: 4.8, ratingCount: 12, connectionCount: 12,
    },
    movie: 'Avengers: Doomsday',
    theatre: 'SPI Palazzo Chennai',
    date: dateString(1),
    showTime: tomorrowAt('18:30').slice(11, 16),
    seats: ['E2', 'E3'],
    quantity: 2,
    originalPrice: 380,
    askingPrice: 300,
    status: 'available',
    urgencyScore: 18,
    urgencyLevel: 'available',
    createdAt: subtractHours(0.1),
    expiresAt: tomorrowAt('18:30'),
    isDemo: true,
  },
  {
    id: 'demo-10',
    sellerId: 'user-3',
    seller: {
      id: 'user-3', name: 'Arjun Reddy', college: 'VIT Vellore',
      phoneVerified: true, collegeVerified: true,
      rating: 5.0, ratingCount: 3, connectionCount: 3,
    },
    movie: 'Coolie',
    theatre: 'Cinepolis Chennai',
    date: dateString(0),
    showTime: addHours(6).slice(11, 16),
    seats: ['K1'],
    quantity: 1,
    originalPrice: 210,
    askingPrice: 180,
    status: 'contacted',
    urgencyScore: 50,
    urgencyLevel: 'soon',
    createdAt: subtractHours(3),
    expiresAt: addHours(6),
    isDemo: true,
  },
  {
    id: 'demo-11',
    sellerId: 'user-5',
    seller: {
      id: 'user-5', name: 'Karthik Menon', college: 'Amrita University',
      phoneVerified: true, collegeVerified: false,
      rating: 4.6, ratingCount: 9, connectionCount: 9,
    },
    movie: 'Kalki 2898 AD (Part 2)',
    theatre: 'PVR Skywalk',
    date: dateString(1),
    showTime: tomorrowAt('14:15').slice(11, 16),
    seats: ['M5', 'M6'],
    quantity: 2,
    originalPrice: 260,
    askingPrice: 220,
    status: 'available',
    urgencyScore: 20,
    urgencyLevel: 'available',
    createdAt: subtractHours(0.3),
    expiresAt: tomorrowAt('14:15'),
    isDemo: true,
  },
  {
    id: 'demo-12',
    sellerId: 'user-2',
    seller: {
      id: 'user-2', name: 'Priya Nair', college: 'BITS Pilani',
      phoneVerified: true, collegeVerified: false,
      rating: 4.5, ratingCount: 7, connectionCount: 7,
    },
    movie: 'Interstellar (Re-release)',
    theatre: 'INOX Citi Centre',
    date: dateString(0),
    showTime: addHours(8).slice(11, 16),
    seats: ['L3'],
    quantity: 1,
    originalPrice: 400,
    askingPrice: 320,
    status: 'available',
    urgencyScore: 38,
    urgencyLevel: 'soon',
    createdAt: subtractHours(2),
    expiresAt: addHours(8),
    isDemo: true,
  },
];

// ============================================================
// Demo Notifications
// ============================================================
export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    userId: 'demo-user',
    type: 'match_found',
    title: '🎯 Match Found!',
    message: 'A ticket for Coolie at PVR VR Chennai matches your preference.',
    read: false,
    data: { listingId: 'demo-1' },
    createdAt: subtractHours(0.5),
  },
  {
    id: 'notif-2',
    userId: 'demo-user',
    type: 'contact_request',
    title: 'Someone wants your ticket',
    message: 'Priya Nair wants to buy your F1 ticket. Accept to share contact.',
    read: false,
    data: { connectionId: 'conn-1' },
    createdAt: subtractHours(1),
  },
  {
    id: 'notif-3',
    userId: 'demo-user',
    type: 'listing_expiring',
    title: 'Listing expiring soon',
    message: 'Your Jurassic World ticket listing expires in 30 minutes.',
    read: true,
    data: { listingId: 'demo-3' },
    createdAt: subtractHours(2),
  },
];

// ============================================================
// Demo User Listings (my activity)
// ============================================================
export const DEMO_MY_LISTINGS: Listing[] = [
  {
    id: 'my-1',
    sellerId: 'demo-user',
    movie: 'Coolie',
    theatre: 'PVR VR Chennai',
    date: dateString(0),
    showTime: addHours(3).slice(11, 16),
    seats: ['G5'],
    quantity: 1,
    originalPrice: 220,
    askingPrice: 190,
    status: 'available',
    urgencyScore: 72,
    urgencyLevel: 'hot',
    createdAt: subtractHours(1),
    expiresAt: addHours(3),
    isDemo: true,
  },
  {
    id: 'my-2',
    sellerId: 'demo-user',
    movie: 'Interstellar (Re-release)',
    theatre: 'IMAX Forum',
    date: dateString(-1),
    showTime: '21:00',
    seats: ['J10', 'J11'],
    quantity: 2,
    originalPrice: 450,
    askingPrice: 380,
    status: 'sold',
    urgencyScore: 0,
    urgencyLevel: 'available',
    createdAt: subtractHours(26),
    expiresAt: subtractHours(2),
    isDemo: true,
  },
];

// ============================================================
// Demo Connections
// ============================================================
export const DEMO_CONNECTIONS: Connection[] = [
  {
    id: 'conn-1',
    listingId: 'demo-2',
    listing: DEMO_LISTINGS[1],
    buyerId: 'demo-user',
    buyer: { id: 'demo-user', name: 'You' },
    sellerId: 'user-2',
    seller: { id: 'user-2', name: 'Priya Nair' },
    status: 'accepted',
    createdAt: subtractHours(2),
  },
];

// ============================================================
// Demo DEMO_USER
// ============================================================
export const DEMO_USER = {
  id: 'demo-user',
  phone: '+91 98765 43210',
  name: 'Demo Student',
  college: 'IIT Madras',
  studentId: 'CS21B001',
  phoneVerified: true,
  collegeVerified: false,
  rating: 4.7,
  ratingCount: 6,
  connectionCount: 6,
  joinedAt: subtractHours(24 * 30).slice(0, 10),
};

// ============================================================
// Sample Colleges
// ============================================================
export const SAMPLE_COLLEGES = [
  'IIT Madras',
  'IIT Bombay',
  'IIT Delhi',
  'IIT Kharagpur',
  'BITS Pilani',
  'VIT Vellore',
  'NIT Trichy',
  'NIT Warangal',
  'SRM Chennai',
  'Amrita University',
  'Loyola College Chennai',
  'Presidency College Chennai',
  'Anna University',
  'Saveetha University',
  'Hindustan Institute of Technology',
  'PSG College of Technology',
  'Coimbatore Institute of Technology',
  'Manipal Institute of Technology',
  'PESIT Bangalore',
  'RV College of Engineering',
  'Other',
];
