"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Messages } from "@/i18n/dictionaries";
import type { PublicProjectSummary } from "@/server/projects/public";

const SCROLL_MS = 1400;

export function ProjectsDeck({
  lang,
  projects,
  labels,
}: {
  lang: string;
  projects: PublicProjectSummary[];
  labels: Messages["projects"];
}) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const animating = useRef(false);
  const reduced = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const goTo = useCallback(
    (i: number) => {
      if (animating.current) return;
      const cur = indexRef.current;
      if (i === cur || i < 0 || i >= projects.length) return;
      animating.current = true;
      indexRef.current = i;
      setIndex(i);
      window.setTimeout(() => {
        animating.current = false;
      }, reduced ? 0 : SCROLL_MS);
    },
    [projects.length, reduced],
  );

  useEffect(() => {
    let acc = 0;
    let timer: number | undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        acc = 0;
      }, 200);
      if (Math.abs(acc) > 40) {
        goTo(indexRef.current + (acc > 0 ? 1 : -1));
        acc = 0;
      }
    };
    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY == null) return;
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) goTo(indexRef.current + (dy > 0 ? 1 : -1));
      touchY = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goTo(indexRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(indexRef.current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(projects.length - 1);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [goTo, projects.length]);

  if (projects.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p style={{ color: "var(--mut)" }}>{labels.empty}</p>
      </div>
    );
  }

  return (
    <section className="deck" aria-label={labels.title}>
      <div className="deck-track" style={{ transform: `translateY(-${index * 100}dvh)` }}>
        {projects.map((p) => (
          <article key={p.id} className="deck-slide">
            {p.cover ? (
              <div className="duo absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.cover.url} alt={p.coverAlt ?? ""} />
              </div>
            ) : null}
            <div className="deck-veil" />
            <div className="deck-content">
              <div className="deck-tags">
                {p.tags.map((t) => (
                  <span key={t} className="tag deck-tag">
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="deck-title">{p.title}</h2>
              <p className="deck-summary">{p.summary}</p>
              <Link className="btn" href={`/${lang}/projects/${p.slug}`}>
                {labels.viewProject} →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="deck-dots">
        {projects.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="deck-dot"
            aria-current={i === index ? "true" : "false"}
            aria-label={p.title}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
      <div className="deck-hint" style={{ opacity: index === 0 ? 1 : 0 }}>
        {labels.scrollHint} ↓
      </div>
    </section>
  );
}
