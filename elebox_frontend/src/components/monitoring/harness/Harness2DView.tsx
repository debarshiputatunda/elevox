import { useRef } from 'react';
import { Box } from '@mui/material';
import harnessImage from '@/assets/harness-preview.png';
import { BuckleOverlayIndicator } from '@/components/monitoring/BuckleOverlayIndicator';
import { DraggableBuckleIndicator } from '@/components/monitoring/harness/DraggableBuckleIndicator';
import { HARNESS_VIEW_SX } from '@/components/monitoring/harness/harnessViewDimensions';
import { useContainedImageBounds } from '@/components/monitoring/harness/useContainedImageBounds';
import { toCssPosition, type BucklePositionsMap } from '@/constants/harnessBucklePositions';
import { BUCKLE_CONFIG, type BuckleKey } from '@/constants/harnessBuckles';

interface Harness2DViewProps {
  values: Record<BuckleKey, number | undefined>;
  positions: BucklePositionsMap;
  isOffline?: boolean;
  lastUpdated: string;
  batteryVoltage?: number;
  selectedBuckle: BuckleKey | null;
  onSelectBuckle: (key: BuckleKey) => void;
  setIndicatorRef: (key: BuckleKey) => (el: HTMLElement | null) => void;
  setHarnessBoundsRef?: (el: HTMLElement | null) => void;
  onImageLoad: () => void;
  onBoundsChange?: () => void;
  calibrationMode?: boolean;
  onDragPosition?: (key: BuckleKey, position: { x: number; y: number }) => void;
  onDragStart?: (key: BuckleKey) => void;
  onDragEnd?: () => void;
}

export const Harness2DView = ({
  values,
  positions,
  isOffline,
  lastUpdated,
  batteryVoltage,
  selectedBuckle,
  onSelectBuckle,
  setIndicatorRef,
  setHarnessBoundsRef,
  onImageLoad,
  onBoundsChange,
  calibrationMode = false,
  onDragPosition,
  onDragStart,
  onDragEnd,
}: Harness2DViewProps) => {
  const { containerRef, imageRef, bounds, updateBounds } = useContainedImageBounds();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const bindOverlayRef = (el: HTMLDivElement | null) => {
    overlayRef.current = el;
    setHarnessBoundsRef?.(el);
  };

  const handleImageLoad = () => {
    updateBounds();
    onImageLoad();
    onBoundsChange?.();
  };

  const handlePositionChange = () => {
    onImageLoad();
    onBoundsChange?.();
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        ...HARNESS_VIEW_SX,
        ...(calibrationMode ? { outline: '2px dashed', outlineColor: 'primary.main' } : {}),
      }}
    >
      <Box
        ref={imageRef}
        component="img"
        src={harnessImage}
        alt="Safety harness buckle layout"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          userSelect: 'none',
          pointerEvents: calibrationMode ? 'none' : 'auto',
        }}
        draggable={false}
        onLoad={handleImageLoad}
      />

      {bounds && (
        <Box
          ref={bindOverlayRef}
          sx={{
            position: 'absolute',
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height,
            pointerEvents: calibrationMode ? 'auto' : 'none',
          }}
        >
          {BUCKLE_CONFIG.map((config) => {
            const position = positions[config.key];
            const css = toCssPosition(position);

            if (calibrationMode && onDragPosition && onDragStart && onDragEnd) {
              return (
                <DraggableBuckleIndicator
                  key={config.key}
                  config={config}
                  position={position}
                  value={values[config.key]}
                  isOffline={isOffline}
                  lastUpdated={lastUpdated}
                  batteryVoltage={batteryVoltage}
                  overlayRef={overlayRef}
                  setIndicatorRef={setIndicatorRef}
                  onDrag={onDragPosition}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onPositionChange={handlePositionChange}
                />
              );
            }

            return (
              <Box
                key={config.key}
                ref={setIndicatorRef(config.key)}
                data-buckle-selectable
                sx={{
                  position: 'absolute',
                  left: css.left,
                  top: css.top,
                  width: 0,
                  height: 0,
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto',
                    transition: 'left 0.2s ease, top 0.2s ease',
                  }}
                >
                  <BuckleOverlayIndicator
                    config={config}
                    value={values[config.key]}
                    isOffline={isOffline}
                    lastUpdated={lastUpdated}
                    batteryVoltage={batteryVoltage}
                    isSelected={selectedBuckle === config.key}
                    onSelect={() => onSelectBuckle(config.key)}
                    variant="inline"
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
