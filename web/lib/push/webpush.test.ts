import { describe, expect, it } from "vitest";
import { b64urlDecode, b64urlEncode, encryptPayload, vapidAuthorization } from "./webpush";

const enc = new TextEncoder();

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, len: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}
const cat = (...p: Uint8Array[]) => {
  const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of p) { o.set(x, i); i += x.length; }
  return o;
};

describe("web push encryption (RFC 8291)", () => {
  it("round-trips through a simulated browser", async () => {
    // Browser side: subscription keys.
    const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(16));

    const message = { title: "Jane is live", url: "/jane/app" };
    const body = await encryptPayload({ p256dh: b64urlEncode(uaPublic), auth: b64urlEncode(auth) }, enc.encode(JSON.stringify(message)));

    // Parse the aes128gcm header and decrypt as the browser would.
    const salt = body.slice(0, 16);
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    const idlen = body[20];
    const asPublic = body.slice(21, 21 + idlen);
    const ciphertext = body.slice(21 + idlen);

    const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256));
    const ikm = await hkdf(auth, shared, cat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
    const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
    const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ciphertext));

    expect(plain[plain.length - 1]).toBe(2); // last-record delimiter
    expect(JSON.parse(new TextDecoder().decode(plain.slice(0, -1)))).toEqual(message);
  });
});

describe("VAPID", () => {
  it("signs a verifiable ES256 JWT for the push service origin", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const publicKey = b64urlEncode(await crypto.subtle.exportKey("raw", pair.publicKey));

    const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", { publicKey, privateKey: jwk.d!, subject: "mailto:a@b.c" }, 0);
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(k).toBe(publicKey);

    const [h, c, s] = token.split(".");
    expect(JSON.parse(new TextDecoder().decode(b64urlDecode(c)))).toEqual({ aud: "https://fcm.googleapis.com", exp: 43200, sub: "mailto:a@b.c" });
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey, b64urlDecode(s), enc.encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });
});
