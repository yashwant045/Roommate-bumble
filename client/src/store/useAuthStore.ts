import { create } from "zustand";
import api from "../utils/api";

interface User {
  id: string;
  email: string;
}

interface Profile {
  name: string;
  gender: number;
  currentCity: string;
  hometown: string;
  course: string;
  workEx: number;
  bio: string | null;
  profileImage: string | null;
  needRoommate: boolean;
}

interface Preferences {
  rentBudget: number;
  distFromUni: number;
  maxPpr: number;
  alcohol: number;
  smoking: number;
  foodPref: number;
  culSkills: number;
  bhk1: number;
  bhk2: number;
  bhk3: number;
  bhk4: number;
  hall: number;
  openToOtherBranch: number;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  preferences: Preferences | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  setProfile: (profile: Profile | null) => void;
  setPreferences: (preferences: Preferences | null) => void;
  loadFromStorage: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  preferences: null,
  accessToken: null,
  refreshToken: null,
  loading: true,

  setAuth: (accessToken, refreshToken, user) => {
    const data = { accessToken, refreshToken, user };
    localStorage.setItem("roommate-bumble-auth", JSON.stringify(data));
    set({ accessToken, refreshToken, user });
  },

  setProfile: (profile) => {
    set({ profile });
    // Update local storage backup
    const authData = localStorage.getItem("roommate-bumble-auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        parsed.profile = profile;
        localStorage.setItem("roommate-bumble-auth", JSON.stringify(parsed));
      } catch (e) {
        console.error(e);
      }
    }
  },

  setPreferences: (preferences) => {
    set({ preferences });
    const authData = localStorage.getItem("roommate-bumble-auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        parsed.preferences = preferences;
        localStorage.setItem("roommate-bumble-auth", JSON.stringify(parsed));
      } catch (e) {
        console.error(e);
      }
    }
  },

  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    set({ loading: true });
    const authData = localStorage.getItem("roommate-bumble-auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        set({
          accessToken: parsed.accessToken || null,
          refreshToken: parsed.refreshToken || null,
          user: parsed.user || null,
          profile: parsed.profile || null,
          preferences: parsed.preferences || null,
        });
      } catch (e) {
        console.error("Failed to load auth from storage", e);
        localStorage.removeItem("roommate-bumble-auth");
      }
    }
    set({ loading: false });
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch (e) {
        console.error("Logout request error:", e);
      }
    }
    localStorage.removeItem("roommate-bumble-auth");
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      profile: null,
      preferences: null,
    });
  },
}));
