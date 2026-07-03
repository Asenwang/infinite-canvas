import { Pool } from "pg";

let pool: Pool | null = null;
let readyPromise: Promise<void> | null = null;

const REQUIRED_CANVAS_TABLES = ["user_sessions", "user_documents"] as const;

function databaseUrl() {
    const value = process.env.DATABASE_URL || "";
    if (!value) throw new Error("PostgreSQL 配置缺失：DATABASE_URL");
    return value;
}

function databaseNameFromUrl() {
    const parsed = new URL(databaseUrl());
    return parsed.pathname.replace(/^\/+/, "") || "postgres";
}

export function getPostgresPool() {
    if (pool) return pool;
    pool = new Pool({
        connectionString: databaseUrl(),
        max: 10,
        idleTimeoutMillis: 60_000,
    });
    return pool;
}

export async function ensurePostgresReady() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
        const db = getPostgresPool();
        const { rows: publicRows } = await db.query<{ table_name: string }>(
            `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_catalog = $1
                  AND table_name = ANY($2::text[])
            `,
            [databaseNameFromUrl(), ["users"]],
        );
        const { rows: canvasRows } = await db.query<{ table_name: string }>(
            `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'canvas'
                  AND table_catalog = $1
                  AND table_name = ANY($2::text[])
            `,
            [databaseNameFromUrl(), REQUIRED_CANVAS_TABLES],
        );
        const publicExisting = new Set(publicRows.map((item) => item.table_name));
        const canvasExisting = new Set(canvasRows.map((item) => item.table_name));
        const missing = [
            ...(["users"] as const).filter((table) => !publicExisting.has(table)).map((table) => `public.${table}`),
            ...REQUIRED_CANVAS_TABLES.filter((table) => !canvasExisting.has(table)).map((table) => `canvas.${table}`),
        ];
        if (missing.length) throw new Error(`PostgreSQL 缺少数据表：${missing.join("、")}。请先执行 sql/postgres/init.sql`);
    })().catch((error) => {
        readyPromise = null;
        throw error;
    });
    return readyPromise;
}
