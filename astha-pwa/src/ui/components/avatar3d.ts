// Escena 3D del Anatomy Viewer (ADR-004, C4 §3.2). Se carga con import() diferido tras el primer pintado.
// Política de render: NUNCA hay bucle. Un frame por cambio de estado, de vista o por pointermove agrupado;
// la transición Frontal/Posterior es una animación finita (≤ 400 ms) que se detiene sola.
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
  /** Dibuja UN frame y devuelve la posición en pantalla de cada hotspot. */
  render(regions: Record<RegionId, RegionState>, selected: RegionId | null): Anchors;
  /** Región del cuerpo bajo un punto de pantalla (coordenadas de cliente), o null si no toca el cuerpo. */
  pick(clientX: number, clientY: number): RegionId | null;
  /** Giro libre por arrastre (radianes). */
  setYaw(yaw: number): void;
  get yaw(): number;
  /** Transición finita a frontal (0) o posterior (π); llama a onFrame en cada paso y se detiene. */
  animateTo(target: number, onFrame: () => void): void;
  resize(): void;
  dispose(): void;
}

const ANCHORS = organs.regions as unknown as Record<RegionId, { anchor: [number, number, number] }>;

function cssColor(el: Element, name: string, fallback: string): Color {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  try { return new Color(v || fallback); } catch { return new Color(fallback); }
}

export function createAvatar(canvas: HTMLCanvasElement, opts: AvatarOptions = {}): Avatar {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5));

  const onLost = (e: Event) => { e.preventDefault(); opts.onContextLost?.(); };
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

  // Silueta procedural de bajo número de polígonos.
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

  function resize() {
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
      // Nominal tenue; precaución y crítico saturados; la región seleccionada, más clara.
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
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    body.rotation.y = yaw;
    body.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(body.children, false)[0];
    return (hit?.object.userData.region as RegionId | undefined) ?? null;
  }

  return {
    render,
    pick,
    resize,
    setYaw(y: number) { yaw = y; },
    get yaw() { return yaw; },
    animateTo(target: number, onFrame: () => void) {
      if (anim !== null) cancelAnimationFrame(anim);
      const from = yaw;
      // Camino más corto alrededor del círculo.
      let delta = ((target - from + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 380);
        yaw = from + delta * (1 - (1 - k) ** 3);
        onFrame();
        anim = k < 1 ? requestAnimationFrame(step) : null; // se detiene al llegar
      };
      anim = requestAnimationFrame(step);
    },
    dispose() {
      if (anim !== null) cancelAnimationFrame(anim);
      canvas.removeEventListener('webglcontextlost', onLost);
      for (const geo of new Set(geometries)) geo.dispose();
      for (const m of materials.values()) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
