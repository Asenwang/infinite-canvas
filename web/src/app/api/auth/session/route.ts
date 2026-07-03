import { NextResponse } from "next/server";

import { clearSessionToken, getSessionUser, unauthorizedResponse } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();
    return NextResponse.json({ code: 0, msg: "OK", data: { user } });
}

export async function DELETE() {
    await clearSessionToken();
    return NextResponse.json({ code: 0, msg: "已退出登录", data: null });
}
