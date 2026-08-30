// ============================================================
// Last Minuties — Urgency Engine
// Computes urgency score and label based on multiple signals
// ============================================================
import type { UrgencyLevel, Listing, MatchPreference, MatchResult } from '../types';

// ============================================================
// Time Utilities
// ============================================================
export function getMinutesUntilShow(showDate: string, showTime: string): number {
  const showDateTime = new Date(`${showDate}T${showTime}:00`);
  const now = new Date();
  return (showDateTime.getTime() - now.getTime()) / (1000 * 60);
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Expired';
  if (minutes < 60) return `${Math.round(minutes)}m left`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Tomorrow' : `${days} days`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h left`;
}

export function getUrgencyFromMinutes(minutes: number): UrgencyLevel {
  if (minutes <= 0) return 'urgent'; // expired, treat as urgent for display
  if (minutes <= 60) return 'urgent';
  if (minutes <= 150) return 'hot';
  if (minutes <= 360) return 'soon';
  return 'available';
}

export function getUrgencyLabel(level: UrgencyLevel): string {
  switch (level) {
    case 'urgent': return '🚨 Very Urgent';
    case 'hot': return '🔥 Happening Soon';
    case 'soon': return '🟡 Soon';
    case 'available': return '🟢 Available';
  }
}

export function getUrgencyClass(level: UrgencyLevel): string {
  switch (level) {
    case 'urgent': return 'badge-urgent';
    case 'hot': return 'badge-hot';
    case 'soon': return 'badge-soon';
    case 'available': return 'badge-available';
  }
}

// ============================================================
// Urgency Score (0–100)
// Weights: time (60%), price attractiveness (20%), listing age (20%)
// ============================================================
export function computeUrgencyScore(
  minutes: number,
  originalPrice: number,
  askingPrice: number,
  listingAgeHours: number,
): number {
  // Time weight (60pts): closer → higher
  let timeScore = 0;
  if (minutes <= 0) timeScore = 0;
  else if (minutes <= 30) timeScore = 60;
  else if (minutes <= 60) timeScore = 55;
  else if (minutes <= 120) timeScore = 45;
  else if (minutes <= 240) timeScore = 30;
  else if (minutes <= 480) timeScore = 15;
  else timeScore = 5;

  // Price discount weight (20pts): discount → more attractive
  const discountPct = originalPrice > 0
    ? ((originalPrice - askingPrice) / originalPrice) * 100
    : 0;
  const priceScore = Math.min(20, discountPct * 0.4);

  // Listing freshness (20pts): newer → slightly higher
  const ageScore = listingAgeHours < 1 ? 20
    : listingAgeHours < 3 ? 15
    : listingAgeHours < 6 ? 10
    : 5;

  return Math.min(100, Math.round(timeScore + priceScore + ageScore));
}

// ============================================================
// Update a listing's urgency in-memory (for live updates)
// ============================================================
export function refreshListingUrgency(listing: Listing): Listing {
  const minutes = getMinutesUntilShow(listing.date, listing.showTime);
  const ageHours = (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60);
  const urgencyScore = computeUrgencyScore(
    minutes,
    listing.originalPrice,
    listing.askingPrice,
    ageHours,
  );
  const urgencyLevel = getUrgencyFromMinutes(minutes);
  return { ...listing, urgencyScore, urgencyLevel };
}

// ============================================================
// Smart Matching Engine
// ============================================================
export function computeMatchScore(
  pref: MatchPreference,
  listing: Listing,
): { score: number; matchedFields: string[] } {
  const matchedFields: string[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  // Movie match (40pts)
  if (pref.movie) {
    totalWeight += 40;
    if (
      listing.movie.toLowerCase().includes(pref.movie.toLowerCase()) ||
      pref.movie.toLowerCase().includes(listing.movie.toLowerCase())
    ) {
      earnedWeight += 40;
      matchedFields.push('Movie');
    }
  }

  // Theatre match (20pts)
  if (pref.theatre) {
    totalWeight += 20;
    if (listing.theatre.toLowerCase().includes(pref.theatre.toLowerCase())) {
      earnedWeight += 20;
      matchedFields.push('Theatre');
    }
  }

  // Date match (15pts)
  if (pref.date) {
    totalWeight += 15;
    if (listing.date === pref.date) {
      earnedWeight += 15;
      matchedFields.push('Date');
    }
  }

  // Time range match (15pts)
  if (pref.startTime && pref.endTime) {
    totalWeight += 15;
    const showH = parseInt(listing.showTime.split(':')[0]);
    const showM = parseInt(listing.showTime.split(':')[1]);
    const showMins = showH * 60 + showM;
    const [sh, sm] = pref.startTime.split(':').map(Number);
    const [eh, em] = pref.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (showMins >= startMins && showMins <= endMins) {
      earnedWeight += 15;
      matchedFields.push('Time');
    }
  }

  // Price match (10pts)
  if (pref.maxPrice != null) {
    totalWeight += 10;
    if (listing.askingPrice <= pref.maxPrice) {
      earnedWeight += 10;
      matchedFields.push('Price');
    }
  }

  // If no preferences set, return 0
  if (totalWeight === 0) return { score: 0, matchedFields: [] };

  const score = Math.round((earnedWeight / totalWeight) * 100);
  return { score, matchedFields };
}

export function matchListings(
  preferences: MatchPreference[],
  listings: Listing[],
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const listing of listings) {
    if (listing.status !== 'available') continue;
    let bestScore = 0;
    let bestFields: string[] = [];

    for (const pref of preferences) {
      if (!pref.active) continue;
      const { score, matchedFields } = computeMatchScore(pref, listing);
      if (score > bestScore) {
        bestScore = score;
        bestFields = matchedFields;
      }
    }

    if (bestScore >= 50) {
      results.push({ listing, matchScore: bestScore, matchedFields: bestFields });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

// ============================================================
// Sort listings by urgency
// ============================================================
export function sortByUrgency(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => b.urgencyScore - a.urgencyScore);
}

export function filterExpired(listings: Listing[]): Listing[] {
  const now = new Date();
  return listings.filter((l) => {
    const exp = new Date(l.expiresAt);
    return exp > now && l.status === 'available';
  });
}
