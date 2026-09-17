import { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import { BuckleOverlayIndicator } from '@/components/monitoring/BuckleOverlayIndicator';
import { pointerToImagePercent } from '@/components/monitoring/harness/useContainedImageBounds';
import { toCssPosition, type BucklePositionPercent } from '@/constants/harnessBucklePositions';
import type { BuckleConfig, BuckleKey } from '@/constants/harnessBuckles';

interface DraggableBuckleIndicatorProps {
  config: BuckleConfig;
  position: BucklePositionPercent;
  value?: number;
  isOffline?: boolean;
  lastUpdated: string;
  batteryVoltage?: number;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  setIndicatorRef: (key: BuckleKey) => (el: HTMLElement | null) => void;
  onDrag: (key: BuckleKey, position: BucklePositionPercent) => void;
  onDragStart: (key: BuckleKey) => void;
  onDragEnd: () => void;
  onPositionChange: () => void;
}

export const DraggableBuckleIndicator = ({
  config,
  position,
  value,
  isOffline,
  lastUpdated,
  batteryVoltage,
  overlayRef,
  setIndicatorRef,
  onDrag,
  onDragStart,
  onDragEnd,
  onPositionChange,
}: DraggableBuckleIndicatorProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const css = toCssPosition(position);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!overlayRef.current) return;
      const next = pointerToImagePercent(event.clientX, event.clientY, overlayRef.current);
      onDrag(config.key, next);
      onPositionChange();
    },
    [config.key, onDrag, onPositionChange, overlayRef],
  );

  const endDrag = useCallback(() => {
    setIsDragging(false);
    onDragEnd();
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  }, [handlePointerMove, onDragEnd]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    onDragStart(config.key);
    event.currentTarget.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    if (overlayRef.current) {
      const next = pointerToImagePercent(event.clientX, event.clientY, overlayRef.current);
      onDrag(config.key, next);
      onPositionChange();
    }
  };

  return (
    <Box
      ref={setIndicatorRef(config.key)}
      data-buckle-selectable
      sx={{
        position: 'absolute',
        left: css.left,
        top: css.top,
        width: 0,
        height: 0,
        zIndex: 4,
        transition: isDragging ? 'none' : 'left 0.15s ease, top 0.15s ease',
      }}
    >
      <Box
        onPointerDown={handlePointerDown}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
          cursor: 'move',
          touchAction: 'none',
        }}
      >
        <BuckleOverlayIndicator
          config={config}
          value={value}
          isOffline={isOffline}
          lastUpdated={lastUpdated}
          batteryVoltage={batteryVoltage}
          variant="inline"
          disableTooltip
        />
      </Box>
    </Box>
  );
};
