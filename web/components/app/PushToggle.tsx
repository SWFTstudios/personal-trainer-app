"use client";

import { useEffect, useState, useTransition } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/[slug]/app/actions";
import { Icon } from "@/components/ui/Icon";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

async function registration(slug: string) {
  return navigator.serviceWorker.register("/sw.js", { scope: `/${slug}/app/` });
}

/**
 * Turns live/feedback alerts on or off for this device.
 * `variant="card"` is the dismissible prompt on Home; "row" is the settings toggle.
 */
export function PushToggle({ slug, vapidKey, coach, variant = "row" }: { slug: string; vapidKey: string | null; coach: string; variant?: "row" | "card" }) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await registration(slug);
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [slug, vapidKey]);

  function enable() {
    setError("");
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
        const reg = await registration(slug);
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) });
        const result = await savePushSubscription(slug, sub.toJSON());
        if (!result.ok) throw new Error(result.error);
        setState("on");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't turn on notifications.");
      }
    });
  }

  function disable() {
    start(async () => {
      const reg = await registration(slug);
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(slug, sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });
  }

  if (variant === "card") {
    if (state !== "off" && state !== "ios-install") return null;
    return (
      <div className="card row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <span className="avatar"><Icon name="bell" width={20} height={20} /></span>
        <div className="grow stack-sm">
          <strong>Know when {coach} goes live</strong>
          {state === "ios-install" ? (
            <p className="muted small" style={{ margin: 0 }}>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>, open the app from there, and turn on alerts.</p>
          ) : (
            <>
              <p className="muted small" style={{ margin: 0 }}>Get a notification for live sessions, new tips and workout feedback.</p>
              <button type="button" className="btn btn-sm" onClick={enable} disabled={pending}>{pending ? "Turning on…" : "Turn on alerts"}</button>
            </>
          )}
          {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
        </div>
      </div>
    );
  }

  const label: Record<State, string> = {
    loading: "Checking…",
    unsupported: "This browser doesn't support notifications.",
    "ios-install": "On iPhone, add this app to your Home Screen first (Share → Add to Home Screen).",
    denied: "Notifications are blocked. Allow them for this site in your browser or phone settings.",
    off: "Off",
    on: "On for this device",
  };
  return (
    <div className="stack-sm">
      <div className="row spread" style={{ flexWrap: "nowrap" }}>
        <div className="grow">
          <strong>Push notifications</strong>
          <div className="muted small">{label[state]}</div>
        </div>
        {(state === "off" || state === "on") && (
          <button type="button" className={`btn btn-sm ${state === "on" ? "btn-ghost" : ""}`} onClick={state === "on" ? disable : enable} disabled={pending}>
            {state === "on" ? "Turn off" : "Turn on"}
          </button>
        )}
      </div>
      {error && <p className="error small">{error}</p>}
    </div>
  );
}
