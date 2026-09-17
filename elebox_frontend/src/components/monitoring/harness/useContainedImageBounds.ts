import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface ContainedImageBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const computeBounds = (
  container: HTMLElement,
  img: HTMLImageElement,
): ContainedImageBounds | null => {
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
  if (containerWidth === 0 || containerHeight === 0) return null;

  const naturalAspect = img.naturalWidth / img.naturalHeight;
  const containerAspect = containerWidth / containerHeight;

  if (naturalAspect > containerAspect) {
    const width = containerWidth;
    const height = containerWidth / naturalAspect;
    return {
      left: 0,
      top: (containerHeight - height) / 2,
      width,
      height,
    };
  }

  const height = containerHeight;
  const width = containerHeight * naturalAspect;
  return {
    left: (containerWidth - width) / 2,
    top: 0,
    width,
    height,
  };
};

export const useContainedImageBounds = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [bounds, setBounds] = useState<ContainedImageBounds | null>(null);

  const updateBounds = useCallback(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;
    const next = computeBounds(container, img);
    if (!next) return;

    setBounds((prev) => {
      if (
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    updateBounds();
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(() => updateBounds());
    observer.observe(container);
    window.addEventListener('resize', updateBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [updateBounds]);

  return { containerRef, imageRef, bounds, updateBounds };
};

export const pointerToImagePercent = (
  clientX: number,
  clientY: number,
  overlayEl: HTMLElement,
): { x: number; y: number } => {
  const rect = overlayEl.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
};
