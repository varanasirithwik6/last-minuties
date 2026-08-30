import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const DEMO_MODE = !supabaseUrl || !supabaseAnonKey;

export const supabase = DEMO_MODE
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    });

// Type-safe channel helper (only call when not in demo mode)
export function getRealtimeChannel(channelName: string) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.channel(channelName);
}

/**
 * Translates raw Supabase/Network errors into user-friendly messages
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Something went wrong. Please try again.';
  
  const msg = typeof error === 'string' ? error.toLowerCase() : (error.message || '').toLowerCase();

  if (msg.includes('invalid token') || msg.includes('token has expired') || msg.includes('otp expired')) {
    return 'OTP expired. Request a new code.';
  }
  if (msg.includes('token') && (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('bad'))) {
    return 'Incorrect OTP. Please try again.';
  }
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('over_email_send_rate_limit') || msg.includes('over_sms_send_rate_limit')) {
    return 'Too many requests. Please wait 60 seconds before trying again.';
  }
  if (msg.includes('sms') || msg.includes('phone') || msg.includes('provider')) {
    return 'Unable to send OTP. Please check the phone number or try again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network connection error. Please check your internet connection.';
  }

  return 'Something went wrong. Please try again.';
}
