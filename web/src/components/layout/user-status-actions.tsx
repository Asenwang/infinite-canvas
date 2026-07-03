"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { Keyboard, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "antd";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { canvasThemes } from "@/lib/canvas-theme";
import { logout } from "@/services/api/auth";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";

type UserStatusActionsProps = {
    showConfig?: boolean;
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
};

export function UserStatusActions({ showConfig = true, variant = "default", onOpenShortcuts }: UserStatusActionsProps) {
    const router = useRouter();
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const user = useUserStore((state) => state.user);
    const clearSession = useUserStore((state) => state.clearSession);
    const [loggingOut, setLoggingOut] = useState(false);
    const canvasTheme = canvasThemes[theme];
    const naturalIconClass = "inline-flex size-7 shrink-0 items-center justify-center text-stone-600 transition hover:text-stone-950 dark:text-stone-300 dark:hover:text-white [&_svg]:size-4";
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? { color: canvasTheme.node.text } : undefined;
    const versionStyle = iconStyle;

    const onLogout = async () => {
        try {
            setLoggingOut(true);
            await logout();
        } finally {
            clearSession();
            setLoggingOut(false);
            router.replace("/login");
        }
    };

    return (
        <div className="inline-flex shrink-0 items-center gap-1">
            {user ? (
                <div className="mr-2 hidden items-center gap-2 md:flex">
                    <span className="text-sm text-stone-500 dark:text-stone-400">{user.displayName}</span>
                    <Button size="small" loading={loggingOut} onClick={() => void onLogout()}>
                        退出登录
                    </Button>
                </div>
            ) : (
                <Link href="/login" className="mr-2 text-sm text-stone-600 transition hover:text-stone-950 dark:text-stone-300 dark:hover:text-white">
                    登录
                </Link>
            )}
            {showConfig ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={() => openConfigDialog(false)} aria-label="配置" title="配置">
                    <Settings2 className="size-4" />
                </button>
            ) : null}
            <AnimatedThemeToggler theme={theme} onThemeChange={setTheme} className={naturalIconClass} style={iconStyle} aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} />
            <VersionReleaseModal style={versionStyle} />
            {onOpenShortcuts ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={onOpenShortcuts} aria-label="快捷键" title="快捷键">
                    <Keyboard className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
