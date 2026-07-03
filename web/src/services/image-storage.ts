"use client";

import { readImageMeta } from "@/lib/image-utils";

export type UploadedImage = {
    url: string;
    storageKey: string;
    width: number;
    height: number;
    bytes: number;
    mimeType: string;
};

export async function uploadImage(input: string | Blob): Promise<UploadedImage> {
    const blob = typeof input === "string" ? await (await fetch(input)).blob() : input;
    const formData = new FormData();
    formData.set("file", blob, "image");
    formData.set("kind", "image");
    const response = await fetch("/api/storage/upload", { method: "POST", body: formData });
    const payload = (await response.json()) as { code: number; msg: string; data?: { storageKey: string } };
    if (!response.ok || payload.code !== 0 || !payload.data?.storageKey) throw new Error(payload.msg || "上传图片失败");
    const storageKey = payload.data.storageKey;
    const url = await resolveImageUrl(storageKey, "");
    const meta = await readImageMeta(url);
    return { url, storageKey, width: meta.width, height: meta.height, bytes: blob.size, mimeType: blob.type || meta.mimeType };
}

export async function resolveImageUrl(storageKey?: string, fallback = "") {
    if (!storageKey) return fallback;
    const response = await fetch(`/api/storage/resolve?key=${encodeURIComponent(storageKey)}`, { cache: "no-store" });
    const payload = (await response.json()) as { code: number; msg: string; data?: { url: string } };
    return !response.ok || payload.code !== 0 || !payload.data?.url ? fallback : payload.data.url;
}

export async function getImageBlob(storageKey: string) {
    const url = await resolveImageUrl(storageKey, "");
    if (!url) return null;
    return (await fetch(url)).blob();
}

export async function setImageBlob(storageKey: string, blob: Blob) {
    const formData = new FormData();
    formData.set("file", blob, "image");
    formData.set("kind", "image");
    formData.set("objectKey", storageKey.slice(storageKey.indexOf(":") + 1));
    const response = await fetch("/api/storage/upload", { method: "POST", body: formData });
    const payload = (await response.json()) as { code: number; msg: string; data?: { storageKey: string } };
    if (!response.ok || payload.code !== 0 || !payload.data?.storageKey) throw new Error(payload.msg || "上传图片失败");
    return resolveImageUrl(payload.data.storageKey, "");
}

export async function imageToDataUrl(image: { url?: string; dataUrl?: string; storageKey?: string }) {
    const url = image.dataUrl || (await resolveImageUrl(image.storageKey, image.url || ""));
    if (!url || url.startsWith("data:")) return url;
    return blobToDataUrl(await (await fetch(url)).blob());
}

export async function deleteStoredImages(keys: Iterable<string>) {
    const unique = Array.from(new Set(keys)).filter(Boolean);
    if (!unique.length) return;
    await fetch("/api/storage/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keys: unique }) });
}

export async function cleanupUnusedImages(usedData: unknown) {
    void usedData;
}

export function collectImageStorageKeys(value: unknown, keys = new Set<string>()) {
    if (!value || typeof value !== "object") return keys;
    if ("storageKey" in value && typeof value.storageKey === "string" && value.storageKey.startsWith("image:")) keys.add(value.storageKey);
    Object.values(value).forEach((item) => (Array.isArray(item) ? item.forEach((child) => collectImageStorageKeys(child, keys)) : collectImageStorageKeys(item, keys)));
    return keys;
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("读取图片失败"));
        reader.readAsDataURL(blob);
    });
}
