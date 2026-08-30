// ============================================================
// Last Minuties — Phase 2: Supabase Auth Store (Zustand)
// Real Phone OTP Authentication + User Profiles + RLS
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { supabase, DEMO_MODE, getFriendlyAuthErrorMessage } from '../lib/supabase';
import { DEMO_USER } from '../lib/demoData';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isNewUser: boolean;
  authError: string | null;

  // Actions
  initAuth: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<{ error?: string }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error?: string; isNewUser?: boolean }>;
  completeProfile: (profile: {
    name: string;
    college: string;
    studentId: string;
    profileImage?: string;
  }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  loginAsDemo: () => void;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isDemoMode: DEMO_MODE,
      isNewUser: false,
      authError: null,

      initAuth: async () => {
        if (DEMO_MODE || !supabase) {
          const savedUser = get().user;
          set({
            isLoading: false,
            isDemoMode: true,
            isAuthenticated: !!savedUser,
          });
          return;
        }

        try {
          // Listen for active Supabase Auth state changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
              set({ user: null, isAuthenticated: false, isNewUser: false, isLoading: false });
              return;
            }

            if (session?.user) {
              const sb = supabase;
              if (!sb) return;
              // Fetch user profile from Supabase DB
              const { data: profile, error } = await sb
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              if (!error && profile && profile.name && profile.college) {
                const userObj: User = {
                  id: profile.id,
                  phone: '', // Intentionally masked / omitted for privacy
                  name: profile.name,
                  college: profile.college,
                  studentId: profile.student_id || '',
                  profileImage: profile.profile_image || undefined,
                  phoneVerified: profile.phone_verified ?? true,
                  collegeVerified: profile.college_verified ?? false,
                  rating: Number(profile.rating || 0),
                  ratingCount: Number(profile.rating_count || 0),
                  connectionCount: Number(profile.connection_count || 0),
                  joinedAt: profile.created_at || new Date().toISOString(),
                };
                set({ user: userObj, isAuthenticated: true, isNewUser: false, isLoading: false });
              } else {
                // User is authenticated via OTP, but profile setup is pending
                set({
                  user: {
                    id: session.user.id,
                    phone: '',
                    name: '',
                    college: '',
                    phoneVerified: true,
                    collegeVerified: false,
                    rating: 0,
                    ratingCount: 0,
                    connectionCount: 0,
                    joinedAt: new Date().toISOString(),
                  },
                  isAuthenticated: false,
                  isNewUser: true,
                  isLoading: false,
                });
              }
            }
          });

          // Check current active session on boot
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile && profile.name && profile.college) {
              const userObj: User = {
                id: profile.id,
                phone: '',
                name: profile.name,
                college: profile.college,
                studentId: profile.student_id || '',
                profileImage: profile.profile_image || undefined,
                phoneVerified: profile.phone_verified ?? true,
                collegeVerified: profile.college_verified ?? false,
                rating: Number(profile.rating || 0),
                ratingCount: Number(profile.rating_count || 0),
                connectionCount: Number(profile.connection_count || 0),
                joinedAt: profile.created_at || new Date().toISOString(),
              };
              set({ user: userObj, isAuthenticated: true, isNewUser: false });
            } else {
              set({ isNewUser: true, isAuthenticated: false });
            }
          } else {
            set({ user: null, isAuthenticated: false });
          }
        } catch (err) {
          console.error('Supabase Auth init error:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      signInWithPhone: async (phone: string) => {
        set({ authError: null });

        if (DEMO_MODE || !supabase) {
          await new Promise((r) => setTimeout(r, 600));
          return {};
        }

        try {
          const { error } = await supabase.auth.signInWithOtp({
            phone,
            options: {
              channel: 'sms',
            },
          });

          if (error) {
            const friendly = getFriendlyAuthErrorMessage(error);
            set({ authError: friendly });
            return { error: friendly };
          }

          return {};
        } catch (err) {
          const friendly = getFriendlyAuthErrorMessage(err);
          set({ authError: friendly });
          return { error: friendly };
        }
      },

      verifyOtp: async (phone: string, token: string) => {
        set({ authError: null });

        if (DEMO_MODE || !supabase) {
          await new Promise((r) => setTimeout(r, 600));
          if (token !== '123456') {
            return { error: 'Incorrect OTP. Please try again. (Demo: use 123456)' };
          }
          // In demo mode, check if we need profile or if user already saved
          const existing = get().user;
          if (existing && existing.name && existing.college) {
            set({ isAuthenticated: true, isNewUser: false });
            return { isNewUser: false };
          }
          set({ isNewUser: true, isAuthenticated: false });
          return { isNewUser: true };
        }

        try {
          const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms',
          });

          if (error) {
            const friendly = getFriendlyAuthErrorMessage(error);
            set({ authError: friendly });
            return { error: friendly };
          }

          if (data?.user) {
            // Check if profile exists in database
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile && profile.name && profile.college) {
              const userObj: User = {
                id: profile.id,
                phone: '',
                name: profile.name,
                college: profile.college,
                studentId: profile.student_id || '',
                profileImage: profile.profile_image || undefined,
                phoneVerified: profile.phone_verified ?? true,
                collegeVerified: profile.college_verified ?? false,
                rating: Number(profile.rating || 0),
                ratingCount: Number(profile.rating_count || 0),
                connectionCount: Number(profile.connection_count || 0),
                joinedAt: profile.created_at || new Date().toISOString(),
              };
              set({ user: userObj, isAuthenticated: true, isNewUser: false });
              return { isNewUser: false };
            } else {
              set({
                user: {
                  id: data.user.id,
                  phone: '',
                  name: '',
                  college: '',
                  phoneVerified: true,
                  collegeVerified: false,
                  rating: 0,
                  ratingCount: 0,
                  connectionCount: 0,
                  joinedAt: new Date().toISOString(),
                },
                isNewUser: true,
                isAuthenticated: false,
              });
              return { isNewUser: true };
            }
          }

          return { error: 'Unable to verify OTP. Please try again.' };
        } catch (err) {
          const friendly = getFriendlyAuthErrorMessage(err);
          set({ authError: friendly });
          return { error: friendly };
        }
      },

      completeProfile: async ({ name, college, studentId, profileImage }) => {
        set({ authError: null });
        const { user } = get();

        // If no user object in memory, check active Supabase session
        let userId = user?.id;
        if (!userId && !DEMO_MODE && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id;
        }

        if (!userId && !DEMO_MODE) {
          return { error: 'No active session. Please verify your phone number first.' };
        }

        const effectiveId = userId || 'demo-user';

        const updatedUser: User = {
          id: effectiveId,
          phone: '', // Private
          name: name.trim(),
          college: college.trim(),
          studentId: studentId?.trim() || '',
          profileImage: profileImage || undefined,
          phoneVerified: true,
          collegeVerified: false, // Initial status: PENDING
          rating: 0,
          ratingCount: 0,
          connectionCount: 0,
          joinedAt: new Date().toISOString(),
        };

        if (DEMO_MODE || !supabase) {
          await new Promise((r) => setTimeout(r, 600));
          set({ user: updatedUser, isAuthenticated: true, isNewUser: false });
          return {};
        }

        try {
          // Upsert profile in Supabase users table with RLS
          const { error } = await supabase.from('users').upsert({
            id: effectiveId,
            name: name.trim(),
            college: college.trim(),
            student_id: studentId?.trim() || '',
            profile_image: profileImage || null,
            phone_verified: true,
            college_verified: false, // Default MVP pending
            updated_at: new Date().toISOString(),
          });

          if (error) {
            const friendly = getFriendlyAuthErrorMessage(error);
            set({ authError: friendly });
            return { error: friendly };
          }

          set({ user: updatedUser, isAuthenticated: true, isNewUser: false });
          return {};
        } catch (err) {
          const friendly = getFriendlyAuthErrorMessage(err);
          set({ authError: friendly });
          return { error: friendly };
        }
      },

      signOut: async () => {
        if (!DEMO_MODE && supabase) {
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Sign out error:', e);
          }
        }
        set({ user: null, isAuthenticated: false, isNewUser: false, authError: null });
      },

      updateUser: (data) => {
        const { user } = get();
        if (user) set({ user: { ...user, ...data } });
      },

      loginAsDemo: () => {
        set({
          user: DEMO_USER as User,
          isAuthenticated: true,
          isDemoMode: true,
          isNewUser: false,
          authError: null,
        });
      },

      clearAuthError: () => {
        set({ authError: null });
      },
    }),
    {
      name: 'lm-auth-v2',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isNewUser: state.isNewUser,
      }),
    }
  )
);
