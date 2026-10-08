import type { DirectorScene, DirectorVector3 } from './directorScene';

export interface DirectorAiLayoutResult { scene: DirectorScene; changed: boolean; summary: string }

const vector = (value: unknown): DirectorVector3 | null => {
  if (!Array.isArray(value) || value.length !== 3 || value.some(part => typeof part !== 'number' || !Number.isFinite(part) || Math.abs(part) > 20)) return null;
  return value as DirectorVector3;
};

export const directorLayoutRequest = (scene: DirectorScene, prompt: string) => ({
  systemPrompt: '你是影视预演导演。只返回单个 JSON 对象，格式为 {"objects":[{"id":"现有对象ID","position":[x,y,z]}],"camera":{"id":"现有机位ID","position":[x,y,z],"target":[x,y,z],"fov":40},"summary":"简短说明"}。只能调整现有且未锁定对象或机位；坐标单位为米，范围 -20 到 20；不得创建、删除对象或修改产品外观。未要求改变的对象不要写入。不要 Markdown。',
  prompt: `用户要求：${prompt.trim()}\n场景快照：${JSON.stringify({
    objects: scene.objects.map(({ id, name, kind, position, locked }) => ({ id, name, kind, position, locked })),
    cameras: scene.cameras.map(({ id, name, position, target, fov, locked }) => ({ id, name, position, target, fov, locked })),
    activeCameraId: scene.activeCameraId,
  })}`,
});

export const applyDirectorAiLayout = (scene: DirectorScene, response: string): DirectorAiLayoutResult => {
  const raw = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('模型没有返回有效的布局 JSON，请重试'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('模型返回的布局结构无效');
  const proposal = parsed as { objects?: Array<{ id?: unknown; position?: unknown }>; camera?: { id?: unknown; position?: unknown; target?: unknown; fov?: unknown }; summary?: unknown };
  let changed = false;
  const positions = new Map<string, DirectorVector3>();
  for (const item of Array.isArray(proposal.objects) ? proposal.objects : []) {
    const target = scene.objects.find(object => object.id === item.id && !object.locked);
    const next = vector(item.position);
    if (target && next && next.some((part, index) => Math.abs(part - target.position[index]) > 0.001)) positions.set(target.id, next);
  }
  const objects = scene.objects.map(object => {
    const position = positions.get(object.id);
    if (!position) return object;
    changed = true;
    const delta = position.map((part, index) => part - object.position[index]) as DirectorVector3;
    return { ...object, position, keyframes: object.keyframes.map(frame => ({ ...frame,
      position: frame.position.map((part, index) => part + delta[index]) as DirectorVector3,
    })) };
  });
  const cameraProposal = proposal.camera;
  const cameras = scene.cameras.map(camera => {
    if (!cameraProposal || camera.locked || camera.id !== cameraProposal.id) return camera;
    const position = vector(cameraProposal.position);
    const target = vector(cameraProposal.target);
    const fov = cameraProposal.fov;
    if (!position || !target || typeof fov !== 'number' || !Number.isFinite(fov) || fov < 15 || fov > 100) return camera;
    if (position.every((part, index) => Math.abs(part - camera.position[index]) < 0.001)
      && target.every((part, index) => Math.abs(part - camera.target[index]) < 0.001) && fov === camera.fov) return camera;
    changed = true;
    const positionDelta = position.map((part, index) => part - camera.position[index]) as DirectorVector3;
    const targetDelta = target.map((part, index) => part - camera.target[index]) as DirectorVector3;
    return { ...camera, position, target, fov, keyframes: camera.keyframes.map(frame => ({ ...frame,
      position: frame.position.map((part, index) => part + positionDelta[index]) as DirectorVector3,
      target: frame.target.map((part, index) => part + targetDelta[index]) as DirectorVector3,
      fov: Math.min(100, Math.max(15, frame.fov + fov - camera.fov)),
    })) };
  });
  return { scene: changed ? { ...scene, objects, cameras } : scene, changed,
    summary: typeof proposal.summary === 'string' && proposal.summary.trim() ? proposal.summary.trim().slice(0, 160)
      : changed ? 'AI 已调整场景对象与机位，可撤销恢复。' : 'AI 没有提出可应用的布局变更。' };
};
