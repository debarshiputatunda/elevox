import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Canvas } from '@react-three/fiber';
import {
  Center,
  Html,
  OrbitControls,
  useGLTF,
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Box3, Mesh, Object3D, Vector3 } from 'three';
import harnessGlbUrl from '@/assets/3D_Harness.glb';
import { BuckleOverlayIndicator } from '@/components/monitoring/BuckleOverlayIndicator';
import { HARNESS_VIEW_SX } from '@/components/monitoring/harness/harnessViewDimensions';
import {
  BUCKLE_CONFIG,
  HOOK_CONFIG,
  getHookState,
  type BuckleKey,
  type HarnessPointerKey,
  type HookKey,
} from '@/constants/harnessBuckles';

const HARNESS_GLB = harnessGlbUrl;

type Vec3 = [number, number, number];

const toTuple = (v: Vector3): Vec3 => [v.x, v.y, v.z];

/**
 * After the model is centered, the hanging snap hooks are the leftmost and
 * rightmost geometry. Hardcoded Z sits on the harness body, so side view
 * misses the hooks — sample the actual mesh instead.
 */
const findHookAnchors = (root: Object3D): Record<HookKey, Vec3> | null => {
  const bounds = new Box3().setFromObject(root);
  if (bounds.isEmpty()) return null;

  const ySpan = bounds.max.y - bounds.min.y;
  const yLo = bounds.min.y + ySpan * 0.18;
  const yHi = bounds.min.y + ySpan * 0.82;

  let minX = Infinity;
  let maxX = -Infinity;
  const left = new Vector3();
  const right = new Vector3();
  const vertex = new Vector3();

  root.updateWorldMatrix(true, true);
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !child.geometry?.attributes.position) return;
    const positions = child.geometry.attributes.position;
    child.updateWorldMatrix(true, false);
    for (let i = 0; i < positions.count; i += 1) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld);
      if (vertex.y < yLo || vertex.y > yHi) continue;
      if (vertex.x < minX || (vertex.x === minX && vertex.z > left.z)) {
        minX = vertex.x;
        left.copy(vertex);
      }
      if (vertex.x > maxX || (vertex.x === maxX && vertex.z > right.z)) {
        maxX = vertex.x;
        right.copy(vertex);
      }
    }
  });

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;

  // Nudge slightly outward so the HTML marker sits on the hook surface.
  const nudge = 0.02;
  left.x -= nudge;
  right.x += nudge;

  return {
    hookA: toTuple(left),
    hookB: toTuple(right),
  };
};

interface HarnessModelProps {
  onLoaded?: () => void;
  onHookAnchors?: (anchors: Record<HookKey, Vec3>) => void;
}

const HarnessModel = ({ onLoaded, onHookAnchors }: HarnessModelProps) => {
  const { scene } = useGLTF(HARNESS_GLB);
  const model = useMemo(() => scene.clone(true), [scene]);
  const onLoadedRef = useRef(onLoaded);
  const onHookAnchorsRef = useRef(onHookAnchors);
  const didCenter = useRef(false);

  onLoadedRef.current = onLoaded;
  onHookAnchorsRef.current = onHookAnchors;

  const handleCentered = useCallback(({ container }: { container: Object3D }) => {
    if (didCenter.current) return;
    didCenter.current = true;
    const anchors = findHookAnchors(container);
    if (anchors) onHookAnchorsRef.current?.(anchors);
    onLoadedRef.current?.();
  }, []);

  return (
    <Center onCentered={handleCentered}>
      {/* clone(true) shares GLTF geometry/materials/textures. The loader cache
          owns them; view unmounts (including StrictMode) must not dispose them. */}
      <primitive object={model} dispose={null} />
    </Center>
  );
};

interface Pointer3DMarkerProps {
  position3d: [number, number, number];
  markerKey: HarnessPointerKey;
  label: string;
  value?: number;
  isOffline?: boolean;
  lastUpdated: string;
  batteryVoltage?: number;
  isSelected: boolean;
  onSelect: () => void;
  setIndicatorRef: (key: HarnessPointerKey) => (el: HTMLElement | null) => void;
}

const Pointer3DMarker = ({
  position3d,
  markerKey,
  label,
  value,
  isOffline,
  lastUpdated,
  batteryVoltage,
  isSelected,
  onSelect,
  setIndicatorRef,
}: Pointer3DMarkerProps) => (
  <Html
    position={position3d}
    center
    distanceFactor={2.4}
    zIndexRange={[100, 0]}
    style={{ pointerEvents: 'auto' }}
  >
    <Box
      ref={setIndicatorRef(markerKey)}
      data-buckle-selectable
      sx={{ display: 'inline-flex', lineHeight: 0 }}
    >
      <BuckleOverlayIndicator
        config={{ label }}
        value={value}
        isOffline={isOffline}
        lastUpdated={lastUpdated}
        batteryVoltage={batteryVoltage}
        isSelected={isSelected}
        onSelect={onSelect}
        variant="inline"
        size="compact"
      />
    </Box>
  </Html>
);

interface SceneProps {
  values: Record<BuckleKey, number | undefined>;
  hookInvalid?: Partial<Record<HookKey, boolean>>;
  hookExceeded: Record<HookKey, boolean>;
  isOffline?: boolean;
  lastUpdated: string;
  batteryVoltage?: number;
  selectedMarker: HarnessPointerKey | null;
  onSelectMarker: (key: HarnessPointerKey) => void;
  setIndicatorRef: (key: HarnessPointerKey) => (el: HTMLElement | null) => void;
  onControlsChange: () => void;
  onModelLoaded: () => void;
}

const Scene = ({
  values,
  hookInvalid,
  hookExceeded,
  isOffline,
  lastUpdated,
  batteryVoltage,
  selectedMarker,
  onSelectMarker,
  setIndicatorRef,
  onControlsChange,
  onModelLoaded,
}: SceneProps) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [hookAnchors, setHookAnchors] = useState<Record<HookKey, Vec3> | null>(null);
  const handleHookAnchors = useCallback((anchors: Record<HookKey, Vec3>) => {
    setHookAnchors((prev) => prev ?? anchors);
  }, []);

  useEffect(() => {
    if (!hookAnchors) return undefined;
    const frame = requestAnimationFrame(() => onControlsChange());
    return () => cancelAnimationFrame(frame);
  }, [hookAnchors, onControlsChange]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#f0f4ff', '#e8e8e8', 0.55]} />
      <directionalLight
        position={[4, 6, 5]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />

      <Suspense fallback={null}>
        <HarnessModel onLoaded={onModelLoaded} onHookAnchors={handleHookAnchors} />
      </Suspense>

      {BUCKLE_CONFIG.map((config) => (
        <Pointer3DMarker
          key={config.key}
          position3d={config.position3d}
          markerKey={config.key}
          label={config.label}
          value={values[config.key]}
          isOffline={isOffline}
          lastUpdated={lastUpdated}
          batteryVoltage={batteryVoltage}
          isSelected={selectedMarker === config.key}
          onSelect={() => onSelectMarker(config.key)}
          setIndicatorRef={setIndicatorRef}
        />
      ))}

      {HOOK_CONFIG.map((config) => {
        const state = getHookState(isOffline, hookExceeded[config.key], hookInvalid?.[config.key]);
        const value = state === 'offline' ? undefined : state === 'open' ? 1 : 0;
        return (
          <Pointer3DMarker
            key={config.key}
            position3d={hookAnchors?.[config.key] ?? config.position3d}
            markerKey={config.key}
            label={config.label}
            value={value}
            isOffline={isOffline}
            lastUpdated={lastUpdated}
            batteryVoltage={batteryVoltage}
            isSelected={selectedMarker === config.key}
            onSelect={() => onSelectMarker(config.key)}
            setIndicatorRef={setIndicatorRef}
          />
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={2.8}
        maxDistance={7}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI - 0.25}
        enablePan
        onChange={onControlsChange}
      />
    </>
  );
};

interface Harness3DViewProps {
  values: Record<BuckleKey, number | undefined>;
  hookInvalid?: Partial<Record<HookKey, boolean>>;
  hookExceeded: Record<HookKey, boolean>;
  isOffline?: boolean;
  lastUpdated: string;
  batteryVoltage?: number;
  selectedMarker: HarnessPointerKey | null;
  onSelectMarker: (key: HarnessPointerKey) => void;
  setIndicatorRef: (key: HarnessPointerKey) => (el: HTMLElement | null) => void;
  onSceneUpdate: () => void;
}

export const Harness3DView = ({
  values,
  hookInvalid,
  hookExceeded,
  isOffline,
  lastUpdated,
  batteryVoltage,
  selectedMarker,
  onSelectMarker,
  setIndicatorRef,
  onSceneUpdate,
}: Harness3DViewProps) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const handleModelLoaded = useCallback(() => {
    setIsModelLoaded(true);
    onSceneUpdate();
  }, [onSceneUpdate]);

  return (
    <Box
      sx={{
        ...HARNESS_VIEW_SX,
        '& > div': {
          position: 'absolute',
          inset: 0,
          width: '100% !important',
          height: '100% !important',
        },
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 0.15, 4.6], fov: 38, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f5f5f5', 1);
        }}
      >
        <Scene
          values={values}
          hookInvalid={hookInvalid}
          hookExceeded={hookExceeded}
          isOffline={isOffline}
          lastUpdated={lastUpdated}
          batteryVoltage={batteryVoltage}
          selectedMarker={selectedMarker}
          onSelectMarker={onSelectMarker}
          setIndicatorRef={setIndicatorRef}
          onControlsChange={onSceneUpdate}
          onModelLoaded={handleModelLoaded}
        />
      </Canvas>

      {!isModelLoaded && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(245, 245, 245, 0.85)',
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <CircularProgress size={36} />
        </Box>
      )}
    </Box>
  );
};

useGLTF.preload(HARNESS_GLB);
