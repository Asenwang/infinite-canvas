import COS from "cos-nodejs-sdk-v5";
import { nanoid } from "nanoid";

const REQUIRED_KEYS = ["COS_SECRET_ID", "COS_SECRET_KEY", "COS_BUCKET", "COS_REGION"] as const;
const COS_PREFIX = (process.env.COS_PREFIX || "creative-drawer").replace(/^\/+|\/+$/g, "");

let client: COS | null = null;

function ensureEnv() {
    const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`COS 配置缺失：${missing.join("、")}`);
    return {
        secretId: process.env.COS_SECRET_ID || "",
        secretKey: process.env.COS_SECRET_KEY || "",
        bucket: process.env.COS_BUCKET || "",
        region: process.env.COS_REGION || "",
    };
}

function cosClient() {
    if (client) return client;
    const env = ensureEnv();
    client = new COS({
        SecretId: env.secretId,
        SecretKey: env.secretKey,
    });
    return client;
}

export function buildStorageKey(kind: string, objectKey: string) {
    return `${kind}:${objectKey.replace(/^\/+/, "")}`;
}

export function parseStorageKey(storageKey: string) {
    const index = storageKey.indexOf(":");
    if (index <= 0) throw new Error("无效的 storageKey");
    return {
        kind: storageKey.slice(0, index),
        objectKey: storageKey.slice(index + 1),
    };
}

export function buildObjectKey(kind: string, extension = "bin") {
    const ext = extension.replace(/^\./, "") || "bin";
    return `${COS_PREFIX}/${kind}/${nanoid()}.${ext}`;
}

export async function uploadToCos(input: { body: Buffer; contentType: string; kind: string; objectKey?: string }) {
    const env = ensureEnv();
    const objectKey = input.objectKey || buildObjectKey(input.kind, fileExtension(input.contentType));
    await new Promise<void>((resolve, reject) => {
        cosClient().putObject(
            {
                Bucket: env.bucket,
                Region: env.region,
                Key: objectKey,
                Body: input.body,
                ContentType: input.contentType || "application/octet-stream",
            },
            (error) => (error ? reject(error) : resolve()),
        );
    });
    return { storageKey: buildStorageKey(input.kind, objectKey), objectKey };
}

export function signedDownloadUrl(storageKey: string, expires = 3600) {
    const env = ensureEnv();
    const { objectKey } = parseStorageKey(storageKey);
    return cosClient().getObjectUrl({
        Bucket: env.bucket,
        Region: env.region,
        Key: objectKey,
        Sign: true,
        Expires: expires,
    });
}

export async function deleteFromCos(storageKeys: string[]) {
    const env = ensureEnv();
    const objects = storageKeys.filter(Boolean).map((storageKey) => ({ Key: parseStorageKey(storageKey).objectKey }));
    if (!objects.length) return;
    await new Promise<void>((resolve, reject) => {
        cosClient().deleteMultipleObject(
            {
                Bucket: env.bucket,
                Region: env.region,
                Objects: objects,
                Quiet: true,
            },
            (error) => (error ? reject(error) : resolve()),
        );
    });
}

function fileExtension(contentType: string) {
    if (contentType.includes("png")) return "png";
    if (contentType.includes("jpeg")) return "jpg";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("mp4")) return "mp4";
    if (contentType.includes("webm")) return "webm";
    if (contentType.includes("mpeg")) return "mp3";
    if (contentType.includes("wav")) return "wav";
    return "bin";
}
