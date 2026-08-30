// ============================================================
// Last Minuties — Gemini Vision API & AI Extraction Service
// Extracts structured ticket information from uploaded images
// ============================================================
import type { ExtractedTicket, ExtractedTicketField } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const EXTRACTION_PROMPT = `You are an AI assistant analyzing a movie ticket image. Extract the following information and return ONLY valid JSON.

Required JSON format:
{
  "movie": { "value": "Movie Name or null", "confidence": "high|medium|low" },
  "theatre": { "value": "Theatre Name or null", "confidence": "high|medium|low" },
  "date": { "value": "YYYY-MM-DD or null", "confidence": "high|medium|low" },
  "showTime": { "value": "HH:MM (24h format) or null", "confidence": "high|medium|low" },
  "seats": { "value": ["A1", "A2"] or null, "confidence": "high|medium|low" },
  "quantity": { "value": number or null, "confidence": "high|medium|low" },
  "originalPrice": { "value": number (in INR, no currency symbol) or null, "confidence": "high|medium|low" },
  "rawText": "all text visible on the ticket"
}

Rules:
- confidence "high": clearly readable without ambiguity
- confidence "medium": partially readable, inferred or slight blur
- confidence "low": guessed, obscured or unclear
- If any field is not visible or cannot be determined, set value to null with confidence "low"
- Never hallucinate or make up details if not visible on the ticket
- For date, convert formats like "30 Aug 2026", "30/08/2026" or "Today" to "YYYY-MM-DD"
- For showTime, convert "9:30 PM" to "21:30" (24-hour format)
- For seats, return as array of seat IDs (e.g. ["D7", "D8"]) even if only one seat
- quantity should match the count of seat identifiers found
- originalPrice is the total price or per-ticket price in INR as an integer/float without currency symbols`;

// ============================================================
// Real Gemini extraction
// ============================================================
async function extractWithGemini(base64Image: string, mimeType: string): Promise<ExtractedTicket> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: EXTRACTION_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('Image format not supported or image unreadable.');
    } else if (response.status === 429) {
      throw new Error('AI rate limit reached. Please enter details manually.');
    } else if (response.status === 403 || response.status === 401) {
      throw new Error('Gemini API key is invalid or unauthorized.');
    }
    throw new Error(`AI service returned error (${response.status}).`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse ticket details from AI response.');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    movie: parsed.movie || { value: null, confidence: 'low' },
    theatre: parsed.theatre || { value: null, confidence: 'low' },
    date: parsed.date || { value: null, confidence: 'low' },
    showTime: parsed.showTime || { value: null, confidence: 'low' },
    seats: parsed.seats || { value: null, confidence: 'low' },
    quantity: parsed.quantity || { value: null, confidence: 'low' },
    originalPrice: parsed.originalPrice || { value: null, confidence: 'low' },
    rawText: parsed.rawText,
    success: true,
  };
}

// ============================================================
// Mock extraction for demo / fallback when API key not set
// ============================================================
function mockExtraction(): ExtractedTicket {
  const today = new Date().toISOString().slice(0, 10);
  return {
    movie: { value: 'Coolie', confidence: 'high' },
    theatre: { value: 'PVR VR Chennai', confidence: 'high' },
    date: { value: today, confidence: 'high' },
    showTime: { value: '21:30', confidence: 'high' },
    seats: { value: ['G12', 'G13'], confidence: 'high' },
    quantity: { value: 2, confidence: 'high' },
    originalPrice: { value: 220, confidence: 'medium' },
    rawText: 'PVR CINEMAS • VR CHENNAI\nCOOLIE (TAMIL) • AUDI 4\nDATE: TODAY 09:30 PM\nSEATS: G12, G13\nTOTAL: RS. 440',
    success: true,
  };
}

// ============================================================
// Main export — handles image processing, validation and fallback
// ============================================================
export async function extractTicketFromImage(file: File): Promise<ExtractedTicket> {
  // Validate file size and type upfront
  if (file.size > 8 * 1024 * 1024) {
    return {
      movie: fieldEmpty(),
      theatre: fieldEmpty(),
      date: fieldEmpty(),
      showTime: fieldEmpty(),
      seats: { value: null, confidence: 'low' },
      quantity: { value: null, confidence: 'low' },
      originalPrice: { value: null, confidence: 'low' },
      success: false,
      errorMessage: 'Image size exceeds 8MB. Please upload a smaller image.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({
        movie: fieldEmpty(),
        theatre: fieldEmpty(),
        date: fieldEmpty(),
        showTime: fieldEmpty(),
        seats: { value: null, confidence: 'low' },
        quantity: { value: null, confidence: 'low' },
        originalPrice: { value: null, confidence: 'low' },
        success: false,
        errorMessage: 'Failed to read image file. Please try another image.',
      });
    };

    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        if (!dataUrl || !dataUrl.includes(',')) {
          throw new Error('Invalid image data');
        }
        const base64 = dataUrl.split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        if (!GEMINI_API_KEY) {
          // Simulate realistic processing delay for demo
          await new Promise((r) => setTimeout(r, 1500));
          resolve(mockExtraction());
          return;
        }

        const result = await extractWithGemini(base64, mimeType);
        resolve(result);
      } catch (err: any) {
        resolve({
          movie: fieldEmpty(),
          theatre: fieldEmpty(),
          date: fieldEmpty(),
          showTime: fieldEmpty(),
          seats: { value: null, confidence: 'low' },
          quantity: { value: null, confidence: 'low' },
          originalPrice: { value: null, confidence: 'low' },
          success: false,
          errorMessage: err?.message || "Couldn't read ticket clearly. You can still enter details manually.",
        });
      }
    };
    reader.readAsDataURL(file);
  });
}

function fieldEmpty(): ExtractedTicketField {
  return { value: null, confidence: 'low' };
}

// ============================================================
// Duplicate Detection Engine
// Deterministic detection on movie, theatre, date, time & seats
// ============================================================
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  matchedListingId?: string;
}

export function checkForDuplicate(
  newListing: {
    movie: string;
    theatre: string;
    date: string;
    showTime: string;
    seats: string[];
  },
  existingListings: Array<{
    id?: string;
    movie: string;
    theatre: string;
    date: string;
    showTime: string;
    seats: string[];
    status: string;
  }>,
): boolean {
  return checkDuplicateDetailed(newListing, existingListings).isDuplicate;
}

export function checkDuplicateDetailed(
  newListing: {
    movie: string;
    theatre: string;
    date: string;
    showTime: string;
    seats: string[];
  },
  existingListings: Array<{
    id?: string;
    movie: string;
    theatre: string;
    date: string;
    showTime: string;
    seats: string[];
    status: string;
  }>,
): DuplicateCheckResult {
  if (!newListing.movie || !newListing.theatre || !newListing.date || !newListing.showTime) {
    return { isDuplicate: false };
  }

  for (const l of existingListings) {
    if (l.status === 'expired' || l.status === 'cancelled') continue;

    const sameMovie = l.movie.trim().toLowerCase() === newListing.movie.trim().toLowerCase();
    const sameTheatre = l.theatre.trim().toLowerCase() === newListing.theatre.trim().toLowerCase();
    const sameDate = l.date === newListing.date;
    const sameTime = l.showTime.slice(0, 5) === newListing.showTime.slice(0, 5);

    const seatOverlap = newListing.seats.some((s) =>
      s.trim() && l.seats.some((ls) => ls.trim().toLowerCase() === s.trim().toLowerCase())
    );

    if (sameMovie && sameTheatre && sameDate && sameTime && seatOverlap) {
      const overlappingSeats = newListing.seats.filter((s) =>
        l.seats.some((ls) => ls.trim().toLowerCase() === s.trim().toLowerCase())
      );
      return {
        isDuplicate: true,
        reason: `An active listing already exists for ${l.movie} at ${l.theatre} on ${l.date} (${l.showTime.slice(0, 5)}) with seat(s) ${overlappingSeats.join(', ')}.`,
        matchedListingId: l.id,
      };
    }
  }

  return { isDuplicate: false };
}
