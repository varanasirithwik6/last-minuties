// ============================================================
// Last Minuties — Encrypted Chat Store (Zustand)
// Multi-Layer E2EE + Zero-Knowledge Privacy Relay
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Connection, Message, Listing, User, MessageType, DealOffer } from '../types';
import {
  deriveConnectionKeys,
  encryptMessage,
  generateStudentRelayId,
  scanForPII,
} from '../lib/crypto';
import { DEMO_CONNECTIONS } from '../lib/demoData';

interface KeysCacheItem {
  encKey: CryptoKey;
  hmacKey: CryptoKey;
  fingerprint: string;
}

interface ChatState {
  connections: Connection[];
  messages: Record<string, Message[]>; // connectionId -> Message[]
  isTyping: Record<string, boolean>; // connectionId -> boolean
  blockedUsers: string[];
  privacySettings: {
    autoMaskPII: boolean;
    disappearingMessages: boolean;
  };

  // Actions
  initChatStore: () => Promise<void>;
  getOrCreateConnection: (listing: Listing, buyer: User, initialOfferPrice?: number) => Promise<Connection>;
  getConnection: (connectionId: string) => Connection | undefined;
  fetchMessages: (connectionId: string) => Promise<Message[]>;
  sendMessage: (
    connectionId: string,
    plainText: string,
    senderId: string,
    options?: { messageType?: MessageType; dealOffer?: DealOffer }
  ) => Promise<Message | null>;
  sendDealOffer: (connectionId: string, senderId: string, price: number, seats: string[]) => Promise<void>;
  respondToDealOffer: (connectionId: string, messageId: string, senderId: string, accept: boolean) => Promise<void>;
  markAsRead: (connectionId: string) => void;
  blockUser: (connectionId: string) => void;
  clearChatHistory: (connectionId: string) => void;
  setPrivacySetting: (key: 'autoMaskPII' | 'disappearingMessages', val: boolean) => void;
  getSecurityFingerprint: (connectionId: string) => Promise<string>;
}

// In-memory key cache for crypto objects (CryptoKey cannot be serialized into localStorage)
const cryptoKeysMemoryCache: Record<string, KeysCacheItem> = {};

async function getOrDeriveKeys(connectionId: string): Promise<KeysCacheItem> {
  if (cryptoKeysMemoryCache[connectionId]) {
    return cryptoKeysMemoryCache[connectionId];
  }
  const keys = await deriveConnectionKeys(connectionId);
  cryptoKeysMemoryCache[connectionId] = {
    encKey: keys.encKey,
    hmacKey: keys.hmacKey,
    fingerprint: keys.keyFingerprint,
  };
  return cryptoKeysMemoryCache[connectionId];
}

// Initial demo messages for conn-1
const INITIAL_DEMO_MESSAGES: Record<string, Message[]> = {
  'conn-1': [
    {
      id: 'm-sys-1',
      connectionId: 'conn-1',
      senderId: 'system',
      message: '🔒 End-to-end multi-encryption active (AES-GCM-256 + HMAC-SHA256). Original phone numbers are masked under Student Relay IDs.',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      isEncrypted: true,
      messageType: 'system_notice',
    },
    {
      id: 'm1',
      connectionId: 'conn-1',
      senderId: 'user-2',
      message: 'Hi! Is the F1 ticket still available for tonight?',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      isEncrypted: true,
      messageType: 'text',
    },
    {
      id: 'm2',
      connectionId: 'conn-1',
      senderId: 'demo-user',
      message: 'Yes! Just listed it. Are you interested in buying?',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      isEncrypted: true,
      messageType: 'text',
    },
    {
      id: 'm3',
      connectionId: 'conn-1',
      senderId: 'user-2',
      message: 'Can we do ₹240? I can meet you directly near Audi 2.',
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      isEncrypted: true,
      messageType: 'deal_offer',
      dealOffer: {
        price: 240,
        seats: ['D7'],
        status: 'pending',
        proposedBy: 'user-2',
      },
    },
  ],
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      connections: DEMO_CONNECTIONS.map((c) => ({
        ...c,
        buyerRelayId: generateStudentRelayId(c.buyerId),
        sellerRelayId: generateStudentRelayId(c.sellerId),
        unreadCount: 1,
        lastMessage: {
          id: 'm3',
          connectionId: c.id,
          senderId: 'user-2',
          message: 'Can we do ₹240? I can meet you directly near Audi 2.',
          createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          isEncrypted: true,
        },
      })),
      messages: INITIAL_DEMO_MESSAGES,
      isTyping: {},
      blockedUsers: [],
      privacySettings: {
        autoMaskPII: true,
        disappearingMessages: false,
      },

      initChatStore: async () => {
        const { connections } = get();
        // Warm up crypto keys for all connections
        for (const conn of connections) {
          try {
            await getOrDeriveKeys(conn.id);
          } catch (e) {
            console.error('Failed to pre-derive keys for conn:', conn.id, e);
          }
        }
      },

      getSecurityFingerprint: async (connectionId: string) => {
        const keys = await getOrDeriveKeys(connectionId);
        return keys.fingerprint;
      },

      getOrCreateConnection: async (listing: Listing, buyer: User, initialOfferPrice?: number) => {
        const { connections, messages } = get();
        const existing = connections.find(
          (c) => c.listingId === listing.id && c.buyerId === buyer.id
        );

        if (existing) {
          return existing;
        }

        const connId = `conn-${Date.now()}`;
        const buyerRelayId = generateStudentRelayId(buyer.id);
        const sellerRelayId = generateStudentRelayId(listing.sellerId);

        // Derive keys for the new session
        const keys = await getOrDeriveKeys(connId);

        const newConn: Connection = {
          id: connId,
          listingId: listing.id,
          listing,
          buyerId: buyer.id,
          buyer: {
            id: buyer.id,
            name: buyer.name || 'Student Buyer',
            college: buyer.college,
            collegeVerified: buyer.collegeVerified,
            phoneVerified: buyer.phoneVerified,
          },
          sellerId: listing.sellerId,
          seller: listing.seller || {
            id: listing.sellerId,
            name: 'Ticket Seller',
            college: 'Campus Verified',
            collegeVerified: true,
            phoneVerified: true,
          },
          status: 'accepted',
          createdAt: new Date().toISOString(),
          buyerRelayId,
          sellerRelayId,
          encryptionFingerprint: keys.fingerprint,
          unreadCount: 0,
        };

        // Create initial system security handshake message
        const initialSystemMsg: Message = {
          id: `msg-sys-${Date.now()}`,
          connectionId: connId,
          senderId: 'system',
          message: '🔒 Encrypted Channel Established (AES-GCM-256). Student Relay ID activated. Phone numbers are protected.',
          createdAt: new Date().toISOString(),
          isEncrypted: true,
          messageType: 'system_notice',
        };

        const initialList = [initialSystemMsg];

        if (initialOfferPrice) {
          const offerMsg: Message = {
            id: `msg-offer-${Date.now() + 1}`,
            connectionId: connId,
            senderId: buyer.id,
            message: `I'd like to buy this ticket for ₹${initialOfferPrice}.`,
            createdAt: new Date(Date.now() + 100).toISOString(),
            isEncrypted: true,
            messageType: 'deal_offer',
            dealOffer: {
              price: initialOfferPrice,
              seats: listing.seats,
              status: 'pending',
              proposedBy: buyer.id,
            },
          };
          initialList.push(offerMsg);
          newConn.lastMessage = offerMsg;
        } else {
          newConn.lastMessage = initialSystemMsg;
        }

        set({
          connections: [newConn, ...connections],
          messages: {
            ...messages,
            [connId]: initialList,
          },
        });

        return newConn;
      },

      getConnection: (connectionId: string) => {
        return get().connections.find((c) => c.id === connectionId);
      },

      fetchMessages: async (connectionId: string) => {
        const { messages } = get();
        await getOrDeriveKeys(connectionId);
        return messages[connectionId] || [];
      },

      sendMessage: async (
        connectionId: string,
        plainText: string,
        senderId: string,
        options?: { messageType?: MessageType; dealOffer?: DealOffer }
      ) => {
        if (!plainText.trim() && !options?.dealOffer) return null;

        const { privacySettings, messages, connections } = get();
        const keys = await getOrDeriveKeys(connectionId);

        // Run Privacy Guard PII Scan
        let textToSend = plainText.trim();
        if (privacySettings.autoMaskPII) {
          const scan = scanForPII(textToSend);
          if (scan.hasPII) {
            textToSend = scan.maskedText;
          }
        }

        // Layer 1 & 2: Encrypt with AES-GCM-256 + HMAC-SHA256
        const encPayload = await encryptMessage(
          textToSend || 'Deal Offer',
          { encKey: keys.encKey, hmacKey: keys.hmacKey },
          `key-${connectionId}`
        );

        const newMsg: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          connectionId,
          senderId,
          message: textToSend, // Rendered locally in decrypted form
          createdAt: encPayload.timestamp,
          ciphertext: encPayload.ciphertext,
          iv: encPayload.iv,
          hmac: encPayload.hmac,
          keyId: encPayload.keyId,
          isEncrypted: true,
          messageType: options?.messageType || 'text',
          dealOffer: options?.dealOffer,
        };

        const currentMsgs = messages[connectionId] || [];
        const updatedMsgs = [...currentMsgs, newMsg];

        // Update connection last message
        const updatedConns = connections.map((c) => {
          if (c.id === connectionId) {
            return {
              ...c,
              lastMessage: newMsg,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });

        set({
          messages: {
            ...messages,
            [connectionId]: updatedMsgs,
          },
          connections: updatedConns,
        });

        // Trigger intelligent, privacy-preserving simulated reply if talking to demo peer
        const connection = connections.find((c) => c.id === connectionId);
        if (connection && senderId !== 'user-2' && connection.sellerId !== senderId) {
          // Peer typing simulation
          setTimeout(() => {
            set((state) => ({
              isTyping: { ...state.isTyping, [connectionId]: true },
            }));

            setTimeout(async () => {
              const peerReplies = [
                "Sounds great! Let's meet 15 mins before showtime near the box office entrance.",
                "Deal! I have the digital ticket ready with barcode for instant scan.",
                "Yes, seat is confirmed in the middle row. See you there!",
                "Confirmed. I'll be wearing a blue hoodie near Audi gate.",
                "Perfect! All set for the handover.",
              ];
              const randomReply = peerReplies[Math.floor(Math.random() * peerReplies.length)];

              const peerEncPayload = await encryptMessage(
                randomReply,
                { encKey: keys.encKey, hmacKey: keys.hmacKey },
                `key-${connectionId}`
              );

              const peerMsg: Message = {
                id: `msg-${Date.now()}-peer`,
                connectionId,
                senderId: connection.sellerId,
                message: randomReply,
                createdAt: peerEncPayload.timestamp,
                ciphertext: peerEncPayload.ciphertext,
                iv: peerEncPayload.iv,
                hmac: peerEncPayload.hmac,
                keyId: peerEncPayload.keyId,
                isEncrypted: true,
                messageType: 'text',
              };

              set((state) => ({
                isTyping: { ...state.isTyping, [connectionId]: false },
                messages: {
                  ...state.messages,
                  [connectionId]: [...(state.messages[connectionId] || []), peerMsg],
                },
                connections: state.connections.map((c) =>
                  c.id === connectionId
                    ? { ...c, lastMessage: peerMsg, updatedAt: new Date().toISOString() }
                    : c
                ),
              }));
            }, 1800);
          }, 800);
        }

        return newMsg;
      },

      sendDealOffer: async (connectionId: string, senderId: string, price: number, seats: string[]) => {
        const dealOffer: DealOffer = {
          price,
          seats,
          status: 'pending',
          proposedBy: senderId,
        };
        await get().sendMessage(
          connectionId,
          `Proposed an offer: ₹${price} for ${seats.length > 1 ? `seats ${seats.join(', ')}` : `seat ${seats[0] || '1'}`}`,
          senderId,
          {
            messageType: 'deal_offer',
            dealOffer,
          }
        );
      },

      respondToDealOffer: async (
        connectionId: string,
        messageId: string,
        senderId: string,
        accept: boolean
      ) => {
        const { messages, connections } = get();
        const currentMsgs = messages[connectionId] || [];

        let offerPrice = 0;
        const updatedMsgs = currentMsgs.map((m) => {
          if (m.id === messageId && m.dealOffer) {
            offerPrice = m.dealOffer.price;
            return {
              ...m,
              dealOffer: {
                ...m.dealOffer,
                status: accept ? ('accepted' as const) : ('declined' as const),
              },
            };
          }
          return m;
        });

        set({
          messages: {
            ...messages,
            [connectionId]: updatedMsgs,
          },
        });

        // Send confirmation message
        if (accept) {
          await get().sendMessage(
            connectionId,
            `🤝 Deal Accepted! Agreed on ₹${offerPrice}. Proceed to handover ticket at venue.`,
            senderId,
            { messageType: 'deal_accepted' }
          );

          // Update connection status
          set({
            connections: connections.map((c) =>
              c.id === connectionId ? { ...c, status: 'accepted' as const } : c
            ),
          });
        } else {
          await get().sendMessage(
            connectionId,
            `Offer of ₹${offerPrice} was declined.`,
            senderId,
            { messageType: 'deal_declined' }
          );
        }
      },

      markAsRead: (connectionId: string) => {
        const { connections } = get();
        set({
          connections: connections.map((c) =>
            c.id === connectionId ? { ...c, unreadCount: 0 } : c
          ),
        });
      },

      blockUser: (connectionId: string) => {
        const { connections, blockedUsers } = get();
        const conn = connections.find((c) => c.id === connectionId);
        if (!conn) return;

        const otherUserId = conn.sellerId;
        set({
          blockedUsers: [...blockedUsers, otherUserId],
          connections: connections.filter((c) => c.id !== connectionId),
        });
      },

      clearChatHistory: (connectionId: string) => {
        const { messages } = get();
        const updated = { ...messages };
        delete updated[connectionId];
        set({ messages: updated });
      },

      setPrivacySetting: (key, val) => {
        set((state) => ({
          privacySettings: {
            ...state.privacySettings,
            [key]: val,
          },
        }));
      },
    }),
    {
      name: 'lm-chat-store-v2',
      partialize: (state) => ({
        connections: state.connections,
        messages: state.messages,
        blockedUsers: state.blockedUsers,
        privacySettings: state.privacySettings,
      }),
    }
  )
);
