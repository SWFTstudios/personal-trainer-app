// Generates a VAPID key pair for web push: `npm run vapid`
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
const pub = Buffer.from(await crypto.subtle.exportKey("raw", pair.publicKey)).toString("base64url");
console.log(`VAPID_PUBLIC_KEY=${pub}\nVAPID_PRIVATE_KEY=${jwk.d}`);
