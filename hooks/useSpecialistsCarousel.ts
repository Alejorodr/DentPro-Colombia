"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface CarouselMetrics {
  width: number;
  gap: number;
  visible: number;
}

export function useSpecialistsCarousel(totalItems: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [metrics, setMetrics] = useState<CarouselMetrics>({ width: 0, gap: 0, visible: 1 });

  useEffect(() => {
    const updateMetrics = () => {
      if (!trackRef.current || !containerRef.current) return;
      const firstSlide = trackRef.current.querySelector<HTMLElement>("[data-slide]");
      if (!firstSlide) return;

      const style = window.getComputedStyle(trackRef.current);
      const gapValue = parseFloat(style.columnGap || style.gap || "0");
      const slideRect = firstSlide.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const visible = Math.max(1, Math.round((containerRect.width + gapValue) / (slideRect.width + gapValue)));

      setMetrics({ width: slideRect.width, gap: gapValue, visible });
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, [totalItems]);

  const maxIndex = useMemo(() => Math.max(0, totalItems - metrics.visible), [metrics.visible, totalItems]);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const goPrev = useCallback(() => setCurrentIndex((prev) => Math.max(prev - 1, 0)), []);
  const goNext = useCallback(() => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex)), [maxIndex]);

  const translateX = metrics.width ? -(currentIndex * (metrics.width + metrics.gap)) : 0;

  return {
    containerRef,
    trackRef,
    currentIndex,
    maxIndex,
    goPrev,
    goNext,
    translateX,
  };
}
