// 3D scene for Anatomy Viewer (ADR-004, C4 §3.2). Lazy-loaded via dynamic import() after first paint.
// Render policy: NEVER runs a continuous requestAnimationFrame loop (0 FPS at rest). Renders one frame per state
// change, view change, resize, or coalesced pointermove; Front/Back flip is a finite (<= 400 ms) transition
// that halts automatically or snaps in 1 frame under prefers-reduced-motion / survival mode.
import {
  CapsuleGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshLambertMaterial,
  PerspectiveCamera, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer, type BufferGeometry,
} from 'three';
import organs from '../../data/organs.json';
import { REGION_IDS, type RegionId, type RegionState } from '../../engine/types';

export interface Anchor { x: number; y: number; hidden: boolean }
export type Anchors = Record<RegionId, Anchor>;

export interface AvatarOptions { maxPixelRatio?: number; onContextLost?: () => void }

export interface Avatar {
  /** Renders ONE frame and returns projected screen coordinates for each hotspot overlay. */
  render(regions: Record<RegionId, RegionState>, selected: RegionId | null): Anchors;
  /** Performs raycast picking under pointer coordinates, or null if outside the mesh. */
  pick(clientX: number, clientY: number): RegionId | null;
  /** Sets yaw angle in radians for drag/keyboard inspection. */
  setYaw(yaw: number): void;
  get yaw(): number;
  /** Finite yaw transition to Front (0) or Back (pi); invokes onFrame per step and stops cleanly. */
  animateTo(target: number, onFrame: () => void): void;
  resize(): void;
  dispose(): void;
}

const ANCHORS = organs.regions as unknown as Record<RegionId, { anchor: [number, number, number] }>;

// Enforce ADR-004 invariant: at most ONE live WebGL context across the entire application.
let activeAvatar: Avatar | null = null;

function cssColor(el: Element, name: string, fallback: string): Color {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  try { return new Color(v || fallback); } catch { return new Color(fallback); }
}

function reducedMotionActive(): boolean {
  const root = globalThis.document?.documentElement;
  if (root?.hasAttribute('data-survival') || root?.hasAttribute('data-lowpower')) return true;
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function createAvatar(canvas: HTMLCanvasElement, opts: AvatarOptions = {}): Avatar {
  if (activeAvatar) {
    activeAvatar.dispose();
    activeAvatar = null;
  }

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5));

  const onLost = (e: Event) => {
    e.preventDefault();
    opts.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(0, 1.0, 4.1);
  camera.lookAt(0, 0.98, 0);
  scene.add(new HemisphereLight(0xdfe7f5, 0x0a0f1d, 1.1));
  const key = new DirectionalLight(0xffffff, 1.2);
  key.position.set(1.5, 3, 4);
  scene.add(key);

  const body = new Group();
  scene.add(body);

  const geometries: BufferGeometry[] = [];
  const materials = new Map<RegionId, MeshLambertMaterial>();
  const g = <T extends BufferGeometry>(x: T) => (geometries.push(x), x);

  for (const id of REGION_IDS) materials.set(id, new MeshLambertMaterial({ color: 0x334155 }));
  const add = (id: RegionId, geo: BufferGeometry, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], rotZ = 0) => {
    const m = new Mesh(geo, materials.get(id)!);
    m.position.set(...pos);
    m.scale.set(...scale);
    m.rotation.z = rotZ;
    m.userData.region = id;
    body.add(m);
  };

  // Lightweight procedural low-poly silhouette (zero external textures).
  add('head', g(new SphereGeometry(0.13, 16, 12)), [0, 1.62, 0], [1, 1.12, 1]);
  add('head', g(new CylinderGeometry(0.05, 0.06, 0.1, 10)), [0, 1.46, 0]);
  add('chest', g(new CapsuleGeometry(0.17, 0.26, 4, 12)), [0, 1.27, 0], [1.25, 1, 0.72]);
  add('lumbar', g(new CylinderGeometry(0.19, 0.17, 0.22, 14)), [0, 1.0, 0], [1, 1, 0.7]);
  const limb = g(new CapsuleGeometry(0.065, 0.62, 4, 10));
  add('legs', limb, [-0.095, 0.5, 0]);
  add('legs', limb, [0.095, 0.5, 0]);
  const arm = g(new CapsuleGeometry(0.05, 0.5, 4, 10));
  add('general', arm, [-0.3, 1.13, 0], [1, 1, 1], -0.12);
  add('general', arm, [0.3, 1.13, 0], [1, 1, 1], 0.12);

  let yaw = 0;
  let width = 0;
  let height = 0;
  let anim: number | null = null;
  let disposed = false;

  function resize() {
    if (disposed) return;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();

  const v = new Vector3();

  function render(regions: Record<RegionId, RegionState>, selected: RegionId | null): Anchors {
    if (disposed) return {} as Anchors;
    const root = document.documentElement;
    const colors = {
      nominal: cssColor(root, '--alert-green', '#10b981'),
      caution: cssColor(root, '--alert-yellow', '#f59e0b'),
      critical: cssColor(root, '--alert-red', '#ef4444'),
      none: cssColor(root, '--none', '#6b7280'),
      accent: cssColor(root, '--accent', '#38bdf8'),
    };
    const flat = root.hasAttribute('data-contrast');
    for (const id of REGION_IDS) {
      const st = regions[id]?.status ?? 'none';
      const mat = materials.get(id)!;
      const c = colors[st].clone().multiplyScalar(st === 'nominal' ? 0.55 : st === 'none' ? 0.5 : 0.95);
      if (selected === id) c.lerp(colors.accent, 0.35);
      mat.color.copy(c);
      mat.emissive.copy(flat ? c : new Color(0x000000));
    }
    body.rotation.y = yaw;
    body.updateMatrixWorld();
    renderer.render(scene, camera);

    const anchors = {} as Anchors;
    for (const id of REGION_IDS) {
      v.set(...ANCHORS[id].anchor).applyMatrix4(body.matrixWorld);
      const facing = Math.cos(yaw) * ANCHORS[id].anchor[2] - Math.sin(yaw) * ANCHORS[id].anchor[0];
      v.project(camera);
      anchors[id] = { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, hidden: facing < -0.03 };
    }
    return anchors;
  }

  const ray = new Raycaster();
  const ndc = new Vector2();
  function pick(clientX: number, clientY: number): RegionId | null {
    if (disposed) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    body.rotation.y = yaw;
    body.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(body.children, false)[0];
    return (hit?.object.userData.region as RegionId | undefined) ?? null;
  }

  const instance: Avatar = {
    render,
    pick,
    resize,
    setYaw(y: number) { yaw = y; },
    get yaw() { return yaw; },
    animateTo(target: number, onFrame: () => void) {
      if (disposed) return;
      if (anim !== null) {
        cancelAnimationFrame(anim);
        anim = null;
      }
      if (reducedMotionActive()) {
        yaw = target;
        onFrame();
        return;
      }
      const from = yaw;
      let delta = ((target - from + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      if (Math.abs(delta) < 0.001) {
        yaw = target;
        onFrame();
        return;
      }
      const t0 = performance.now();
      const step = (t: number) => {
        if (disposed) return;
        const k = Math.min(1, (t - t0) / 380);
        yaw = from + delta * (1 - (1 - k) ** 3);
        onFrame();
        anim = k < 1 ? requestAnimationFrame(step) : null;
      };
      anim = requestAnimationFrame(step);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (activeAvatar === instance) activeAvatar = null;
      if (anim !== null) {
        cancelAnimationFrame(anim);
        anim = null;
      }
      canvas.removeEventListener('webglcontextlost', onLost);
      for (const geo of new Set(geometries)) geo.dispose();
      for (const m of materials.values()) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };

  activeAvatar = instance;
  return instance;
}
