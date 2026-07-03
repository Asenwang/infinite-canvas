import { NextResponse } from "next/server";

import { signedDownloadUrl } from "@/lib/server/cos";

export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const storageKey = String(url.searchParams.get("key") || "");
        if (!storageKey) return NextResponse.json({ code: 1, msg: "缺少 key", data: null }, { status: 400 });
        return NextResponse.json({ code: 0, msg: "OK", data: { url: signedDownloadUrl(storageKey) } });
    } catch (error) {
        return NextResponse.json({ code: 1, msg: error instanceof Error ? error.message : "解析失败", data: null }, { status: 500 });
    }
}
