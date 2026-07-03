"use client";

import { resolveImageUrl, uploadImage } from "@/services/image-storage";
import { resolveMediaUrl, uploadMediaFile } from "@/services/file-storage";
import type { CanvasProject } from "@/app/(user)/canvas/stores/use-canvas-store";
import type { CanvasAssistantSession, CanvasNodeData } from "@/app/(user)/canvas/types";
import type { Asset } from "@/stores/use-asset-store";

async function dehydrateCanvasNodes(nodes: CanvasNodeData[]) {
    return Promise.all(
        nodes.map(async (node) => {
            const metadata = node.metadata;
            if (!metadata?.content) return node;
            if (node.type === "video" || node.type === "audio") {
                if (metadata.storageKey) return { ...node, metadata: { ...metadata, content: "", storageKey: metadata.storageKey } };
                if (!metadata.content.startsWith("data:")) return node;
                const media = await uploadMediaFile(await (await fetch(metadata.content)).blob(), node.type === "video" ? "video" : "audio");
                return { ...node, metadata: { ...metadata, content: "", storageKey: media.storageKey, bytes: media.bytes, mimeType: media.mimeType, durationMs: media.durationMs, naturalWidth: media.width || metadata.naturalWidth, naturalHeight: media.height || metadata.naturalHeight } };
            }
            if (node.type !== "image") return node;
            if (metadata.storageKey) return { ...node, metadata: { ...metadata, content: "", storageKey: metadata.storageKey } };
            if (!metadata.content.startsWith("data:image/")) return node;
            const image = await uploadImage(metadata.content);
            return { ...node, metadata: { ...metadata, content: "", storageKey: image.storageKey, bytes: image.bytes, mimeType: image.mimeType, naturalWidth: image.width, naturalHeight: image.height } };
        }),
    );
}

async function hydrateCanvasNodes(nodes: CanvasNodeData[]) {
    return Promise.all(
        nodes.map(async (node) => {
            const metadata = node.metadata;
            const content = metadata?.content || "";
            if (!metadata) return node;
            if ((node.type === "video" || node.type === "audio") && metadata.storageKey) {
                return { ...node, metadata: { ...metadata, content: await resolveMediaUrl(metadata.storageKey, content) } };
            }
            if (node.type === "image" && metadata.storageKey) {
                return { ...node, metadata: { ...metadata, content: await resolveImageUrl(metadata.storageKey, content) } };
            }
            if (!content) return node;
            if (node.type === "video" || node.type === "audio") {
                if (!content.startsWith("data:")) return node;
                const media = await uploadMediaFile(await (await fetch(content)).blob(), node.type === "video" ? "video" : "audio");
                return { ...node, metadata: { ...metadata, content: media.url, storageKey: media.storageKey, bytes: media.bytes, mimeType: media.mimeType, durationMs: media.durationMs, naturalWidth: media.width || metadata.naturalWidth, naturalHeight: media.height || metadata.naturalHeight } };
            }
            if (node.type !== "image" || !content.startsWith("data:image/")) return node;
            const image = await uploadImage(content);
            return { ...node, metadata: { ...metadata, content: image.url, storageKey: image.storageKey, bytes: image.bytes, mimeType: image.mimeType, naturalWidth: image.width, naturalHeight: image.height } };
        }),
    );
}

async function dehydrateAssistantSessions(sessions: CanvasAssistantSession[]) {
    return Promise.all(
        sessions.map(async (session) => ({
            ...session,
            messages: await Promise.all(
                session.messages.map(async (message) => ({
                    ...message,
                    references: await Promise.all(
                        (message.references || []).map(async (reference) => {
                            if (reference.storageKey) return { ...reference, dataUrl: "", storageKey: reference.storageKey };
                            if (!reference.dataUrl?.startsWith("data:image/")) return reference;
                            const image = await uploadImage(reference.dataUrl);
                            return { ...reference, dataUrl: "", storageKey: image.storageKey };
                        }),
                    ),
                })),
            ),
        })),
    );
}

async function hydrateAssistantSessions(sessions: CanvasAssistantSession[]) {
    return Promise.all(
        sessions.map(async (session) => ({
            ...session,
            messages: await Promise.all(
                session.messages.map(async (message) => ({
                    ...message,
                    references: await Promise.all(
                        (message.references || []).map(async (reference) => {
                            if (reference.storageKey) return { ...reference, dataUrl: await resolveImageUrl(reference.storageKey, reference.dataUrl) };
                            if (!reference.dataUrl?.startsWith("data:image/")) return reference;
                            const image = await uploadImage(reference.dataUrl);
                            return { ...reference, dataUrl: image.url, storageKey: image.storageKey };
                        }),
                    ),
                })),
            ),
        })),
    );
}

export async function dehydrateCanvasProjects(projects: CanvasProject[]) {
    return Promise.all(
        projects.map(async (project) => ({
            ...project,
            nodes: await dehydrateCanvasNodes(project.nodes),
            chatSessions: await dehydrateAssistantSessions(project.chatSessions),
        })),
    );
}

export async function hydrateCanvasProjects(projects: CanvasProject[]) {
    return Promise.all(
        projects.map(async (project) => ({
            ...project,
            nodes: await hydrateCanvasNodes(project.nodes || []),
            chatSessions: await hydrateAssistantSessions(project.chatSessions || []),
        })),
    );
}

export async function dehydrateAssets(assets: Asset[]) {
    return Promise.all(
        assets.map(async (asset) => {
            if (asset.kind === "text") return asset;
            if (asset.kind === "video") {
                if (asset.data.storageKey) return { ...asset, coverUrl: "", data: { ...asset.data, url: "", storageKey: asset.data.storageKey } };
                if (!asset.data.url.startsWith("data:")) return asset;
                const media = await uploadMediaFile(await (await fetch(asset.data.url)).blob(), "video");
                return { ...asset, coverUrl: "", data: { ...asset.data, url: "", storageKey: media.storageKey, bytes: media.bytes, mimeType: media.mimeType, width: media.width || asset.data.width, height: media.height || asset.data.height } };
            }
            if (asset.data.storageKey) return { ...asset, coverUrl: "", data: { ...asset.data, dataUrl: "", storageKey: asset.data.storageKey } };
            if (!asset.data.dataUrl.startsWith("data:image/")) return asset;
            const image = await uploadImage(asset.data.dataUrl);
            return { ...asset, coverUrl: "", data: { ...asset.data, dataUrl: "", storageKey: image.storageKey, bytes: image.bytes, mimeType: image.mimeType, width: image.width, height: image.height } };
        }),
    );
}

export async function hydrateAssets(assets: Asset[]) {
    return Promise.all(
        assets.map(async (asset) => {
            if (asset.kind === "text") return asset;
            if (asset.kind === "video") {
                if (asset.data.storageKey) return { ...asset, data: { ...asset.data, url: await resolveMediaUrl(asset.data.storageKey, asset.data.url) } };
                if (!asset.data.url.startsWith("data:")) return asset;
                const media = await uploadMediaFile(await (await fetch(asset.data.url)).blob(), "video");
                return { ...asset, data: { ...asset.data, url: media.url, storageKey: media.storageKey, bytes: media.bytes, mimeType: media.mimeType, width: media.width || asset.data.width, height: media.height || asset.data.height } };
            }
            if (asset.data.storageKey)
                return {
                    ...asset,
                    coverUrl: asset.coverUrl || (await resolveImageUrl(asset.data.storageKey, asset.data.dataUrl)),
                    data: { ...asset.data, dataUrl: await resolveImageUrl(asset.data.storageKey, asset.data.dataUrl) },
                };
            if (!asset.data.dataUrl.startsWith("data:image/")) return asset;
            const image = await uploadImage(asset.data.dataUrl);
            return { ...asset, coverUrl: asset.coverUrl.startsWith("data:image/") ? image.url : asset.coverUrl, data: { ...asset.data, dataUrl: image.url, storageKey: image.storageKey, bytes: image.bytes, mimeType: image.mimeType, width: image.width, height: image.height } };
        }),
    );
}
