"use client";

import { useEffect, useRef } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  stagger?: 1 | 2 | 3 | 4 | 5 | 6;
  delay?: number;
}

export function ScrollReveal({ children, className = "", stagger, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Immediately visible if already in viewport on mount
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 40) {
        el.classList.add("visible");
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );

    observer.observe(el);
    // Check immediately in case already visible
    check();

    return () => observer.disconnect();
  }, []);

  const staggerClass = stagger ? `stagger-${stagger}` : "";

  return (
    <div
      ref={ref}
      className={`reveal ${staggerClass} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
