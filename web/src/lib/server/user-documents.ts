import { ensurePostgresReady, getPostgresPool } from "./postgres";

export const USER_DOCUMENT_DOMAINS = ["canvas", "assets", "image-workbench"] as const;

export type UserDocumentDomain = (typeof USER_DOCUMENT_DOMAINS)[number];
export type UserDocumentMap = Partial<Record<UserDocumentDomain, unknown>>;

export async function readUserDocuments(userId: number, domains: UserDocumentDomain[]) {
    await ensurePostgresReady();
    if (!domains.length) return {} as UserDocumentMap;
    const db = getPostgresPool();
    const { rows } = await db.query<{ domain: UserDocumentDomain; data_json: string }>("SELECT domain, data_json FROM canvas.user_documents WHERE user_id = $1 AND domain = ANY($2::text[])", [userId, domains]);
    return rows.reduce<UserDocumentMap>((result, row) => {
        try {
            result[row.domain] = JSON.parse(row.data_json || "null");
        } catch {
            result[row.domain] = null;
        }
        return result;
    }, {});
}

export async function writeUserDocument(userId: number, domain: UserDocumentDomain, data: unknown) {
    await ensurePostgresReady();
    await getPostgresPool().query(
        `
            INSERT INTO canvas.user_documents (user_id, domain, data_json)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, domain)
            DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = CURRENT_TIMESTAMP
        `,
        [userId, domain, JSON.stringify(data ?? null)],
    );
}
