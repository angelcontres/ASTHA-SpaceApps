// 3D NASA EVA Astronaut scene for Anatomy Viewer (ADR-004, C4 §3.2). Lazy-loaded via dynamic import().
// Render policy: NEVER runs a continuous requestAnimationFrame loop (0 FPS at rest). Renders one frame per state
// change, view change, resize, or coalesced pointermove; Front/Back flip is a finite (<= 400 ms) transition
// that halts automatically or snaps in 1 frame under prefers-reduced-motion / survival mode.
import {
  BoxGeometry, type BufferGeometry, CircleGeometry, Color, CubicBezierCurve3, CylinderGeometry,
  DirectionalLight, Group, HemisphereLight, type Material, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Raycaster, RingGeometry, Scene, SphereGeometry,
  TorusGeometry, TubeGeometry, Vector2, Vector3, WebGLRenderer,
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
  camera.position.set(0, 0.96, 4.35);
  camera.lookAt(0, 0.94, 0);
  scene.add(new HemisphereLight(0xeef6ff, 0x10203a, 1.35));
  const key = new DirectionalLight(0xffffff, 1.45);
  key.position.set(1.8, 3.2, 4.2);
  scene.add(key);
  const rim = new DirectionalLight(0x38bdf8, 1.15);
  rim.position.set(-2.4, 2.2, -3.2);
  scene.add(rim);

  const body = new Group();
  scene.add(body);

  const geometries: BufferGeometry[] = [];
  const extraMaterials: Material[] = [];
  const materials = new Map<RegionId, MeshLambertMaterial>();
  const g = <T extends BufferGeometry>(x: T) => (geometries.push(x), x);
  const tm = <T extends Material>(x: T) => (extraMaterials.push(x), x);

  for (const id of REGION_IDS) materials.set(id, new MeshLambertMaterial({ color: 0x334155 }));

  // Prototype index.html proportions normalized to organs.json space (y ~ 0.00 boots .. 1.83 helmet).
  const S = 0.28;
  const Y0 = 0.95;
  const addMesh = (
    region: RegionId | null,
    geo: BufferGeometry,
    mat: Material,
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    const m = new Mesh(geo, mat);
    m.position.set(pos[0] * S, pos[1] * S + Y0, pos[2] * S);
    m.rotation.x = rot[0];
    m.rotation.y = rot[1];
    m.rotation.z = rot[2];
    m.scale.set(scale[0] * S, scale[1] * S, scale[2] * S);
    if (region) m.userData.region = region;
    body.add(m);
    return m;
  };

  // Shared EVA suit materials (low metalness without PMREM so visor & pearl shell glow vividly).
  const matSuitWhite = tm(new MeshStandardMaterial({ color: 0xf1f5f9, emissive: 0x1e293b, roughness: 0.42, metalness: 0.08 }));
  const matSuitTrim = tm(new MeshStandardMaterial({ color: 0x2563eb, emissive: 0x0f2557, roughness: 0.34, metalness: 0.22 }));
  const matSuitGold = tm(new MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e }));
  const matSuitDark = tm(new MeshStandardMaterial({ color: 0x0f254a, roughness: 0.52, metalness: 0.18 }));
  const matPlssPack = tm(new MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0x1e293b, roughness: 0.42, metalness: 0.15 }));
  const matTank = tm(new MeshLambertMaterial({ color: 0x38bdf8, emissive: 0x0369a1 }));
  const matHelmetGlass = tm(new MeshLambertMaterial({
    color: 0xe0f2fe, emissive: 0x38bdf8, transparent: true, opacity: 0.26, depthWrite: false,
  }));
  const matVisorGold = tm(new MeshLambertMaterial({
    color: 0xf59e0b, emissive: 0xb45309, transparent: true, opacity: 0.84, depthWrite: false,
  }));
  const matRingOuter = tm(new MeshBasicMaterial({ color: 0xfacc15 }));
  const matRingInner = tm(new MeshBasicMaterial({ color: 0x38bdf8 }));
  const matSweep = tm(new MeshBasicMaterial({ color: 0x79a7df, transparent: true, opacity: 0.65 }));
  const matLungs = tm(new MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.55 }));
  const matLensGlow = tm(new MeshBasicMaterial({ color: 0xd8e8fc }));

  // 1. Cybernetic turntable base platform (non-clickable floor framing).
  addMesh(null, g(new CylinderGeometry(2.15, 2.35, 0.1, 36)), matSuitDark, [0, -3.38, 0]);
  addMesh(null, g(new RingGeometry(2.05, 2.11, 48)), matRingOuter, [0, -3.32, 0], [-Math.PI / 2, 0, 0]);
  addMesh(null, g(new RingGeometry(1.32, 1.36, 36)), matRingInner, [0, -3.32, 0], [-Math.PI / 2, 0, 0]);
  addMesh(null, g(new PlaneGeometry(0.04, 1.95)), matSweep, [0, -3.31, 0.95], [-Math.PI / 2, 0, 0]);

  // 2. EVA Legs, lunar boots, patella seals, and femoral bio-cores ('legs').
  const bootBaseGeo = g(new BoxGeometry(0.32, 0.16, 0.6));
  const bootUpperGeo = g(new CylinderGeometry(0.16, 0.2, 0.22, 12));
  const ankleRingGeo = g(new TorusGeometry(0.18, 0.032, 8, 16));
  const shinBioGeo = g(new CylinderGeometry(0.165, 0.195, 1.24, 14));
  const shinGuardGeo = g(new BoxGeometry(0.24, 0.84, 0.14));
  const kneeCapGeo = g(new SphereGeometry(0.185, 12, 12));
  const kneeRingGeo = g(new TorusGeometry(0.195, 0.028, 8, 16));
  const thighBioGeo = g(new CylinderGeometry(0.225, 0.17, 1.24, 14));
  const thighBandGeo = g(new TorusGeometry(0.222, 0.026, 8, 16));
  const legMat = materials.get('legs')!;
  for (const x of [-0.38, 0.38] as const) {
    addMesh('legs', bootBaseGeo, matSuitDark, [x, -3.28, 0.1]);
    addMesh('legs', bootUpperGeo, matSuitWhite, [x, -3.10, 0.04]);
    addMesh('legs', ankleRingGeo, matSuitTrim, [x, -2.96, 0], [Math.PI / 2, 0, 0]);
    addMesh('legs', shinBioGeo, legMat, [x, -2.28, 0]);
    addMesh('legs', shinGuardGeo, matSuitWhite, [x, -2.30, 0.13]);
    addMesh('legs', kneeCapGeo, matSuitTrim, [x, -1.60, 0.08]);
    addMesh('legs', kneeRingGeo, matSuitGold, [x, -1.60, 0], [Math.PI / 2, 0, 0]);
    addMesh('legs', thighBioGeo, legMat, [x, -0.94, 0]);
    addMesh('legs', thighBandGeo, matSuitDark, [x, -0.92, 0], [Math.PI / 2, 0, 0]);
  }

  // 3. Pelvis girdle, utility belt, abdomen core, and bilateral dorsal kidneys ('lumbar').
  const lumbarMat = materials.get('lumbar')!;
  addMesh('lumbar', g(new CylinderGeometry(0.52, 0.44, 0.44, 16)), matSuitWhite, [0, -0.18, 0]);
  addMesh('lumbar', g(new TorusGeometry(0.51, 0.048, 8, 24)), matSuitDark, [0, 0.02, 0], [Math.PI / 2, 0, 0]);
  addMesh('lumbar', g(new BoxGeometry(0.14, 0.18, 0.12)), matSuitTrim, [0.53, 0.02, 0]);
  addMesh('lumbar', g(new CylinderGeometry(0.49, 0.53, 0.66, 16)), lumbarMat, [0, 0.38, 0]);
  const kidneyGeo = g(new SphereGeometry(0.14, 10, 10));
  addMesh('lumbar', kidneyGeo, lumbarMat, [-0.21, 0.36, -0.46], [0, 0, 0], [0.85, 1.25, 0.72]);
  addMesh('lumbar', kidneyGeo, lumbarMat, [0.21, 0.36, -0.46], [0, 0, 0], [0.85, 1.25, 0.72]);

  // 4. V-Taper Chest Carapace, Pectoral Armor, Sternum Beacon, Wireframe Lungs & NASA PLSS ('chest').
  const chestMat = materials.get('chest')!;
  addMesh('chest', g(new CylinderGeometry(0.66, 0.48, 1.06, 18)), chestMat, [0, 1.25, 0]);
  const pecGeo = g(new BoxGeometry(0.26, 0.36, 0.11));
  addMesh('chest', pecGeo, matSuitWhite, [-0.22, 1.40, 0.48], [0, 0.16, 0]);
  addMesh('chest', pecGeo, matSuitWhite, [0.22, 1.40, 0.48], [0, -0.16, 0]);
  addMesh('chest', g(new TorusGeometry(0.645, 0.028, 8, 24)), matSuitDark, [0, 1.54, 0], [Math.PI / 2, 0, 0]);
  addMesh('chest', g(new TorusGeometry(0.545, 0.028, 8, 24)), matSuitDark, [0, 1.00, 0], [Math.PI / 2, 0, 0]);
  // Translucent wireframe thoracic lung overlay + protruding sternum telemetry beacon
  addMesh('chest', g(new SphereGeometry(0.28, 10, 10)), matLungs, [-0.20, 1.28, 0.16], [0, 0, 0], [0.88, 1.22, 0.65]);
  addMesh('chest', g(new SphereGeometry(0.28, 10, 10)), matLungs, [0.20, 1.28, 0.16], [0, 0, 0], [0.88, 1.22, 0.65]);
  addMesh('chest', g(new CylinderGeometry(0.10, 0.10, 0.06, 12)), chestMat, [0, 1.42, 0.56], [Math.PI / 2, 0, 0]);
  addMesh('chest', g(new TorusGeometry(0.115, 0.018, 8, 16)), matSuitGold, [0, 1.42, 0.56]);

  // Aerodynamic NASA PLSS Backpack + dual cyan O2 tanks + comms antenna + umbilical coolant hose
  addMesh('chest', g(new BoxGeometry(0.84, 1.24, 0.32)), matPlssPack, [0, 1.28, -0.44]);
  addMesh('chest', g(new BoxGeometry(0.64, 0.22, 0.08)), matSuitDark, [0, 1.56, -0.60]);
  const tankGeo = g(new CylinderGeometry(0.105, 0.105, 0.92, 12));
  const capGeo = g(new SphereGeometry(0.105, 8, 8));
  for (const tx of [-0.22, 0.22] as const) {
    addMesh('chest', tankGeo, matTank, [tx, 1.28, -0.63]);
    addMesh('chest', capGeo, matTank, [tx, 1.74, -0.63]);
    addMesh('chest', capGeo, matTank, [tx, 0.82, -0.63]);
  }
  addMesh('chest', g(new CylinderGeometry(0.018, 0.018, 0.44, 6)), matSuitTrim, [0.28, 2.04, -0.52]);
  const hoseCurve = new CubicBezierCurve3(
    new Vector3(-0.38 * S, 0.85 * S + Y0, -0.45 * S),
    new Vector3(-0.65 * S, 0.50 * S + Y0, -0.40 * S),
    new Vector3(-0.62 * S, 0.15 * S + Y0, -0.20 * S),
    new Vector3(-0.48 * S, 0.02 * S + Y0, 0.05 * S),
  );
  const hoseMesh = new Mesh(g(new TubeGeometry(hoseCurve, 18, 0.036 * S, 8, false)), matSuitDark);
  hoseMesh.userData.region = 'chest';
  body.add(hoseMesh);

  // 5. Shoulders, Articulated EVA Arms, Gloves & Left Wrist Clinical Cuff ('general').
  const generalMat = materials.get('general')!;
  const shoulderGeo = g(new SphereGeometry(0.22, 14, 14));
  const deltoidGeo = g(new TorusGeometry(0.20, 0.03, 8, 16));
  const bicepGeo = g(new CylinderGeometry(0.13, 0.12, 0.74, 12));
  const elbowGeo = g(new SphereGeometry(0.135, 10, 10));
  const forearmGeo = g(new CylinderGeometry(0.12, 0.09, 0.68, 12));
  const palmGeo = g(new BoxGeometry(0.11, 0.17, 0.12));
  for (const x of [-0.82, 0.82] as const) {
    const dir = x > 0 ? -1 : 1;
    addMesh('general', shoulderGeo, matSuitWhite, [x, 1.74, 0]);
    addMesh('general', deltoidGeo, matSuitTrim, [x * 1.06, 1.74, 0], [0, Math.PI / 2, 0]);
    addMesh('general', bicepGeo, generalMat, [x * 1.06, 1.25, 0.02], [0, 0, dir * 0.08]);
    addMesh('general', elbowGeo, matSuitDark, [x * 1.10, 0.78, 0.02]);
    addMesh('general', forearmGeo, generalMat, [x * 1.12, 0.35, 0.03], [0, 0, dir * 0.06]);
    addMesh('general', palmGeo, matSuitDark, [x * 1.14, -0.07, 0.03]);
  }
  // Left wrist medical display housing + status-reactive screen
  addMesh('general', g(new BoxGeometry(0.15, 0.2, 0.06)), matSuitDark, [-0.96, 0.35, 0.12]);
  addMesh('general', g(new PlaneGeometry(0.11, 0.15)), generalMat, [-0.96, 0.35, 0.16]);

  // 6. Neck Seal, Spherical Helmet Dome, Gold Reflective Visor, Temple Lights & Inner Neuro Head ('head').
  const headMat = materials.get('head')!;
  addMesh('head', g(new CylinderGeometry(0.24, 0.28, 0.32, 14)), matSuitDark, [0, 2.04, 0]);
  addMesh('head', g(new TorusGeometry(0.32, 0.048, 8, 24)), matSuitTrim, [0, 2.14, 0], [Math.PI / 2, 0, 0]);
  // Inner neuro-ocular head core visible behind visor + glowing eye nodes
  addMesh('head', g(new SphereGeometry(0.32, 16, 14)), headMat, [0, 2.63, -0.01], [0, 0, 0], [0.9, 1.06, 0.92]);
  const eyeGeo = g(new SphereGeometry(0.055, 8, 8));
  addMesh('head', eyeGeo, headMat, [-0.11, 2.66, 0.28]);
  addMesh('head', eyeGeo, headMat, [0.11, 2.66, 0.28]);
  // Temple task lamps
  const podGeo = g(new CylinderGeometry(0.045, 0.045, 0.13, 8));
  const lensGeo = g(new CircleGeometry(0.04, 8));
  for (const hx of [-0.45, 0.45] as const) {
    addMesh('head', podGeo, matSuitTrim, [hx, 2.72, 0.08], [0, 0, Math.PI / 2]);
    addMesh('head', lensGeo, matLensGlow, [hx * 1.15, 2.72, 0.08], [0, hx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]);
  }
  // Translucent helmet bubble & front-centered gold solar visor (phi = PI/2 faces +Z).
  addMesh('head', g(new SphereGeometry(0.49, 24, 24)), matHelmetGlass, [0, 2.65, 0.02], [0, 0, 0], [0.95, 1.06, 0.99]);
  addMesh(
    'head',
    g(new SphereGeometry(0.468, 24, 20, Math.PI * 0.14, Math.PI * 0.72, 0.58, 1.18)),
    matVisorGold,
    [0, 2.65, 0.04],
    [0, 0, 0],
    [0.95, 1.02, 1.02],
  );

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
      const c = colors[st].clone().multiplyScalar(st === 'nominal' ? 0.65 : st === 'none' ? 0.5 : 0.98);
      if (selected === id) c.lerp(colors.accent, 0.38);
      mat.color.copy(c);
      const glow = flat ? 1 : st === 'caution' || st === 'critical' ? 0.42 : selected === id ? 0.25 : 0.12;
      mat.emissive.copy(c).multiplyScalar(glow);
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
      for (const m of extraMaterials) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };

  activeAvatar = instance;
  return instance;
}
