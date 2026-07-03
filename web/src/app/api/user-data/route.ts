import { NextResponse } from "next/server";

import { getSessionUser, unauthorizedResponse } from "@/lib/server/auth";
import { readUserDocuments, USER_DOCUMENT_DOMAINS, writeUserDocument, type UserDocumentDomain } from "@/lib/server/user-documents";

export const runtime = "nodejs";

function normalizeDomains(searchValue: string | null) {
    const source = (searchValue || USER_DOCUMENT_DOMAINS.join(",")).split(",").map((item) => item.trim()).filter(Boolean);
    return source.filter((item): item is UserDocumentDomain => USER_DOCUMENT_DOMAINS.includes(item as UserDocumentDomain));
}

export async function GET(request: Request) {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();
    const domains = normalizeDomains(new URL(request.url).searchParams.get("domains"));
    const data = await readUserDocuments(user.id, domains);
    return NextResponse.json({ code: 0, msg: "OK", data });
}

export async function PUT(request: Request) {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();
    const body = (await request.json()) as { domain?: string; data?: unknown };
    const domain = String(body.domain || "") as UserDocumentDomain;
    if (!USER_DOCUMENT_DOMAINS.includes(domain)) return NextResponse.json({ code: 1, msg: "无效的数据域", data: null }, { status: 400 });
    await writeUserDocument(user.id, domain, body.data);
    return NextResponse.json({ code: 0, msg: "保存成功", data: null });
}
