"use client";

import { create } from "zustand";
import type { SessionUser } from "@/services/api/auth";

type UserStore = {
    user: SessionUser | null;
    authLoading: boolean;
    dataReady: boolean;
    setUser: (user: SessionUser | null) => void;
    setAuthLoading: (loading: boolean) => void;
    setDataReady: (ready: boolean) => void;
    clearSession: () => void;
};

export const useUserStore = create<UserStore>()((set) => ({
    user: null,
    authLoading: true,
    dataReady: false,
    setUser: (user) => set({ user }),
    setAuthLoading: (authLoading) => set({ authLoading }),
    setDataReady: (dataReady) => set({ dataReady }),
    clearSession: () => set({ user: null, dataReady: false }),
}));
