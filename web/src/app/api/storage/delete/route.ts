import { NextResponse } from "next/server";

import { deleteFromCos } from "@/lib/server/cos";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as { keys?: string[] };
        await deleteFromCos(Array.isArray(body.keys) ? body.keys.map(String) : []);
        return NextResponse.json({ code: 0, msg: "删除成功", data: null });
    } catch (error) {
        return NextResponse.json({ code: 1, msg: error instanceof Error ? error.message : "删除失败", data: null }, { status: 500 });
    }
}
