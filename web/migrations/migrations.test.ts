import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

// Runs the real D1 migrations on SQLite (D1 is SQLite) to check constraints and triggers.
function migrate() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const dir = new URL(".", import.meta.url).pathname;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(dir + f, "utf8"));
  return db;
}

const future = (mins: number) => new Date(Date.now() + mins * 60_000).toISOString();

describe("D1 schema", () => {
  let db: DatabaseSync;
  let n = 0;
  const book = (start: string, end: string, status = "confirmed", hold: string | null = null) =>
    db
      .prepare(
        `INSERT INTO bookings (id, trainer_id, service_name, client_name, client_email, starts_at, ends_at, status, hold_expires_at)
         VALUES (?, 't1', 'PT', 'A', 'a@b.c', ?, ?, ?, ?)`,
      )
      .run(`b${++n}`, start, end, status, hold);

  beforeEach(() => {
    db = migrate();
    db.exec(`INSERT INTO users (id, email, password_hash) VALUES ('u1', 'Jane@x.com', 'h');
             INSERT INTO trainers (id, user_id, slug) VALUES ('t1', 'u1', 'jane');`);
  });

  it("blocks overlapping live bookings but allows back-to-back and cancelled", () => {
    book("2026-10-05T13:00:00.000Z", "2026-10-05T14:00:00.000Z");
    book("2026-10-05T14:00:00.000Z", "2026-10-05T15:00:00.000Z");
    expect(() => book("2026-10-05T13:30:00.000Z", "2026-10-05T14:30:00.000Z")).toThrow(/slot_taken/);
    expect(() => book("2026-10-05T13:30:00.000Z", "2026-10-05T14:30:00.000Z", "cancelled")).not.toThrow();
  });

  it("lets expired payment holds be rebooked, but not live ones", () => {
    book("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z", "pending_payment", future(-1));
    expect(() => book("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z")).not.toThrow();
    book("2030-01-02T10:00:00.000Z", "2030-01-02T11:00:00.000Z", "pending_payment", future(30));
    expect(() => book("2030-01-02T10:30:00.000Z", "2030-01-02T11:30:00.000Z")).toThrow(/slot_taken/);
  });

  it("refuses to revive a cancelled booking into a taken slot", () => {
    book("2030-02-01T10:00:00.000Z", "2030-02-01T11:00:00.000Z", "cancelled");
    const cancelledId = `b${n}`;
    book("2030-02-01T10:00:00.000Z", "2030-02-01T11:00:00.000Z");
    expect(() => db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(cancelledId)).toThrow(/slot_taken/);
  });

  it("enforces unique emails case-insensitively and per-trainer page paths", () => {
    expect(() => db.exec("INSERT INTO users (id, email, password_hash) VALUES ('u2', 'jane@X.com', 'h')")).toThrow(/UNIQUE/);
    db.exec("INSERT INTO pages (id, trainer_id, path, title) VALUES ('p1', 't1', '', 'Home')");
    expect(() => db.exec("INSERT INTO pages (id, trainer_id, path, title) VALUES ('p2', 't1', '', 'Home 2')")).toThrow(/UNIQUE/);
  });

  it("cascades trainer deletion to content", () => {
    db.exec(`INSERT INTO posts (id, trainer_id, slug, title) VALUES ('x', 't1', 'hello', 'Hello');
             DELETE FROM users WHERE id = 'u1';`);
    expect(db.prepare("SELECT COUNT(*) AS c FROM posts").get()).toEqual({ c: 0 });
  });
});
