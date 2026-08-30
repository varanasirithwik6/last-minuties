// ============================================================
// Last Minuties — Core TypeScript Types
// ============================================================

export type UrgencyLevel = 'available' | 'soon' | 'hot' | 'urgent';
export type ListingStatus = 'available' | 'contacted' | 'sold' | 'expired' | 'cancelled';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
export type VerificationStatus = 'verified' | 'pending' | 'none';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type NotificationType =
  | 'match_found'
  | 'contact_request'
  | 'contact_accepted'
  | 'listing_expiring'
  | 'listing_expired'
  | 'listing_sold'
  | 'new_message'
  | 'rating_received'
  | 'connection_request'
  | 'request_accepted'
  | 'request_declined'
  | 'request_cancelled';

// ============================================================
// User
// ============================================================
export interface User {
  id: string;
  phone: string;
  name: string;
  college: string;
  studentId?: string;
  profileImage?: string;
  phoneVerified: boolean;
  collegeVerified: boolean;
  rating: number;
  ratingCount: number;
  connectionCount: number;
  accountStatus?: AccountStatus;
  joinedAt: string; // ISO
}

// ============================================================
// Listing
// ============================================================
export interface Listing {
  id: string;
  sellerId: string;
  seller?: SellerInfo;
  movie: string;
  theatre: string;
  date: string;       // YYYY-MM-DD
  showTime: string;   // HH:MM (24h)
  seats: string[];
  quantity: number;
  originalPrice: number;
  askingPrice: number;
  ticketImageUrl?: string;
  status: ListingStatus;
  urgencyScore: number;
  urgencyLevel: UrgencyLevel;
  createdAt: string;
  expiresAt: string;
  isDemo?: boolean;
}

export interface SellerInfo {
  id: string;
  name: string;
  college: string;
  profileImage?: string;
  phoneVerified: boolean;
  collegeVerified: boolean;
  rating: number;
  ratingCount: number;
  connectionCount: number;
  accountStatus?: AccountStatus;
}

// ============================================================
// Connection
// ============================================================
export interface Connection {
  id: string;
  listingId: string;
  listing?: Listing;
  buyerId: string;
  buyer?: Partial<User>;
  sellerId: string;
  seller?: Partial<User>;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt?: string;
  lastMessage?: Message;
  unreadCount?: number;
  encryptionFingerprint?: string;
  buyerRelayId?: string;
  sellerRelayId?: string;
}

// ============================================================
// Message & Encryption Envelope
// ============================================================
export type MessageType =
  | 'text'
  | 'deal_offer'
  | 'deal_accepted'
  | 'deal_declined'
  | 'system_notice'
  | 'safety_warning';

export interface DealOffer {
  price: number;
  seats: string[];
  status: 'pending' | 'accepted' | 'declined';
  proposedBy: string;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  message: string; // Decrypted plaintext for rendering
  createdAt: string;
  ciphertext?: string;
  iv?: string;
  hmac?: string;
  keyId?: string;
  isEncrypted?: boolean;
  messageType?: MessageType;
  dealOffer?: DealOffer;
  expiresAt?: string;
}

// ============================================================
// Match Preference
// ============================================================
export interface MatchPreference {
  id: string;
  userId: string;
  movie?: string;
  theatre?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  maxPrice?: number;
  active: boolean;
  createdAt: string;
}

// ============================================================
// Rating & Reputation
// ============================================================
export interface Rating {
  id: string;
  connectionId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1–5
  comment?: string;
  createdAt: string;
}

// ============================================================
// Reports & Safety
// ============================================================
export type ReportReason =
  | 'suspicious_behavior'
  | 'fake_ticket'
  | 'misleading_price'
  | 'duplicate_listing'
  | 'harassment_or_spam'
  | 'no_show'
  | 'inappropriate_message'
  | 'other';

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  listingId?: string;
  messageId?: string;
  connectionId?: string;
  reason: ReportReason | string;
  description?: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

// ============================================================
// Notification
// ============================================================
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;  // maps from 'body' in DB
  body?: string;    // DB column alias
  read: boolean;    // maps from 'is_read' in DB
  is_read?: boolean;
  data?: Record<string, string>;
  createdAt: string;
  created_at?: string;
}

// ============================================================
// Connection Request (display model with embedded data)
// ============================================================
export interface ConnectionRequest {
  id: string;
  listingId: string;
  listing?: Pick<Listing, 'id' | 'movie' | 'theatre' | 'date' | 'showTime' | 'askingPrice' | 'originalPrice' | 'seats' | 'status' | 'expiresAt'>;
  buyerId: string;
  buyer?: Pick<User, 'id' | 'name' | 'college' | 'profileImage' | 'phoneVerified' | 'collegeVerified' | 'rating' | 'ratingCount' | 'connectionCount'>;
  sellerId: string;
  seller?: Pick<User, 'id' | 'name' | 'college' | 'profileImage' | 'phoneVerified' | 'collegeVerified' | 'rating' | 'ratingCount' | 'connectionCount'>;
  status: ConnectionStatus;
  initialMessage?: string;
  createdAt: string;
  updatedAt?: string;
  lastMessage?: Message;
  unreadCount?: number;
}

// ============================================================
// College
// ============================================================
export interface College {
  id: string;
  name: string;
  verificationMethod: string;
  status: 'active' | 'inactive';
}

// ============================================================
// AI Extraction
// ============================================================
export interface ExtractedTicketField<T = string> {
  value: T | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractedTicket {
  movie: ExtractedTicketField;
  theatre: ExtractedTicketField;
  date: ExtractedTicketField;
  showTime: ExtractedTicketField;
  seats: ExtractedTicketField<string[]>;
  quantity: ExtractedTicketField<number>;
  originalPrice: ExtractedTicketField<number>;
  rawText?: string;
  success: boolean;
  errorMessage?: string;
}

// ============================================================
// Filters / Search
// ============================================================
export interface TicketFilters {
  movie?: string;
  theatre?: string;
  date?: string;
  timeRange?: 'today' | 'tomorrow' | 'starting_soon';
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'urgency' | 'price_asc' | 'recently_listed';
}

export interface MatchResult {
  listing: Listing;
  matchScore: number; // 0–100
  matchedFields: string[];
}

// ============================================================
// Forms
// ============================================================
export interface CreateListingForm {
  movie: string;
  theatre: string;
  date: string;
  showTime: string;
  seats: string;
  quantity: number;
  originalPrice: number;
  askingPrice: number;
  ticketImageUrl?: string;
}

export interface UserProfileForm {
  name: string;
  college: string;
  studentId: string;
  profileImage?: File;
}
