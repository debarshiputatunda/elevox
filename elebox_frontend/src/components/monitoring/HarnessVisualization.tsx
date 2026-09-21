import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Fade,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
// import ImageIcon from '@mui/icons-material/Image';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import { BuckleInfoCard } from '@/components/monitoring/BuckleInfoCard';
import { HookInfoCard } from '@/components/monitoring/HookInfoCard';
// import { Harness2DView } from '@/components/monitoring/harness/Harness2DView';
import { HarnessCalibrationPanel } from '@/components/monitoring/harness/HarnessCalibrationPanel';
import {
  HARNESS_VIEW_SX,
  ENABLE_POINTER_CALIBRATION,
  HARNESS_SIDE_LAYOUT_MIN,
} from '@/components/monitoring/harness/harnessViewDimensions';
import { useBucklePositions } from '@/components/monitoring/harness/useBucklePositions';
import { useHarnessConnectors } from '@/components/monitoring/harness/useHarnessConnectors';
import { useIsMobile } from '@/hooks/useResponsive';
import {
  BUCKLE_CONFIG,
  HOOK_CONFIG,
  type BuckleKey,
  type HarnessPointerKey,
} from '@/constants/harnessBuckles';

const Harness3DView = lazy(() =>
  import('@/components/monitoring/harness/Harness3DView').then((mod) => ({
    default: mod.Harness3DView,
  })),
);

type HarnessViewMode = '2d' | '3d';

interface HarnessVisualizationProps {
  buckle1?: number;
  buckle2?: number;
  buckle3?: number;
  hookAValue?: number;
  hookBValue?: number;
  hookAThreshold?: number;
  hookBThreshold?: number;
  hookAInvalid?: boolean;
  hookBInvalid?: boolean;
  hookAExceeded?: boolean;
  hookBExceeded?: boolean;
  isOffline?: boolean;
  lastUpdated: string;
  batteryVoltage?: number;
}

const toolbarButtonSx = {
  px: 1.75,
  py: 0.65,
  fontWeight: 700,
  fontSize: '0.72rem',
  textTransform: 'none',
  gap: 0.75,
} as const;

const SIDE_BY_SIDE = `@container (min-width: ${HARNESS_SIDE_LAYOUT_MIN})`;

export const HarnessVisualization = ({
  buckle1,
  buckle2,
  buckle3,
  hookAValue,
  hookBValue,
  hookAThreshold,
  hookBThreshold,
  hookAInvalid = false,
  hookBInvalid = false,
  hookAExceeded = false,
  hookBExceeded = false,
  isOffline,
  lastUpdated,
  batteryVoltage,
}: HarnessVisualizationProps) => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<HarnessViewMode>('3d');
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<HarnessPointerKey | null>(null);
  const [activeCalibrationBuckle, setActiveCalibrationBuckle] = useState<BuckleKey | null>(null);

  const {
    // savedPositions,
    draftPositions,
    // updateDraftPosition,
    beginCalibration,
    cancelCalibration,
    saveCalibration,
    resetDraftToDefault,
  } = useBucklePositions();

  const configByKey = Object.fromEntries(BUCKLE_CONFIG.map((c) => [c.key, c])) as Record<
    BuckleKey,
    (typeof BUCKLE_CONFIG)[number]
  >;
  const hookConfigByKey = Object.fromEntries(HOOK_CONFIG.map((c) => [c.key, c])) as Record<
    (typeof HOOK_CONFIG)[number]['key'],
    (typeof HOOK_CONFIG)[number]
  >;

  const {
    containerRef,
    lines,
    // setHarnessBoundsRef,
    setIndicatorRef,
    setCardRef,
    compute,
    getLineColor,
    values,
  } = useHarnessConnectors({
    buckle1,
    buckle2,
    buckle3,
    isOffline,
    hookAInvalid,
    hookBInvalid,
    hookAExceeded,
    hookBExceeded,
  });

  const isCalibrating = ENABLE_POINTER_CALIBRATION && calibrationMode;

  const handleSelectMarker = useCallback((key: HarnessPointerKey) => {
    if (isCalibrating) return;
    setSelectedMarker((prev) => {
      if (isMobile) return prev === key ? null : key;
      return prev === key ? prev : key;
    });
  }, [isCalibrating, isMobile]);

  const handleViewChange = (_: React.MouseEvent<HTMLElement>, next: HarnessViewMode | null) => {
    if (!next) return;
    setViewMode(next);
  };

  const handleCalibrationToggle = () => {
    if (calibrationMode) {
      cancelCalibration();
      setCalibrationMode(false);
      setActiveCalibrationBuckle(null);
      return;
    }
    beginCalibration();
    setViewMode('2d');
    setCalibrationMode(true);
    setSelectedMarker(null);
    setActiveCalibrationBuckle(null);
  };

  const handleSaveCalibration = () => {
    saveCalibration();
    setCalibrationMode(false);
    setActiveCalibrationBuckle(null);
    compute();
  };

  const handleResetCalibration = () => {
    resetDraftToDefault();
    compute();
  };

  const handleCancelCalibration = () => {
    cancelCalibration();
    setCalibrationMode(false);
    setActiveCalibrationBuckle(null);
    compute();
  };

  useEffect(() => {
    if (isCalibrating || !selectedMarker) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-buckle-selectable]')) return;
      setSelectedMarker(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isCalibrating, selectedMarker]);

  useEffect(() => {
    if (viewMode !== '3d' && !isCalibrating) return undefined;
    let frame = 0;
    const tick = () => {
      compute();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [viewMode, isCalibrating, compute]);

  // const displayPositions = isCalibrating ? draftPositions : savedPositions;
  // const show2d = viewMode === '2d' || isCalibrating;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.25 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          size="small"
          aria-label="Harness view mode"
          color="primary"
          sx={{
            '& .MuiToggleButton-root': toolbarButtonSx,
            '& .Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark', color: 'primary.contrastText' },
            },
          }}
        >
          {/* 2D view disabled
          <ToggleButton value="2d" aria-label="2D harness view">
            <ImageIcon sx={{ fontSize: 17 }} />
            2D View
          </ToggleButton>
          */}
          <ToggleButton value="3d" aria-label="3D harness view">
            <ViewInArIcon sx={{ fontSize: 17 }} />
            3D View
          </ToggleButton>
        </ToggleButtonGroup>

        {ENABLE_POINTER_CALIBRATION && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <ToggleButton
              value="calibrate"
              selected={calibrationMode}
              onClick={handleCalibrationToggle}
              size="small"
              aria-label="Edit pointer positions"
              sx={{
                ...toolbarButtonSx,
                border: 'none',
                borderRadius: '8px !important',
                ...(calibrationMode
                  ? {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark' },
                      '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                    }
                  : {}),
              }}
            >
              <OpenWithIcon sx={{ fontSize: 17 }} />
              Edit Pointer Positions
            </ToggleButton>
          </>
        )}
      </Box>

      {ENABLE_POINTER_CALIBRATION && isCalibrating && (
        <HarnessCalibrationPanel
          activeBuckle={activeCalibrationBuckle}
          activePosition={activeCalibrationBuckle ? draftPositions[activeCalibrationBuckle] : null}
          draftPositions={draftPositions}
          configByKey={configByKey}
          onSave={handleSaveCalibration}
          onReset={handleResetCalibration}
          onCancel={handleCancelCalibration}
        />
      )}

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
          containerType: 'inline-size',
        }}
      >
        <Box
          component="svg"
          xmlns="http://www.w3.org/2000/svg"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
            zIndex: 5,
          }}
        >
          {(isMobile ? lines.filter((line) => line.key === selectedMarker) : lines).map((line) => (
            <path
              key={line.key}
              d={line.d}
              fill="none"
              stroke={getLineColor(line.key)}
              strokeWidth={selectedMarker === line.key ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              shapeRendering="geometricPrecision"
              style={{
                transition: 'stroke 0.4s ease, stroke-width 0.2s ease',
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'auto auto',
            alignItems: 'center',
            justifyItems: 'stretch',
            columnGap: 1,
            rowGap: 1,
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 1,
            ...(!isMobile && {
              [SIDE_BY_SIDE]: {
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 58%) minmax(0, 1fr)',
                gridTemplateRows: 'auto auto auto',
                columnGap: 0.75,
                rowGap: 0.75,
                py: 0.5,
                alignItems: 'center',
              },
            }),
          }}
        >
          <Box
            sx={{
              display: 'none',
              ...(!isMobile && {
                [SIDE_BY_SIDE]: {
                  display: 'flex',
                  gridColumn: 1,
                  gridRow: 1,
                  alignSelf: 'start',
                  justifyContent: 'flex-end',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                },
              }),
            }}
          >
            <Box ref={setCardRef('hookA', 'desktop')} sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
              <HookInfoCard
                config={hookConfigByKey.hookA}
                currentLoad={hookAValue}
                threshold={hookAThreshold}
                invalid={hookAInvalid}
                exceeded={hookAExceeded}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'hookA'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('hookA')}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'none',
              ...(!isMobile && {
                [SIDE_BY_SIDE]: {
                  display: 'flex',
                  gridColumn: 1,
                  gridRow: 3,
                  alignSelf: 'end',
                  justifyContent: 'flex-end',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                },
              }),
            }}
          >
            <Box ref={setCardRef('buckle3', 'desktop')} sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
              <BuckleInfoCard
                config={configByKey.buckle3}
                value={buckle3}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'buckle3'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('buckle3')}
              />
            </Box>
          </Box>

          <Box
            sx={{
              gridColumn: 1,
              gridRow: 1,
              justifySelf: 'center',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              position: 'relative',
              ...(!isMobile && {
                [SIDE_BY_SIDE]: {
                  gridColumn: 2,
                  gridRow: '1 / 4',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                },
              }),
            }}
          >
            <Fade in timeout={350} key="harness-3d">
              <Box>
                {/* 2D view disabled
                {show2d ? (
                  <Harness2DView
                    values={values}
                    positions={displayPositions}
                    isOffline={isOffline}
                    lastUpdated={lastUpdated}
                    batteryVoltage={batteryVoltage}
                    selectedBuckle={isCalibrating ? null : selectedBuckle}
                    onSelectBuckle={handleSelectBuckle}
                    setIndicatorRef={setIndicatorRef}
                    setHarnessBoundsRef={setHarnessBoundsRef}
                    onImageLoad={compute}
                    onBoundsChange={compute}
                    calibrationMode={isCalibrating}
                    onDragPosition={ENABLE_POINTER_CALIBRATION ? updateDraftPosition : undefined}
                    onDragStart={ENABLE_POINTER_CALIBRATION ? setActiveCalibrationBuckle : undefined}
                    onDragEnd={ENABLE_POINTER_CALIBRATION ? () => setActiveCalibrationBuckle((prev) => prev) : undefined}
                  />
                ) : (
                */}
                  <Suspense
                    fallback={
                      <Box
                        sx={{
                          ...HARNESS_VIEW_SX,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CircularProgress size={36} />
                      </Box>
                    }
                  >
                    <Harness3DView
                      values={values}
                      hookInvalid={{ hookA: hookAInvalid, hookB: hookBInvalid }}
                      hookExceeded={{ hookA: hookAExceeded, hookB: hookBExceeded }}
                      isOffline={isOffline}
                      lastUpdated={lastUpdated}
                      batteryVoltage={batteryVoltage}
                      selectedMarker={selectedMarker}
                      onSelectMarker={handleSelectMarker}
                      setIndicatorRef={setIndicatorRef}
                      onSceneUpdate={compute}
                    />
                  </Suspense>
                {/* )} */}
              </Box>
            </Fade>
          </Box>

          <Box
            sx={{
              display: 'none',
              ...(!isMobile && {
                [SIDE_BY_SIDE]: {
                  display: 'flex',
                  flexDirection: 'column',
                  gridColumn: 3,
                  gridRow: 2,
                  alignSelf: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                },
              }),
            }}
          >
            <Box ref={setCardRef('buckle2', 'desktop')} sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
              <BuckleInfoCard
                config={configByKey.buckle2}
                value={buckle2}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'buckle2'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('buckle2')}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'none',
              ...(!isMobile && {
                [SIDE_BY_SIDE]: {
                  display: 'flex',
                  flexDirection: 'column',
                  gridColumn: 3,
                  gridRow: 1,
                  alignSelf: 'start',
                  justifyContent: 'flex-start',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                },
              }),
            }}
          >
            <Box ref={setCardRef('hookB', 'desktop')} sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
              <HookInfoCard
                config={hookConfigByKey.hookB}
                currentLoad={hookBValue}
                threshold={hookBThreshold}
                invalid={hookBInvalid}
                exceeded={hookBExceeded}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'hookB'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('hookB')}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'none',
              ...(!isMobile && {
                [SIDE_BY_SIDE]: {
                  display: 'flex',
                  flexDirection: 'column',
                  gridColumn: 3,
                  gridRow: 3,
                  alignSelf: 'end',
                  justifyContent: 'flex-end',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                },
              }),
            }}
          >
            <Box ref={setCardRef('buckle1', 'desktop')} sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
              <BuckleInfoCard
                config={configByKey.buckle1}
                value={buckle1}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'buckle1'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('buckle1')}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: isMobile ? (selectedMarker ? 'flex' : 'none') : 'flex',
              flexDirection: 'column',
              gap: 1,
              gridColumn: 1,
              gridRow: 2,
              width: '100%',
              minWidth: 0,
              ...(!isMobile && {
                [SIDE_BY_SIDE]: { display: 'none' },
              }),
            }}
          >
            <Box
              ref={setCardRef('hookA', 'mobile')}
              sx={{ display: isMobile && selectedMarker !== 'hookA' ? 'none' : 'block' }}
            >
              <HookInfoCard
                config={hookConfigByKey.hookA}
                currentLoad={hookAValue}
                threshold={hookAThreshold}
                invalid={hookAInvalid}
                exceeded={hookAExceeded}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'hookA'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('hookA')}
              />
            </Box>
            <Box
              ref={setCardRef('hookB', 'mobile')}
              sx={{ display: isMobile && selectedMarker !== 'hookB' ? 'none' : 'block' }}
            >
              <HookInfoCard
                config={hookConfigByKey.hookB}
                currentLoad={hookBValue}
                threshold={hookBThreshold}
                invalid={hookBInvalid}
                exceeded={hookBExceeded}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'hookB'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('hookB')}
              />
            </Box>
            <Box
              ref={setCardRef('buckle2', 'mobile')}
              sx={{ display: isMobile && selectedMarker !== 'buckle2' ? 'none' : 'block' }}
            >
              <BuckleInfoCard
                config={configByKey.buckle2}
                value={buckle2}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'buckle2'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('buckle2')}
              />
            </Box>
            <Box
              ref={setCardRef('buckle1', 'mobile')}
              sx={{ display: isMobile && selectedMarker !== 'buckle1' ? 'none' : 'block' }}
            >
              <BuckleInfoCard
                config={configByKey.buckle1}
                value={buckle1}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'buckle1'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('buckle1')}
              />
            </Box>
            <Box
              ref={setCardRef('buckle3', 'mobile')}
              sx={{ display: isMobile && selectedMarker !== 'buckle3' ? 'none' : 'block' }}
            >
              <BuckleInfoCard
                config={configByKey.buckle3}
                value={buckle3}
                isOffline={isOffline}
                lastUpdated={lastUpdated}
                isSelected={!isCalibrating && selectedMarker === 'buckle3'}
                onSelect={isCalibrating ? undefined : () => handleSelectMarker('buckle3')}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
