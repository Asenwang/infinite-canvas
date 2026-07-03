import { NextResponse } from "next/server";

import { createUserAccount, createUserSession, setSessionCookie } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        await request.json().catch(() => null);
        await createUserAccount();
        return NextResponse.json({ code: 0, msg: "OK", data: null });
    } catch (error) {
        return NextResponse.json({ code: 1, msg: error instanceof Error ? error.message : "暂不支持注册", data: null }, { status: 400 });
    }
}
