import { NextResponse } from "next/server";

import { createUserSession, setSessionCookie, verifyUserAccount } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as { email?: string; password?: string };
        const user = await verifyUserAccount({ email: String(body.email || ""), password: String(body.password || "") });
        const session = await createUserSession(user.id);
        const response = NextResponse.json({ code: 0, msg: "登录成功", data: { user } });
        await setSessionCookie(response, session.token, session.expiresAt);
        return response;
    } catch (error) {
        return NextResponse.json({ code: 1, msg: error instanceof Error ? error.message : "登录失败", data: null }, { status: 400 });
    }
}
