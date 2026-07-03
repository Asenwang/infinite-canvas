import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { ensurePostgresReady, getPostgresPool } from "./postgres";

type DbUser = {
    id: number;
    email: string;
    username: string;
    password_hash: string;
    status: string;
};

export type SessionUser = {
    id: number;
    email: string;
    username: string;
    displayName: string;
};

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "infinite_canvas_session";
const AUTH_SESSION_TTL_DAYS = Math.max(1, Number(process.env.AUTH_SESSION_TTL_DAYS || "30"));

function sessionExpiresAt() {
    return new Date(Date.now() + AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function sanitizeUser(user: Pick<DbUser, "id" | "email" | "username">): SessionUser {
    const fallback = user.email.split("@")[0] || user.email;
    return {
        id: user.id,
        email: user.email,
        username: user.username || fallback,
        displayName: user.username || fallback,
    };
}

export function authCookieName() {
    return AUTH_COOKIE_NAME;
}

export async function createUserAccount() {
    throw new Error("请先在 sub2api 中注册账号，再使用该邮箱登录无限画布");
}

export async function verifyUserAccount(input: { email: string; password: string }) {
    await ensurePostgresReady();
    const db = getPostgresPool();
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();
    const { rows } = await db.query<DbUser>(
        `
            SELECT id, email, username, password_hash, status
            FROM users
            WHERE lower(email) = $1
              AND deleted_at IS NULL
            LIMIT 1
        `,
        [email],
    );
    const user = rows[0];
    if (!user) throw new Error("用户名或密码错误");
    const matched = await bcrypt.compare(password, user.password_hash);
    if (!matched) throw new Error("用户名或密码错误");
    if (user.status !== "active") throw new Error("账号已被禁用，请先联系管理员");
    return sanitizeUser(user);
}

export async function createUserSession(userId: number) {
    await ensurePostgresReady();
    const db = getPostgresPool();
    const token = randomBytes(32).toString("hex");
    const id = nanoid();
    const expiresAt = sessionExpiresAt();
    await db.query("INSERT INTO canvas.user_sessions (id, user_id, session_token_hash, expires_at) VALUES ($1, $2, $3, $4)", [id, userId, tokenHash(token), expiresAt]);
    return { token, expiresAt };
}

export async function getSessionUser() {
    await ensurePostgresReady();
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    const db = getPostgresPool();
    const { rows } = await db.query<Array<Pick<DbUser, "id" | "email" | "username"> & { expires_at: Date }>>(
        `
            SELECT public.users.id, public.users.email, public.users.username, user_sessions.expires_at
            FROM canvas.user_sessions AS user_sessions
            INNER JOIN public.users ON public.users.id = user_sessions.user_id
            WHERE user_sessions.session_token_hash = $1
              AND public.users.deleted_at IS NULL
            LIMIT 1
        `,
        [tokenHash(token)],
    );
    const session = rows[0];
    if (!session) return null;
    if (new Date(session.expires_at).getTime() <= Date.now()) {
        await db.query("DELETE FROM canvas.user_sessions WHERE session_token_hash = $1", [tokenHash(token)]);
        return null;
    }
    return sanitizeUser(session);
}

export async function clearSessionToken() {
    await ensurePostgresReady();
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (token) await getPostgresPool().query("DELETE FROM canvas.user_sessions WHERE session_token_hash = $1", [tokenHash(token)]);
    cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
    response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
    });
}

export function unauthorizedResponse() {
    return NextResponse.json({ code: 401, msg: "请先登录", data: null }, { status: 401 });
}
