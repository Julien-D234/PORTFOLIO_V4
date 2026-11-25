"use client";

import { useEffect, useRef } from "react";
import { gameModules } from "@/games";
import type { Messages } from "@/i18n/dictionaries";

export function GameLauncher({
  kind,
  url,
  module,
  token,
  labels,
}: {
  kind: string;
  url: string | null;
  module: string | null;
  token: string;
  labels: Messages["games"];
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (kind !== "iframe" || !url) return;
    let origin = "*";
    try {
      origin = new URL(url).origin;
    } catch {
      return;
    }
    const el = iframeRef.current;
    const onLoad = () => {
      el?.contentWindow?.postMessage({ type: "game-token", token }, origin);
    };
    el?.addEventListener("load", onLoad);
    return () => el?.removeEventListener("load", onLoad);
  }, [kind, url, token]);

  if (kind === "iframe" && url) {
    return (
      <iframe
        ref={iframeRef}
        src={url}
        title="game"
        sandbox="allow-scripts"
        className="h-[70dvh] w-full rounded-(--r) border-2 border-(--ink) bg-black"
      />
    );
  }
  if (kind === "internal" && module) {
    const Mod = gameModules[module];
    if (!Mod) {
      return (
        <p className="text-14px" style={{ color: "var(--bad)" }}>
          {labels.moduleMissing}
        </p>
      );
    }
    return (
      <div className="rounded-(--r) border-2 border-(--ink) bg-(--card) p-4 shadow-[4px_4px_0_var(--shadow-c)]">
        <Mod token={token} />
      </div>
    );
  }
  return (
    <p className="text-14px" style={{ color: "var(--bad)" }}>
      {labels.moduleMissing}
    </p>
  );
}
