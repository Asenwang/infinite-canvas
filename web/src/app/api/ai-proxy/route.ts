import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_PROXY_TIMEOUT_MS = 300000;
const REQUEST_HEADERS = ["authorization", "content-type", "accept"];
const RESPONSE_HEADERS = ["content-type", "cache-control"];

export async function GET(request: NextRequest) {
    return proxyAiRequest(request);
}

export async function POST(request: NextRequest) {
    return proxyAiRequest(request);
}

export async function PUT(request: NextRequest) {
    return proxyAiRequest(request);
}

export async function PATCH(request: NextRequest) {
    return proxyAiRequest(request);
}

export async function DELETE(request: NextRequest) {
    return proxyAiRequest(request);
}

export async function OPTIONS() {
    return new Response(null, { status: 204 });
}

async function proxyAiRequest(request: NextRequest) {
    const target = request.nextUrl.searchParams.get("url") || "";
    let url: URL;
    try {
        url = new URL(target);
    } catch {
        return new Response("Invalid AI proxy target", { status: 400 });
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return new Response("Unsupported AI proxy target", { status: 400 });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_PROXY_TIMEOUT_MS);
    try {
        const method = request.method.toUpperCase();
        const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
        const response = await fetch(url, {
            method,
            headers: requestHeaders(request.headers),
            body: body?.byteLength ? body : undefined,
            signal: controller.signal,
        });
        return new Response(method === "HEAD" ? null : response.body, {
            status: response.status,
            headers: responseHeaders(response.headers),
        });
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return new Response("AI proxy timeout", { status: 504 });
        return new Response(error instanceof Error ? error.message : "AI proxy error", { status: 502 });
    } finally {
        clearTimeout(timer);
    }
}

function requestHeaders(source: Headers) {
    const headers = new Headers();
    REQUEST_HEADERS.forEach((key) => {
        const value = source.get(key);
        if (value) headers.set(key, value);
    });
    return headers;
}

function responseHeaders(source: Headers) {
    const headers = new Headers();
    RESPONSE_HEADERS.forEach((key) => {
        const value = source.get(key);
        if (value) headers.set(key, value);
    });
    return headers;
}
