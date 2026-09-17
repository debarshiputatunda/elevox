import { StrictMode, type ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGLTF } from '@react-three/drei';
import { Mesh } from 'three';
import { Harness3DView } from '@/components/monitoring/harness/Harness3DView';

// No GPU in jsdom. Keep the real Three scene/clone/resources and React lifecycle.
vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@react-three/drei', async () => {
  const { Group, Mesh, BoxGeometry, MeshStandardMaterial, Texture } = await import('three');
  const scene = new Group();
  scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: new Texture() })));
  return {
    useGLTF: Object.assign(() => ({ scene }), { preload: vi.fn(), clear: vi.fn() }),
    Center: ({ children }: { children: ReactNode }) => <>{children}</>,
    Html: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    OrbitControls: () => null,
  };
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('does not invalidate shared textured resources during StrictMode or view remounts', () => {
  const scene = useGLTF('fixture').scene;
  const mesh = scene.children[0] as Mesh;
  const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const materialDispose = vi.spyOn(material, 'dispose');
  const props = { values: { buckle1: 0, buckle2: 0, buckle3: 0 },
    hookExceeded: { hookA: false, hookB: false }, lastUpdated: '',
    selectedMarker: null, onSelectMarker: () => {},
    setIndicatorRef: () => () => {}, onSceneUpdate: () => {} };
  const first = render(<StrictMode><Harness3DView {...props} /></StrictMode>);
  first.unmount();
  const second = render(<StrictMode><Harness3DView {...props} /></StrictMode>);
  second.unmount();
  expect(geometryDispose).not.toHaveBeenCalled();
  expect(materialDispose).not.toHaveBeenCalled();
  expect(useGLTF.clear).not.toHaveBeenCalled();
});
