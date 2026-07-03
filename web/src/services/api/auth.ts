export type SessionUser = {
    id: number;
    email: string;
    username: string;
    displayName: string;
};

async function parseJson<T>(response: Response) {
    const payload = (await response.json()) as { code: number; msg: string; data: T };
    if (!response.ok || payload.code !== 0) throw new Error(payload.msg || "请求失败");
    return payload.data;
}

export async function fetchSession() {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    return parseJson<{ user: SessionUser }>(response);
}

export async function login(input: { email: string; password: string }) {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
    });
    return parseJson<{ user: SessionUser }>(response);
}

export async function register(input: { email: string; password: string }) {
    const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
    });
    return parseJson<{ user: SessionUser }>(response);
}

export async function logout() {
    const response = await fetch("/api/auth/session", { method: "DELETE" });
    return parseJson<null>(response);
}
