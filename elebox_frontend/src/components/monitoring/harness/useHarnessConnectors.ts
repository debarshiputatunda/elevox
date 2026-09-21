import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  HARNESS_POINTER_KEYS,
  getBuckleState,
  getHookState,
  isHookKey,
  type BuckleKey,
  type BuckleState,
  type HarnessPointerKey,
} from '@/constants/harnessBuckles';

export interface ConnectorLine {
  key: HarnessPointerKey;
  d: string;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const PAD = 10;
const EPS = 2;

export const CONNECTOR_COLOR: Record<BuckleState, string> = {
  fastened: '#16a34a',
  open: '#dc2626',
  offline: '#94a3b8',
  unknown: '#94a3b8',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const segmentIntersectsRect = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Rect,
): boolean => {
  const pad = 6;
  const r = {
    left: rect.left - pad,
    right: rect.right + pad,
    top: rect.top - pad,
    bottom: rect.bottom + pad,
  };

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX < r.left || minX > r.right || maxY < r.top || minY > r.bottom) {
    return false;
  }

  if (Math.abs(y1 - y2) <= EPS) {
    const y = (y1 + y2) / 2;
    return y >= r.top && y <= r.bottom && maxX >= r.left && minX <= r.right;
  }

  if (Math.abs(x1 - x2) <= EPS) {
    const x = (x1 + x2) / 2;
    return x >= r.left && x <= r.right && maxY >= r.top && minY <= r.bottom;
  }

  return true;
};

const pathCrossesRect = (sx: number, sy: number, ex: number, ey: number, bend: 'hv' | 'vh', rect: Rect) => {
  if (bend === 'hv') {
    return (
      segmentIntersectsRect(sx, sy, ex, sy, rect) ||
      segmentIntersectsRect(ex, sy, ex, ey, rect)
    );
  }
  return (
    segmentIntersectsRect(sx, sy, sx, ey, rect) ||
    segmentIntersectsRect(sx, ey, ex, ey, rect)
  );
};

const getCardAnchor = (sx: number, sy: number, card: Rect): { ex: number; ey: number } => {
  const candidates = [
    { ex: card.left, ey: clamp(sy, card.top + PAD, card.bottom - PAD) },
    { ex: card.right, ey: clamp(sy, card.top + PAD, card.bottom - PAD) },
    { ex: clamp(sx, card.left + PAD, card.right - PAD), ey: card.top },
    { ex: clamp(sx, card.left + PAD, card.right - PAD), ey: card.bottom },
  ];

  return candidates.reduce(
    (best, candidate) => {
      const distance = Math.hypot(candidate.ex - sx, candidate.ey - sy);
      return distance < best.distance ? { point: candidate, distance } : best;
    },
    { point: candidates[0], distance: Number.POSITIVE_INFINITY },
  ).point;
};

const buildPath = (sx: number, sy: number, card: Rect, harness?: Rect | null): string => {
  const { ex, ey } = getCardAnchor(sx, sy, card);

  if (Math.abs(ex - sx) <= EPS && Math.abs(ey - sy) <= EPS) {
    return `M ${sx} ${sy}`;
  }

  if (Math.abs(ex - sx) <= EPS) {
    return `M ${sx} ${sy} L ${ex} ${ey}`;
  }

  if (Math.abs(ey - sy) <= EPS) {
    return `M ${sx} ${sy} L ${ex} ${ey}`;
  }

  const horizontalFirst = `M ${sx} ${sy} L ${ex} ${sy} L ${ex} ${ey}`;
  const verticalFirst = `M ${sx} ${sy} L ${sx} ${ey} L ${ex} ${ey}`;

  if (!harness) {
    return Math.abs(ex - sx) >= Math.abs(ey - sy) ? horizontalFirst : verticalFirst;
  }

  const hvCrosses = pathCrossesRect(sx, sy, ex, ey, 'hv', harness);
  const vvCrosses = pathCrossesRect(sx, sy, ex, ey, 'vh', harness);

  if (!hvCrosses) return horizontalFirst;
  if (!vvCrosses) return verticalFirst;

  const hvLength = Math.abs(ex - sx) + Math.abs(ey - sy);
  const vvLength = Math.abs(ey - sy) + Math.abs(ex - sx);
  return hvLength <= vvLength ? horizontalFirst : verticalFirst;
};

const isVisible = (el: HTMLElement | undefined | null): el is HTMLElement =>
  Boolean(el && el.getClientRects().length > 0);

const getIndicatorCenter = (
  indicator: HTMLElement,
  cRect: DOMRect,
): { sx: number; sy: number } => {
  const iRect = indicator.getBoundingClientRect();
  // Zero-size anchor elements sit exactly on the calibrated point.
  if (iRect.width === 0 && iRect.height === 0) {
    return {
      sx: iRect.left - cRect.left,
      sy: iRect.top - cRect.top,
    };
  }
  return {
    sx: iRect.left + iRect.width / 2 - cRect.left,
    sy: iRect.top + iRect.height / 2 - cRect.top,
  };
};

interface UseHarnessConnectorsOptions {
  buckle1?: number;
  buckle2?: number;
  buckle3?: number;
  isOffline?: boolean;
  hookAInvalid?: boolean;
  hookBInvalid?: boolean;
  hookAExceeded?: boolean;
  hookBExceeded?: boolean;
}

export const useHarnessConnectors = ({
  buckle1,
  buckle2,
  buckle3,
  isOffline,
  hookAInvalid = false,
  hookBInvalid = false,
  hookAExceeded = false,
  hookBExceeded = false,
}: UseHarnessConnectorsOptions) => {
  const values: Record<BuckleKey, number | undefined> = {
    buckle1,
    buckle2,
    buckle3,
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const harnessBoundsRef = useRef<HTMLElement | null>(null);
  const indicatorEls = useRef<Partial<Record<HarnessPointerKey, HTMLElement>>>({});
  const cardEls = useRef<Record<string, HTMLElement>>({});
  const observerRef = useRef<ResizeObserver | null>(null);
  const computeRef = useRef<() => void>(() => undefined);
  const [lines, setLines] = useState<ConnectorLine[]>([]);

  const setHarnessBoundsRef = useCallback((el: HTMLElement | null) => {
    const prev = harnessBoundsRef.current;
    harnessBoundsRef.current = el;
    if (observerRef.current) {
      if (prev) observerRef.current.unobserve(prev);
      if (el) observerRef.current.observe(el);
    }
  }, []);

  const setIndicatorRef = useCallback(
    (key: HarnessPointerKey) => (el: HTMLElement | null) => {
      const prev = indicatorEls.current[key];
      if (prev && observerRef.current) {
        observerRef.current.unobserve(prev);
      }
      if (el) {
        indicatorEls.current[key] = el;
        observerRef.current?.observe(el);
        requestAnimationFrame(() => computeRef.current());
      } else {
        delete indicatorEls.current[key];
      }
    },
    [],
  );

  const setCardRef = useCallback(
    (key: HarnessPointerKey, variant: 'desktop' | 'mobile') => (el: HTMLDivElement | null) => {
      if (el) cardEls.current[`${key}:${variant}`] = el;
    },
    [],
  );

  const compute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    let harnessRect: Rect | null = null;
    if (harnessBoundsRef.current) {
      const hRect = harnessBoundsRef.current.getBoundingClientRect();
      if (hRect.width > 0 && hRect.height > 0) {
        harnessRect = {
          left: hRect.left - cRect.left,
          right: hRect.right - cRect.left,
          top: hRect.top - cRect.top,
          bottom: hRect.bottom - cRect.top,
        };
      }
    }

    const next: ConnectorLine[] = [];
    for (const key of HARNESS_POINTER_KEYS) {
      const indicator = indicatorEls.current[key];
      const card =
        (isVisible(cardEls.current[`${key}:desktop`]) && cardEls.current[`${key}:desktop`]) ||
        (isVisible(cardEls.current[`${key}:mobile`]) && cardEls.current[`${key}:mobile`]) ||
        null;
      if (!isVisible(indicator) || !card) continue;

      const rRect = card.getBoundingClientRect();
      if (rRect.width === 0) continue;

      const { sx, sy } = getIndicatorCenter(indicator, cRect);
      const cardRect: Rect = {
        left: rRect.left - cRect.left,
        right: rRect.right - cRect.left,
        top: rRect.top - cRect.top,
        bottom: rRect.bottom - cRect.top,
      };
      next.push({ key, d: buildPath(sx, sy, cardRect, harnessRect) });
    }

    setLines((prev) => {
      if (
        prev.length === next.length &&
        prev.every((line, i) => line.key === next[i].key && line.d === next[i].d)
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  computeRef.current = compute;

  useLayoutEffect(() => {
    compute();
    const observer = new ResizeObserver(() => compute());
    observerRef.current = observer;
    if (containerRef.current) observer.observe(containerRef.current);
    if (harnessBoundsRef.current) observer.observe(harnessBoundsRef.current);
    Object.values(indicatorEls.current).forEach((el) => observer.observe(el));
    Object.values(cardEls.current).forEach((el) => observer.observe(el));

    window.addEventListener('resize', compute);
    return () => {
      observer.disconnect();
      observerRef.current = null;
      window.removeEventListener('resize', compute);
    };
  }, [compute]);

  useLayoutEffect(() => {
    compute();
    const frame = requestAnimationFrame(() => compute());
    return () => cancelAnimationFrame(frame);
  }, [compute, buckle1, buckle2, buckle3, isOffline, hookAExceeded, hookBExceeded]);

  const getLineColor = (key: HarnessPointerKey) => {
    if (isHookKey(key)) {
      const exceeded = key === 'hookA' ? hookAExceeded : hookBExceeded;
      return CONNECTOR_COLOR[getHookState(isOffline, exceeded, key === 'hookA' ? hookAInvalid : hookBInvalid)];
    }
    return CONNECTOR_COLOR[getBuckleState(values[key], isOffline)];
  };

  return {
    containerRef,
    lines,
    setHarnessBoundsRef,
    setIndicatorRef,
    setCardRef,
    compute,
    getLineColor,
    values,
  };
};
