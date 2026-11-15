import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REGION_IDS, type RegionId, type RegionState } from '../src/engine/types';
import { REGION_HOTSPOT_SHORT, REGION_LABEL } from '../src/ui/bridge/uiState.svelte';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const rendererStats = {
  constructorOpts: [] as Array<Record<string, unknown>>,
  pixelRatios: [] as number[],
  renderCalls: 0,
  disposeCalls: 0,
  forceContextLossCalls: 0,
};

vi.mock('three', () => {
  class Vec2 {
    x = 0;
    y = 0;
    set(x: number, y: number) { this.x = x; this.y = y; return this; }
  }
  class Vec3 {
    x = 0;
    y = 0;
    z = 0;
    set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
    applyMatrix4() { return this; }
    project() { return this; }
  }
  class MockColor {
    r = 0;
    g = 0;
    b = 0;
    constructor(public value: unknown = 0) {}
    clone() { return new MockColor(this.value); }
    multiplyScalar() { return this; }
    lerp() { return this; }
    copy() { return this; }
  }
  class MockGeometry {
    dispose = vi.fn();
  }
  class MockMaterial {
    color = new MockColor();
    emissive = new MockColor();
    dispose = vi.fn();
  }
  class MockMesh {
    position = new Vec3();
    scale = new Vec3();
    rotation = { x: 0, y: 0, z: 0 };
    userData: Record<string, unknown> = {};
    constructor(public geometry: unknown, public material: unknown) {}
  }
  class MockGroup {
    rotation = { y: 0 };
    matrixWorld = {};
    children: MockMesh[] = [];
    add(child: MockMesh) { this.children.push(child); }
    updateMatrixWorld() {}
  }
  class MockScene {
    children: unknown[] = [];
    add(item: unknown) { this.children.push(item); }
  }
  class MockLight {
    position = new Vec3();
  }
  class MockCamera {
    aspect = 1;
    position = new Vec3();
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class MockRaycaster {
    setFromCamera() {}
    intersectObjects() { return []; }
  }
  class MockWebGLRenderer {
    constructor(opts: Record<string, unknown>) {
      rendererStats.constructorOpts.push(opts);
    }
    setPixelRatio(ratio: number) {
      rendererStats.pixelRatios.push(ratio);
    }
    setSize() {}
    render() {
      rendererStats.renderCalls += 1;
    }
    dispose() {
      rendererStats.disposeCalls += 1;
    }
    forceContextLoss() {
      rendererStats.forceContextLossCalls += 1;
    }
  }

  class MockCurve {
    constructor(..._args: unknown[]) {}
  }

  return {
    BoxGeometry: MockGeometry,
    CapsuleGeometry: MockGeometry,
    CircleGeometry: MockGeometry,
    Color: MockColor,
    CubicBezierCurve3: MockCurve,
    CylinderGeometry: MockGeometry,
    DirectionalLight: MockLight,
    Group: MockGroup,
    HemisphereLight: MockLight,
    Mesh: MockMesh,
    MeshBasicMaterial: MockMaterial,
    MeshLambertMaterial: MockMaterial,
    MeshStandardMaterial: MockMaterial,
    PerspectiveCamera: MockCamera,
    PlaneGeometry: MockGeometry,
    Raycaster: MockRaycaster,
    RingGeometry: MockGeometry,
    Scene: MockScene,
    SphereGeometry: MockGeometry,
    TorusGeometry: MockGeometry,
    TubeGeometry: MockGeometry,
    Vector2: Vec2,
    Vector3: Vec3,
    WebGLRenderer: MockWebGLRenderer,
  };
});

function sampleRegions(): Record<RegionId, RegionState> {
  return {
    head: { id: 'head', label: 'head', status: 'caution', alertCount: 1, topAlertId: 'a1', isSuspect: false },
    chest: { id: 'chest', label: 'chest', status: 'nominal', alertCount: 0, topAlertId: null, isSuspect: false },
    lumbar: { id: 'lumbar', label: 'lumbar', status: 'critical', alertCount: 1, topAlertId: 'a2', isSuspect: false },
    legs: { id: 'legs', label: 'legs', status: 'nominal', alertCount: 0, topAlertId: null, isSuspect: false },
    general: { id: 'general', label: 'general', status: 'nominal', alertCount: 0, topAlertId: null, isSuspect: true },
  };
}

describe('[UI-08] Hybrid AnatomyViewer (Three.js On-Demand, Hotspots & SVG Fallback)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).getComputedStyle;
    rendererStats.constructorOpts.length = 0;
    rendererStats.pixelRatios.length = 0;
    rendererStats.renderCalls = 0;
    rendererStats.disposeCalls = 0;
    rendererStats.forceContextLossCalls = 0;
  });

  it('exposes English region labels and NASA hotspot short tags for all 5 anatomical regions', () => {
    expect(Object.keys(REGION_LABEL).sort()).toEqual([...REGION_IDS].sort());
    expect(Object.keys(REGION_HOTSPOT_SHORT).sort()).toEqual([...REGION_IDS].sort());
    expect(REGION_HOTSPOT_SHORT.head).toBe('Eyes/SANS');
    expect(REGION_HOTSPOT_SHORT.chest).toBe('Thorax/HR');
    expect(REGION_HOTSPOT_SHORT.lumbar).toBe('Kidney/Ca');
    expect(REGION_HOTSPOT_SHORT.legs).toBe('Femur/ARED');
    expect(REGION_HOTSPOT_SHORT.general).toBe('Systemic');
  });

  it('enforces ADR-004 WebGL options, single active context, 0 FPS passive render, and context-lost fallback', async () => {
    const listeners = new Map<string, (e: Event) => void>();
    const attrs = new Set<string>(['data-survival']);
    (globalThis as Record<string, unknown>).document = {
      documentElement: {
        hasAttribute: (name: string) => attrs.has(name),
      },
    };
    (globalThis as Record<string, unknown>).getComputedStyle = () => ({
      getPropertyValue: () => '',
    });

    const canvas = {
      clientWidth: 320,
      clientHeight: 480,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 480 }),
      addEventListener: (ev: string, fn: (e: Event) => void) => listeners.set(ev, fn),
      removeEventListener: (ev: string) => listeners.delete(ev),
    } as unknown as HTMLCanvasElement;

    const { createAvatar } = await import('../src/ui/components/avatar3d');
    const onContextLost = vi.fn();
    const first = createAvatar(canvas, { maxPixelRatio: 1.5, onContextLost });

    expect(rendererStats.constructorOpts[0]).toMatchObject({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    expect(rendererStats.pixelRatios[0]).toBeLessThanOrEqual(1.5);
    expect(rendererStats.renderCalls).toBe(0);

    const anchors = first.render(sampleRegions(), 'head');
    expect(rendererStats.renderCalls).toBe(1);
    expect(Object.keys(anchors).sort()).toEqual([...REGION_IDS].sort());

    // Under data-survival / reduced-motion, animateTo snaps cleanly in 1 frame with zero RAF loop.
    let frameCount = 0;
    first.animateTo(Math.PI, () => { frameCount += 1; });
    expect(frameCount).toBe(1);
    expect(first.yaw).toBeCloseTo(Math.PI, 5);

    // Simulating webglcontextlost invokes preventDefault() and triggers automatic SVG fallback callback.
    const preventDefault = vi.fn();
    listeners.get('webglcontextlost')?.({ preventDefault } as unknown as Event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onContextLost).toHaveBeenCalledTimes(1);

    // Creating a second avatar automatically disposes the first context (single WebGL context invariant).
    createAvatar(canvas, { maxPixelRatio: 1.5 });
    expect(rendererStats.disposeCalls).toBe(1);
    expect(rendererStats.forceContextLossCalls).toBe(1);
  });

  it('implements lazy import(), 4 variants (full/compact/crisis/fallback), >=48px hotspots, and English UI', () => {
    const viewer = read('src/ui/components/AnatomyViewer.svelte');
    expect(viewer).toContain("import('./avatar3d')");
    expect(viewer).toContain('requestAnimationFrame');
    expect(viewer).toContain('webglcontextlost');
    expect(viewer).toContain("'full' | 'compact' | 'crisis' | 'fallback'");
    expect(viewer).toContain('details class="hotspot-bar"');
    expect(viewer).toContain('min-width: var(--touch)');
    expect(viewer).toContain('min-height: var(--touch)');
    expect(viewer).toContain('SVG fallback active');
    expect(viewer).not.toMatch(/Vista simplificada|Orientación del avatar|\bFrontal\b|\bPosterior\b/);

    const bodySvg = read('src/ui/components/BodySvg.svelte');
    expect(bodySvg).toContain('Anatomical silhouette');
    expect(bodySvg).toContain('REGION_HOTSPOT_SHORT');
    expect(bodySvg).toContain('min-width: var(--touch)');
    expect(bodySvg).toContain('min-height: var(--touch)');
    expect(bodySvg).not.toMatch(/Silueta anatómica|Cabeza|Tórax|Piernas|dato dudoso/);
  });

  it('wires AnatomyViewer Survival fallback variant cleanly in BiomedicalView and TriageView and enforces <= 1.5Hz pulse', () => {
    const bio = read('src/ui/views/BiomedicalView.svelte');
    expect(bio).toContain("variant={survival ? 'fallback' : 'full'}");

    const triage = read('src/ui/views/TriageView.svelte');
    expect(triage).toContain("variant={survival ? 'fallback' : open?.status === 'critical' ? 'crisis' : 'full'}");
    expect(triage).not.toContain('Girar vista');

    const tokens = read('src/ui/styles/tokens.css');
    expect(tokens).toContain('--pulse: astha-pulse 1.5s ease-in-out infinite;');
    expect(tokens).toContain('prefers-reduced-motion: reduce');
  });
});
