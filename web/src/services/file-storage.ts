"use client";

export type UploadedFile = { url: string; storageKey: string; bytes: number; mimeType: string; width?: number; height?: number; durationMs?: number };

export async function uploadMediaFile(input: string | Blob, prefix = "file"): Promise<UploadedFile> {
    const blob = typeof input === "string" ? await (await fetch(input)).blob() : input;
    const formData = new FormData();
    formData.set("file", blob, prefix);
    formData.set("kind", prefix);
    const response = await fetch("/api/storage/upload", { method: "POST", body: formData });
    const payload = (await response.json()) as { code: number; msg: string; data?: { storageKey: string } };
    if (!response.ok || payload.code !== 0 || !payload.data?.storageKey) throw new Error(payload.msg || "上传文件失败");
    const storageKey = payload.data.storageKey;
    const url = await resolveMediaUrl(storageKey, "");
    const meta = blob.type.startsWith("video/") ? await readVideoMeta(url) : blob.type.startsWith("audio/") ? await readAudioMeta(url) : {};
    return { url, storageKey, bytes: blob.size, mimeType: blob.type || "application/octet-stream", ...meta };
}

export async function resolveMediaUrl(storageKey?: string, fallback = "") {
    if (!storageKey) return fallback;
    const response = await fetch(`/api/storage/resolve?key=${encodeURIComponent(storageKey)}`, { cache: "no-store" });
    const payload = (await response.json()) as { code: number; msg: string; data?: { url: string } };
    return !response.ok || payload.code !== 0 || !payload.data?.url ? fallback : payload.data.url;
}

export async function getMediaBlob(storageKey: string) {
    const url = await resolveMediaUrl(storageKey, "");
    if (!url) return null;
    return (await fetch(url)).blob();
}

export async function setMediaBlob(storageKey: string, blob: Blob) {
    const formData = new FormData();
    formData.set("file", blob, "media");
    formData.set("kind", storageKey.slice(0, storageKey.indexOf(":")) || "file");
    formData.set("objectKey", storageKey.slice(storageKey.indexOf(":") + 1));
    const response = await fetch("/api/storage/upload", { method: "POST", body: formData });
    const payload = (await response.json()) as { code: number; msg: string; data?: { storageKey: string } };
    if (!response.ok || payload.code !== 0 || !payload.data?.storageKey) throw new Error(payload.msg || "上传文件失败");
    return resolveMediaUrl(payload.data.storageKey, "");
}

export async function deleteStoredMedia(keys: Iterable<string>) {
    const unique = Array.from(new Set(keys)).filter(Boolean);
    if (!unique.length) return;
    await fetch("/api/storage/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keys: unique }) });
}

export async function cleanupUnusedMedia(usedData: unknown) {
    void usedData;
}

export function collectMediaStorageKeys(value: unknown, keys = new Set<string>()) {
    if (!value || typeof value !== "object") return keys;
    if ("storageKey" in value && typeof value.storageKey === "string" && value.storageKey.includes(":")) keys.add(value.storageKey);
    Object.values(value).forEach((item) => (Array.isArray(item) ? item.forEach((child) => collectMediaStorageKeys(child, keys)) : collectMediaStorageKeys(item, keys)));
    return keys;
}

function readVideoMeta(url: string) {
    return new Promise<{ width: number; height: number; durationMs?: number }>((resolve) => {
        const video = document.createElement("video");
        const done = () => resolve({ width: video.videoWidth || 1280, height: video.videoHeight || 720, durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined });
        video.onloadedmetadata = done;
        video.onerror = done;
        video.src = url;
    });
}

function readAudioMeta(url: string) {
    return new Promise<{ durationMs?: number }>((resolve) => {
        const audio = document.createElement("audio");
        const done = () => resolve({ durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined });
        audio.onloadedmetadata = done;
        audio.onerror = done;
        audio.src = url;
    });
}
