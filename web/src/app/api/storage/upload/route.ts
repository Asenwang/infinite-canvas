import { NextResponse } from "next/server";

import { uploadToCos } from "@/lib/server/cos";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const kind = String(formData.get("kind") || "file");
        const objectKey = String(formData.get("objectKey") || "");
        if (!(file instanceof Blob)) return NextResponse.json({ code: 1, msg: "缺少文件", data: null }, { status: 400 });
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadToCos({ body: buffer, contentType: file.type || "application/octet-stream", kind, ...(objectKey ? { objectKey } : {}) });
        return NextResponse.json({ code: 0, msg: "上传成功", data: uploaded });
    } catch (error) {
        return NextResponse.json({ code: 1, msg: error instanceof Error ? error.message : "上传失败", data: null }, { status: 500 });
    }
}
