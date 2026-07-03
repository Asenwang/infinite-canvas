export type UserDataDomain = "canvas" | "assets" | "image-workbench";

async function parseJson<T>(response: Response) {
    const payload = (await response.json()) as { code: number; msg: string; data: T };
    if (!response.ok || payload.code !== 0) throw new Error(payload.msg || "请求失败");
    return payload.data;
}

export async function fetchUserData<T extends Partial<Record<UserDataDomain, unknown>>>(domains: UserDataDomain[]) {
    const response = await fetch(`/api/user-data?domains=${encodeURIComponent(domains.join(","))}`, { cache: "no-store" });
    return parseJson<T>(response);
}

export async function saveUserData(domain: UserDataDomain, data: unknown) {
    const response = await fetch("/api/user-data", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, data }),
    });
    return parseJson<null>(response);
}
