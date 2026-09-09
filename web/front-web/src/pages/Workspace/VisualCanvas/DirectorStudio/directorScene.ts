/** Serializable previs data. The scene, not the Three.js objects, is the source of truth. */
export type DirectorVector3 = [number, number, number];
export type DirectorObjectKind = 'product' | 'actor' | 'box' | 'sphere' | 'cylinder';
export type DirectorPose = 'neutral' | 'wave' | 'walk';
export type DirectorAspectRatio = '16:9' | '9:16' | '1:1';

export interface DirectorObjectKeyframe {
  id: string;
  time: number;
  position: DirectorVector3;
  rotation: DirectorVector3;
  scale: DirectorVector3;
}

export interface DirectorObject {
  id: string;
  name: string;
  kind: DirectorObjectKind;
  position: DirectorVector3;
  /** Euler angles in degrees; world units are metres. */
  rotation: DirectorVector3;
  scale: DirectorVector3;
  color: string;
  visible: boolean;
  locked: boolean;
  pose: DirectorPose;
  keyframes: DirectorObjectKeyframe[];
}

export interface DirectorCameraKeyframe {
  id: string;
  time: number;
  position: DirectorVector3;
  target: DirectorVector3;
  fov: number;
}

export interface DirectorCamera {
  id: string;
  name: string;
  position: DirectorVector3;
  target: DirectorVector3;
  fov: number;
  keyframes: DirectorCameraKeyframe[];
}

export interface DirectorScene {
  version: 1;
  name: string;
  aspectRatio: DirectorAspectRatio;
  duration: number;
  background: string;
  floorColor: string;
  grid: boolean;
  objects: DirectorObject[];
  cameras: DirectorCamera[];
  activeCameraId: string;
}

export function createDirectorId(prefix = 'director'): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

const OBJECT_NAMES: Record<DirectorObjectKind, string> = {
  product: '产品瓶', actor: '角色', box: '方块', sphere: '球体', cylinder: '圆柱台',
};

export function createDirectorObject(kind: DirectorObjectKind, index = 1): DirectorObject {
  return {
    id: createDirectorId('object'), name: `${OBJECT_NAMES[kind]} ${index}`, kind,
    position: [0, kind === 'box' || kind === 'sphere' || kind === 'cylinder' ? 0.5 : 0, 0],
    rotation: [0, 0, 0], scale: [1, 1, 1],
    color: kind === 'product' ? '#3c8177' : kind === 'actor' ? '#bdc9ce' : '#bac3bd',
    visible: true, locked: false, pose: 'neutral', keyframes: [],
  };
}

export function createDirectorCamera(index = 1): DirectorCamera {
  return { id: createDirectorId('camera'), name: `机位 ${index}`, position: [4.8, 3, 6.5], target: [0, 1.05, 0], fov: 40, keyframes: [] };
}

export function createDirectorScene(): DirectorScene {
  const product = { ...createDirectorObject('product'), name: '主角 · 产品瓶', position: [0, 0.4, 0] as DirectorVector3 };
  const podium = { ...createDirectorObject('cylinder'), name: '圆形展台', position: [0, 0.2, 0] as DirectorVector3, scale: [1.65, 0.4, 1.65] as DirectorVector3, color: '#b2b7a9' };
  const actor = { ...createDirectorObject('actor'), name: '角色 · 比例参考', position: [1.6, 0, -0.3] as DirectorVector3, rotation: [0, -18, 0] as DirectorVector3, color: '#bcc6c8' };
  const camera = createDirectorCamera();
  const detailCamera = { ...createDirectorCamera(2), name: '机位 2 · 产品特写', position: [-0.9, 1.55, 3.5] as DirectorVector3, target: [0, 1.15, 0] as DirectorVector3, fov: 33 };
  return { version: 1, name: '产品摄影棚', aspectRatio: '16:9', duration: 6, background: '#151d21', floorColor: '#5b6662', grid: true, objects: [product, podium, actor], cameras: [camera, detailCamera], activeCameraId: camera.id };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const number = (value: unknown, fallback: number, min = -10000, max = 10000): number => typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const title = (value: unknown, fallback: string): string => typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : fallback;
const color = (value: unknown, fallback: string): string => typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value) ? value : fallback;
const vector = (value: unknown, fallback: DirectorVector3, min = -1000, max = 1000): DirectorVector3 => Array.isArray(value) ? [number(value[0], fallback[0], min, max), number(value[1], fallback[1], min, max), number(value[2], fallback[2], min, max)] : [...fallback];

/** Reject malformed/unbounded imported state without trusting arbitrary object prototypes or IDs. */
export function normalizeDirectorScene(value: unknown): DirectorScene {
  const raw = record(value);
  if (Object.keys(raw).length === 0) return createDirectorScene();
  const duration = number(raw.duration, 6, 1, 120);
  const usedIds = new Set<string>();
  const id = (value: unknown, prefix: string): string => {
    const candidate = typeof value === 'string' && /^[a-z\d_-]{1,100}$/i.test(value) ? value : '';
    const result = candidate && !usedIds.has(candidate) ? candidate : createDirectorId(prefix);
    usedIds.add(result);
    return result;
  };
  const frames = <T extends { time: number }>(items: T[]): T[] => {
    const unique = new Map<number, T>();
    items.forEach(item => unique.set(item.time, item));
    return [...unique.values()].sort((a, b) => a.time - b.time);
  };
  const objects = (Array.isArray(raw.objects) ? raw.objects : []).slice(0, 100).map((entry, index): DirectorObject => {
    const item = record(entry);
    const kind: DirectorObjectKind = ['product', 'actor', 'box', 'sphere', 'cylinder'].includes(String(item.kind)) ? item.kind as DirectorObjectKind : 'box';
    const base = createDirectorObject(kind, index + 1);
    const position = vector(item.position, base.position);
    const rotation = vector(item.rotation, base.rotation, -3600, 3600);
    const scale = vector(item.scale, base.scale, 0.02, 100);
    return {
      ...base, id: id(item.id, 'object'), name: title(item.name, base.name), position, rotation, scale,
      color: color(item.color, base.color), visible: item.visible !== false, locked: item.locked === true,
      pose: ['neutral', 'wave', 'walk'].includes(String(item.pose)) ? item.pose as DirectorPose : 'neutral',
      keyframes: frames((Array.isArray(item.keyframes) ? item.keyframes : []).slice(0, 240).map(entry => {
        const frame = record(entry);
        return { id: id(frame.id, 'key'), time: number(frame.time, 0, 0, duration), position: vector(frame.position, position), rotation: vector(frame.rotation, rotation, -3600, 3600), scale: vector(frame.scale, scale, 0.02, 100) };
      })),
    };
  });
  const cameras = (Array.isArray(raw.cameras) ? raw.cameras : []).slice(0, 16).map((entry, index): DirectorCamera => {
    const item = record(entry);
    const base = createDirectorCamera(index + 1);
    const position = vector(item.position, base.position);
    const target = vector(item.target, base.target);
    const fov = number(item.fov, base.fov, 15, 100);
    return { ...base, id: id(item.id, 'camera'), name: title(item.name, base.name), position, target, fov,
      keyframes: frames((Array.isArray(item.keyframes) ? item.keyframes : []).slice(0, 240).map(entry => {
        const frame = record(entry);
        return { id: id(frame.id, 'key'), time: number(frame.time, 0, 0, duration), position: vector(frame.position, position), target: vector(frame.target, target), fov: number(frame.fov, fov, 15, 100) };
      })),
    };
  });
  if (!cameras.length) cameras.push(createDirectorCamera());
  return { version: 1, name: title(raw.name, '产品摄影棚'), aspectRatio: ['16:9', '9:16', '1:1'].includes(String(raw.aspectRatio)) ? raw.aspectRatio as DirectorAspectRatio : '16:9', duration,
    background: color(raw.background, '#151d21'), floorColor: color(raw.floorColor, '#5b6662'), grid: raw.grid !== false,
    objects, cameras, activeCameraId: cameras.some(camera => camera.id === raw.activeCameraId) ? String(raw.activeCameraId) : cameras[0].id };
}

function segment<T extends { time: number }>(frames: T[], time: number): [T, T, number] | null {
  if (!frames.length) return null;
  if (time <= frames[0].time) return [frames[0], frames[0], 0];
  for (let index = 1; index < frames.length; index += 1) {
    if (time <= frames[index].time) {
      const a = frames[index - 1];
      const b = frames[index];
      return [a, b, clamp((time - a.time) / Math.max(b.time - a.time, 0.001), 0, 1)];
    }
  }
  return [frames[frames.length - 1], frames[frames.length - 1], 0];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpVector = (a: DirectorVector3, b: DirectorVector3, t: number): DirectorVector3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const lerpRotation = (a: DirectorVector3, b: DirectorVector3, t: number): DirectorVector3 => a.map((angle, i) => angle + (((b[i] - angle) % 360 + 540) % 360 - 180) * t) as DirectorVector3;

export function evaluateDirectorObject(object: DirectorObject, time: number): DirectorObject {
  const sampled = segment(object.keyframes, time);
  if (!sampled) return object;
  const [a, b, t] = sampled;
  return { ...object, position: lerpVector(a.position, b.position, t), rotation: lerpRotation(a.rotation, b.rotation, t), scale: lerpVector(a.scale, b.scale, t) };
}

export function evaluateDirectorCamera(camera: DirectorCamera, time: number): DirectorCamera {
  const sampled = segment(camera.keyframes, time);
  if (!sampled) return camera;
  const [a, b, t] = sampled;
  return { ...camera, position: lerpVector(a.position, b.position, t), target: lerpVector(a.target, b.target, t), fov: lerp(a.fov, b.fov, t) };
}

export function directorAspectValue(aspectRatio: DirectorAspectRatio): number {
  return aspectRatio === '9:16' ? 9 / 16 : aspectRatio === '1:1' ? 1 : 16 / 9;
}
