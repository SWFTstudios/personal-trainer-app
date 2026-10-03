import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type Bindings = { DB: D1Database; MEDIA: R2Bucket };

export async function bindings(): Promise<Bindings> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as Bindings;
}

export async function db(): Promise<D1Database> {
  return (await bindings()).DB;
}

export async function all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
  const { results } = await (await db()).prepare(sql).bind(...params).all<T>();
  return results;
}

export async function first<T>(sql: string, ...params: unknown[]): Promise<T | null> {
  return (await (await db()).prepare(sql).bind(...params).first<T>()) ?? null;
}

export async function run(sql: string, ...params: unknown[]): Promise<D1Result> {
  return (await db()).prepare(sql).bind(...params).run();
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

/** D1 surfaces RAISE(ABORT, ...) and constraint errors as messages. */
export function isDbError(error: unknown, needle: "slot_taken" | "UNIQUE constraint failed"): boolean {
  return String((error as Error)?.message ?? error).includes(needle);
}

/** Build "a = ?, b = ?" plus params from a plain object of column values. */
export function setClause(values: Record<string, unknown>): { sql: string; params: unknown[] } {
  const keys = Object.keys(values);
  return {
    sql: keys.map((k) => `${k} = ?`).join(", "),
    params: keys.map((k) => {
      const v = values[k];
      return typeof v === "boolean" ? (v ? 1 : 0) : v === undefined ? null : v;
    }),
  };
}
