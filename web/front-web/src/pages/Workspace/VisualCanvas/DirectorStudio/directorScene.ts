/** Serializable previs data. The scene, not the Three.js objects, is the source of truth. */
export type DirectorVector3 = [number, number, number];
export type DirectorObjectKind = 'product' | 'actor' | 'box' | 'sphere' | 'cylinder';
export type DirectorPose = 'neutral' | 'tpose' | 'walk' | 'run' | 'sit' | 'squat' | 'kneelOne' | 'kneel' | 'handsOnHips' | 'lean' | 'bow' | 'think' | 'fight' | 'kick' | 'throw' | 'push' | 'wave' | 'reach' | 'crossArms' | 'phone';
export type DirectorJoint = 'body' | 'spine' | 'head' | 'leftShoulder' | 'rightShoulder' | 'leftElbow' | 'rightElbow' | 'leftHip' | 'rightHip' | 'leftKnee' | 'rightKnee';
export type DirectorJoints = Partial<Record<DirectorJoint, DirectorVector3>>;
export const DIRECTOR_JOINTS: { key: DirectorJoint; label: string; axes: [string, string, string] }[] = [
  { key: 'body', label: '身体', axes: ['前倾', '转身', '侧倾'] },
  { key: 'spine', label: '躯干', axes: ['前倾', '扭转', '侧倾'] },
  { key: 'head', label: '头部', axes: ['点头', '转头', '歪头'] },
  { key: 'leftShoulder', label: '左肩', axes: ['前举', '扭转', '外展'] },
  { key: 'rightShoulder', label: '右肩', axes: ['前举', '扭转', '外展'] },
  { key: 'leftElbow', label: '左肘', axes: ['弯曲', '扭转', '侧转'] },
  { key: 'rightElbow', label: '右肘', axes: ['弯曲', '扭转', '侧转'] },
  { key: 'leftHip', label: '左髋', axes: ['前抬', '扭转', '外展'] },
  { key: 'rightHip', label: '右髋', axes: ['前抬', '扭转', '外展'] },
  { key: 'leftKnee', label: '左膝', axes: ['弯曲', '扭转', '侧转'] },
  { key: 'rightKnee', label: '右膝', axes: ['弯曲', '扭转', '侧转'] },
];
export const DIRECTOR_POSES: { value: DirectorPose; label: string; joints: DirectorJoints }[] = [
  { value: 'neutral', label: '站立', joints: { leftShoulder: [0, 0, -7], rightShoulder: [0, 0, 7], leftElbow: [-12, 0, 0], rightElbow: [-12, 0, 0] } },
  { value: 'tpose', label: 'T型', joints: { leftShoulder: [0, 0, -90], rightShoulder: [0, 0, 90] } },
  { value: 'walk', label: '行走', joints: { leftHip: [-28, 0, 0], rightHip: [22, 0, 0], rightKnee: [25, 0, 0], leftShoulder: [25, 0, -8], rightShoulder: [-25, 0, 8], leftElbow: [-15, 0, 0], rightElbow: [-15, 0, 0] } },
  { value: 'run', label: '跑步', joints: { body: [12, 0, 0], leftHip: [-65, 0, 0], rightHip: [38, 0, 0], leftKnee: [40, 0, 0], rightKnee: [100, 0, 0], leftShoulder: [40, 0, 0], rightShoulder: [-45, 0, 0], leftElbow: [-95, 0, 0], rightElbow: [-95, 0, 0] } },
  { value: 'sit', label: '坐姿', joints: { leftHip: [-90, 0, 0], rightHip: [-90, 0, 0], leftKnee: [90, 0, 0], rightKnee: [90, 0, 0], leftShoulder: [-15, 0, -8], rightShoulder: [-15, 0, 8], leftElbow: [-60, 0, 0], rightElbow: [-60, 0, 0] } },
  { value: 'squat', label: '蹲下', joints: { body: [15, 0, 0], leftHip: [-110, 0, -12], rightHip: [-110, 0, 12], leftKnee: [135, 0, 0], rightKnee: [135, 0, 0], leftShoulder: [-70, 0, -10], rightShoulder: [-70, 0, 10] } },
  { value: 'kneelOne', label: '单膝跪', joints: { leftHip: [-90, 0, 0], leftKnee: [90, 0, 0], rightHip: [15, 0, 0], rightKnee: [125, 0, 0], leftElbow: [-75, 0, 0] } },
  { value: 'kneel', label: '双膝跪', joints: { leftKnee: [140, 0, 0], rightKnee: [140, 0, 0], leftShoulder: [-10, 0, 0], rightShoulder: [-10, 0, 0] } },
  { value: 'handsOnHips', label: '叉腰', joints: { leftShoulder: [0, -35, -45], rightShoulder: [0, 35, 45], leftElbow: [-105, 0, 0], rightElbow: [-105, 0, 0] } },
  { value: 'lean', label: '倚靠', joints: { body: [0, 0, -14], leftHip: [-10, 0, -6], rightHip: [0, 0, 15], rightKnee: [35, 0, 0], rightShoulder: [0, 0, 75], rightElbow: [-80, 0, 0] } },
  { value: 'bow', label: '鞠躬', joints: { spine: [48, 0, 0], head: [15, 0, 0], leftShoulder: [-30, 0, -6], rightShoulder: [-30, 0, 6] } },
  { value: 'think', label: '思考', joints: { head: [14, -15, 0], rightShoulder: [-35, -15, 5], rightElbow: [-135, 0, 0], leftShoulder: [-30, -30, -8], leftElbow: [-85, 0, 0] } },
  { value: 'fight', label: '格斗', joints: { body: [8, 25, 0], leftHip: [-15, 0, -20], rightHip: [10, 0, 20], leftKnee: [25, 0, 0], rightKnee: [30, 0, 0], leftShoulder: [-55, 0, -18], rightShoulder: [-60, 0, 18], leftElbow: [-100, 0, 0], rightElbow: [-110, 0, 0] } },
  { value: 'kick', label: '踢球', joints: { body: [-10, 0, 0], leftHip: [-85, 0, 0], leftKnee: [10, 0, 0], rightKnee: [12, 0, 0], leftShoulder: [15, 0, -35], rightShoulder: [-15, 0, 40] } },
  { value: 'throw', label: '投掷', joints: { body: [0, -25, 0], spine: [-12, 20, 0], rightShoulder: [0, 25, 125], rightElbow: [-100, 0, 0], leftShoulder: [-80, 0, -10], leftHip: [-15, 0, 0], rightHip: [20, 0, 0] } },
  { value: 'push', label: '推进', joints: { body: [15, 0, 0], leftShoulder: [-80, 0, -15], rightShoulder: [-80, 0, 15], leftElbow: [-20, 0, 0], rightElbow: [-20, 0, 0], rightHip: [20, 0, 0] } },
  { value: 'wave', label: '招手', joints: { rightShoulder: [0, 90, 115], rightElbow: [-105, 0, 0], leftShoulder: [0, 0, -8] } },
  { value: 'reach', label: '伸手', joints: { rightShoulder: [-85, 0, 15], leftShoulder: [0, 0, -8], spine: [5, 0, 0] } },
  { value: 'crossArms', label: '抱臂', joints: { leftShoulder: [-55, -45, -8], rightShoulder: [-55, 45, 8], leftElbow: [-95, 0, 0], rightElbow: [-100, 0, 0] } },
  { value: 'phone', label: '看手机', joints: { head: [25, 0, 0], leftShoulder: [-35, -20, -5], rightShoulder: [-35, 20, 5], leftElbow: [-100, 0, 0], rightElbow: [-100, 0, 0] } },
];

export function directorPoseJoints(pose: DirectorPose, overrides: DirectorJoints = {}): Record<DirectorJoint, DirectorVector3> {
  const preset = DIRECTOR_POSES.find(item => item.value === pose) || DIRECTOR_POSES[0];
  return Object.fromEntries(DIRECTOR_JOINTS.map(({ key }) => [key, [...(overrides[key] || preset.joints[key] || [0, 0, 0])]])) as Record<DirectorJoint, DirectorVector3>;
}
export type DirectorAspectRatio = 'auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

export interface DirectorObjectKeyframe {
  id: string;
  time: number;
  position: DirectorVector3;
  rotation: DirectorVector3;
  scale: DirectorVector3;
  pose?: DirectorPose;
  joints?: DirectorJoints;
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
  /** Per-joint Euler overrides, in degrees. Missing values inherit the selected pose. */
  joints?: DirectorJoints;
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
  visible: boolean;
  locked: boolean;
  position: DirectorVector3;
  target: DirectorVector3;
  fov: number;
  roll?: number;
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
  notes?: string;
  panoramaUrl?: string;
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
    color: kind === 'product' ? '#3c8177' : kind === 'actor' ? '#4f8ef7' : '#bac3bd',
    visible: true, locked: false, pose: 'neutral', keyframes: [],
  };
}

export function createDirectorCamera(index = 1): DirectorCamera {
  return { id: createDirectorId('camera'), name: `机位 ${index}`, visible: true, locked: false, position: [4.8, 3, 6.5], target: [0, 1.05, 0], fov: 40, keyframes: [] };
}

export function createDirectorScene(template: 'character' | 'product' = 'character'): DirectorScene {
  if (template === 'character') {
    const camera = { ...createDirectorCamera(), name: '机位1', position: [0, 1.35, 5.5] as DirectorVector3, target: [0, 0.95, 0] as DirectorVector3, fov: 40 };
    const actor = { ...createDirectorObject('actor'), name: '角色A' };
    return { version: 1, name: '3D场景', aspectRatio: '16:9', duration: 6, background: '#060608', floorColor: '#111319', grid: true, objects: [actor], cameras: [camera], activeCameraId: camera.id };
  }
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
const joints = (value: unknown): DirectorJoints => Object.fromEntries(DIRECTOR_JOINTS.filter(({ key }) => Array.isArray(record(value)[key])).map(({ key }) => [key, vector(record(value)[key], [0, 0, 0], -180, 180)]));

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
      pose: DIRECTOR_POSES.some(preset => preset.value === item.pose) ? item.pose as DirectorPose : 'neutral',
      ...(item.joints && typeof item.joints === 'object' ? { joints: joints(item.joints) } : {}),
      keyframes: frames((Array.isArray(item.keyframes) ? item.keyframes : []).slice(0, 240).map(entry => {
        const frame = record(entry);
        return { id: id(frame.id, 'key'), time: number(frame.time, 0, 0, duration), position: vector(frame.position, position), rotation: vector(frame.rotation, rotation, -3600, 3600), scale: vector(frame.scale, scale, 0.02, 100),
          ...(DIRECTOR_POSES.some(preset => preset.value === frame.pose) ? { pose: frame.pose as DirectorPose } : {}),
          ...(frame.joints && typeof frame.joints === 'object' ? { joints: joints(frame.joints) } : {}) };
      })),
    };
  });
  const cameras = (Array.isArray(raw.cameras) ? raw.cameras : []).slice(0, 16).map((entry, index): DirectorCamera => {
    const item = record(entry);
    const base = createDirectorCamera(index + 1);
    const position = vector(item.position, base.position);
    const target = vector(item.target, base.target);
    const fov = number(item.fov, base.fov, 15, 100);
    return { ...base, id: id(item.id, 'camera'), name: title(item.name, base.name), visible: item.visible !== false, locked: item.locked === true, position, target, fov,
      ...(typeof item.roll === 'number' ? { roll: number(item.roll, 0, -180, 180) } : {}),
      keyframes: frames((Array.isArray(item.keyframes) ? item.keyframes : []).slice(0, 240).map(entry => {
        const frame = record(entry);
        return { id: id(frame.id, 'key'), time: number(frame.time, 0, 0, duration), position: vector(frame.position, position), target: vector(frame.target, target), fov: number(frame.fov, fov, 15, 100) };
      })),
    };
  });
  if (!cameras.length) cameras.push(createDirectorCamera());
  return { version: 1, name: title(raw.name, '产品摄影棚'), aspectRatio: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'].includes(String(raw.aspectRatio)) ? raw.aspectRatio as DirectorAspectRatio : '16:9', duration,
    background: color(raw.background, '#151d21'), floorColor: color(raw.floorColor, '#5b6662'), grid: raw.grid !== false,
    objects, cameras, activeCameraId: cameras.some(camera => camera.id === raw.activeCameraId) ? String(raw.activeCameraId) : cameras[0].id,
    ...(typeof raw.notes === 'string' ? { notes: raw.notes.slice(0, 2000) } : {}),
    ...(typeof raw.panoramaUrl === 'string' && raw.panoramaUrl.length <= 1_000_000 && /^(https?:\/\/|\/[^/]|data:image\/(jpeg|png|webp);base64,)/i.test(raw.panoramaUrl) ? { panoramaUrl: raw.panoramaUrl } : {}) };
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
  const animatedPose = object.kind === 'actor' && (a.pose || b.pose || a.joints || b.joints);
  // Explicit preset keys reset joint overrides; old transform-only keys still
  // inherit the object's static pose so previously saved scenes remain valid.
  const from = animatedPose ? directorPoseJoints(a.pose || object.pose, a.joints ?? (a.pose ? undefined : object.joints)) : undefined;
  const to = animatedPose ? directorPoseJoints(b.pose || object.pose, b.joints ?? (b.pose ? undefined : object.joints)) : undefined;
  return { ...object, position: lerpVector(a.position, b.position, t), rotation: lerpRotation(a.rotation, b.rotation, t), scale: lerpVector(a.scale, b.scale, t),
    ...(from && to ? { pose: t < 0.5 ? a.pose || object.pose : b.pose || object.pose, joints: Object.fromEntries(DIRECTOR_JOINTS.map(({ key }) => [key, lerpRotation(from[key], to[key], t)])) } : {}) };
}

export function evaluateDirectorCamera(camera: DirectorCamera, time: number): DirectorCamera {
  const sampled = segment(camera.keyframes, time);
  if (!sampled) return camera;
  const [a, b, t] = sampled;
  return { ...camera, position: lerpVector(a.position, b.position, t), target: lerpVector(a.target, b.target, t), fov: lerp(a.fov, b.fov, t) };
}

export function directorAspectValue(aspectRatio: DirectorAspectRatio, viewportAspect = 16 / 9): number {
  if (aspectRatio === 'auto') return Number.isFinite(viewportAspect) && viewportAspect > 0 ? viewportAspect : 16 / 9;
  const [width, height] = aspectRatio.split(':').map(Number);
  return width / height;
}
