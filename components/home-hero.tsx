"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function HomeHero({
  children,
  navigation,
  footer,
}: {
  children: ReactNode;
  navigation: ReactNode;
  footer: ReactNode;
}) {
  const heroRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = heroRef.current;
      if (!hero) return;
      const distance = Math.max(hero.offsetHeight - window.innerHeight, 1);
      setProgress(
        Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / distance)),
      );
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    updatePreference();
    update();
    preference.addEventListener("change", updatePreference);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      preference.removeEventListener("change", updatePreference);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const fade = Math.min(1, Math.max(0, (progress - 0.6) / 0.4));

  return (
    <main className="relative isolate bg-paper">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-home bg-cover bg-center bg-no-repeat"
        style={{ opacity: reducedMotion ? (progress < 1 ? 1 : 0) : 1 - fade }}
      />

      <div className="relative z-50">{navigation}</div>

      <section ref={heroRef} className="relative min-h-home-scroll">
        <div className="sticky top-0 flex h-screen items-center justify-center px-6 text-center">
          <div
            className="w-full"
            style={{
              opacity: reducedMotion ? (progress < 1 ? 1 : 0) : 1 - fade,
            }}
          >
            {children}
          </div>
        </div>
      </section>
      <div className="relative min-h-screen bg-paper">{footer}</div>
    </main>
  );
}
