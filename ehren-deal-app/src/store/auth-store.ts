import { create } from 'zustand';

interface UserData {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
}

interface ProfileData {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  city: string;
  postalCode?: string;
  trustLevel: string;
  avgRating: number;
  totalDeals: number;
  responseTimeMinutes?: number;
  onboardingCompleted: boolean;
  createdAt?: string;
}

interface AuthState {
  user: UserData | null;
  profile: ProfileData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (data: { user: UserData; profile: ProfileData } | null) => void;
  setLoading: (loading: boolean) => void;
  setProfile: (profile: ProfileData) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  setSession: (data) =>
    set({
      user: data?.user ?? null,
      profile: data?.profile ?? null,
      isAuthenticated: !!data,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setProfile: (profile) => set({ profile }),
  signOut: () =>
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
