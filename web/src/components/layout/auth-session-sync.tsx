"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useCanvasStore, type CanvasProject } from "@/app/(user)/canvas/stores/use-canvas-store";
import { fetchSession, logout } from "@/services/api/auth";
import { fetchUserData, saveUserData } from "@/services/api/user-data";
import { hydrateAssets, hydrateCanvasProjects, dehydrateAssets, dehydrateCanvasProjects } from "@/services/user-data-sync";
import { useAssetStore, type Asset } from "@/stores/use-asset-store";
import { useUserStore } from "@/stores/use-user-store";

const PROTECTED_PREFIXES = ["/canvas", "/image", "/assets"];

export function AuthSessionSync() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const setUser = useUserStore((state) => state.setUser);
    const clearUser = useUserStore((state) => state.clearSession);
    const setAuthLoading = useUserStore((state) => state.setAuthLoading);
    const setDataReady = useUserStore((state) => state.setDataReady);
    const user = useUserStore((state) => state.user);
    const applyingRemoteRef = useRef(false);
    const saveTimersRef = useRef<Partial<Record<"canvas" | "assets", ReturnType<typeof setTimeout>>>>({});

    useEffect(() => {
        let cancelled = false;
        setAuthLoading(true);
        void fetchSession()
            .then(({ user }) => {
                if (cancelled) return;
                setUser(user);
            })
            .catch(async () => {
                if (cancelled) return;
                clearUser();
                if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
                    const next = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
                    router.replace(`/login?next=${encodeURIComponent(next)}`);
                }
                await logout().catch(() => undefined);
            })
            .finally(() => {
                if (!cancelled) setAuthLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [clearUser, pathname, router, searchParams, setAuthLoading, setUser]);

    useEffect(() => {
        if (!user) {
            setDataReady(false);
            return;
        }
        let cancelled = false;
        applyingRemoteRef.current = true;
        setDataReady(false);
        void fetchUserData<{ canvas?: { projects?: CanvasProject[] }; assets?: { assets?: Asset[] } }>(["canvas", "assets"])
            .then(async (data) => {
                if (cancelled) return;
                const projects = await hydrateCanvasProjects(data.canvas?.projects || []);
                const assets = await hydrateAssets(data.assets?.assets || []);
                useCanvasStore.getState().replaceProjects(projects);
                useAssetStore.getState().replaceAssets(assets);
                setDataReady(true);
            })
            .finally(() => {
                applyingRemoteRef.current = false;
            });
        return () => {
            cancelled = true;
        };
    }, [setDataReady, user]);

    useEffect(() => {
        if (!user) return;
        const unsubscribeCanvas = useCanvasStore.subscribe((state, prev) => {
            if (applyingRemoteRef.current || state.projects === prev.projects) return;
            if (saveTimersRef.current.canvas) clearTimeout(saveTimersRef.current.canvas);
            saveTimersRef.current.canvas = setTimeout(() => {
                void dehydrateCanvasProjects(useCanvasStore.getState().projects).then((projects) => saveUserData("canvas", { projects }));
            }, 600);
        });
        const unsubscribeAssets = useAssetStore.subscribe((state, prev) => {
            if (applyingRemoteRef.current || state.assets === prev.assets) return;
            if (saveTimersRef.current.assets) clearTimeout(saveTimersRef.current.assets);
            saveTimersRef.current.assets = setTimeout(() => {
                void dehydrateAssets(useAssetStore.getState().assets).then((assets) => saveUserData("assets", { assets }));
            }, 600);
        });
        return () => {
            unsubscribeCanvas();
            unsubscribeAssets();
            if (saveTimersRef.current.canvas) clearTimeout(saveTimersRef.current.canvas);
            if (saveTimersRef.current.assets) clearTimeout(saveTimersRef.current.assets);
        };
    }, [user]);

    return null;
}
