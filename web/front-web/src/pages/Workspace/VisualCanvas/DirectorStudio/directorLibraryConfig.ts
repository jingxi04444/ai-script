import type { DirectorAspectRatio, DirectorCamera, DirectorVector3 } from './directorScene';

/** Navigation matches the live reference; animation stays in the stage's bottom bar. */
export const DIRECTOR_TOOLS = [
  { key: 'scene', label: '场景', icon: 'LayoutOutlined' },
  { key: 'actors', label: '添加角色', icon: 'DirectorActor' },
  { key: 'cameras', label: '添加机位', icon: 'VideoCameraOutlined' },
  { key: 'panorama', label: '全景图', icon: 'DirectorPanorama' },
  { key: 'ratio', label: '选择画幅比例', icon: 'DirectorFrame' },
  { key: 'recognition', label: 'AI 识图导入', icon: 'DirectorImage' },
] as const;
export type DirectorTool = typeof DIRECTOR_TOOLS[number]['key'];

/** Lightweight previs proportions, not downloaded production character assets. */
export const DIRECTOR_ACTOR_PRESETS: { name: string; scale: DirectorVector3 }[] = [
  { name: '标准男性', scale: [1, 1, 1] },
  { name: '标准女性', scale: [0.86, 0.94, 0.86] },
  { name: '健硕', scale: [1.28, 1.08, 1.18] },
  { name: '纤细', scale: [0.72, 1.03, 0.76] },
  { name: '少年', scale: [0.82, 0.83, 0.82] },
  { name: '儿童', scale: [0.72, 0.65, 0.72] },
  { name: '宽厚', scale: [1.4, 0.96, 1.28] },
];

export const DIRECTOR_RATIOS: { value: DirectorAspectRatio; label: string; className: string }[] = [
  { value: 'auto', label: '自适应', className: 'is-auto' },
  { value: '21:9', label: '21:9', className: 'is-ultrawide' },
  { value: '16:9', label: '16:9', className: 'is-wide' },
  { value: '4:3', label: '4:3', className: 'is-landscape' },
  { value: '1:1', label: '1:1', className: 'is-square' },
  { value: '3:4', label: '3:4', className: 'is-portrait' },
  { value: '9:16', label: '9:16', className: 'is-vertical' },
];

export const DIRECTOR_CAMERA_PRESETS: { name: string; values?: Pick<DirectorCamera, 'position' | 'target' | 'fov' | 'roll'> }[] = [
  { name: '当前视角' },
  { name: '正面中景', values: { position: [0, 1.5, 4], target: [0, 1.1, 0], fov: 40 } },
  { name: '正面特写', values: { position: [0, 1.65, 2.3], target: [0, 1.55, 0], fov: 30 } },
  { name: '正面全景', values: { position: [0, 1.6, 6.5], target: [0, 0.95, 0], fov: 40 } },
  { name: '侧面跟拍', values: { position: [4.5, 1.5, 0.1], target: [0, 1, 0], fov: 40 } },
  { name: '侧面近景', values: { position: [2.5, 1.65, 0.1], target: [0, 1.35, 0], fov: 35 } },
  { name: '背面中景', values: { position: [0, 1.5, -4], target: [0, 1.1, 0], fov: 40 } },
  { name: '俯拍全景', values: { position: [0.01, 7, 0.01], target: [0, 0.5, 0], fov: 40 } },
  { name: '45° 俯拍', values: { position: [3.5, 5, 3.5], target: [0, 0.8, 0], fov: 40 } },
  { name: '低角度仰拍', values: { position: [0, 0.3, 3.5], target: [0, 1.25, 0], fov: 40 } },
  { name: '低角度广角', values: { position: [0, 0.25, 2.8], target: [0, 1.1, 0], fov: 65 } },
  { name: '过肩镜头', values: { position: [-0.7, 1.7, -2], target: [0.3, 1.3, 1], fov: 40 } },
  { name: '过肩镜头（右）', values: { position: [0.7, 1.7, -2], target: [-0.3, 1.3, 1], fov: 40 } },
  { name: '鸟瞰', values: { position: [0.01, 12, 0.01], target: [0, 0, 0], fov: 55 } },
  { name: '荷兰角', values: { position: [0, 1.5, 4.5], target: [0, 1, 0], fov: 40, roll: 15 } },
];

/** Highlight the actual active framing, not the last card the user clicked. */
export function getDirectorCameraPresetIndex(camera?: DirectorCamera): number {
  if (!camera) return -1;
  return DIRECTOR_CAMERA_PRESETS.findIndex(({ values }) => values &&
    values.position.every((value, index) => Math.abs(value - camera.position[index]) < 0.000001) &&
    values.target.every((value, index) => Math.abs(value - camera.target[index]) < 0.000001) &&
    Math.abs(values.fov - camera.fov) < 0.000001 &&
    Math.abs((values.roll || 0) - (camera.roll || 0)) < 0.000001);
}
