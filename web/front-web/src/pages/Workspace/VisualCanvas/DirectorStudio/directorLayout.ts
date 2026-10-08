import type { DirectorCamera, DirectorObject, DirectorScene, DirectorVector3 } from './directorScene';

export interface DirectorLayoutResult {
  scene: DirectorScene;
  summary: string;
  changed: boolean;
}

const PRODUCT = /(?:产品|商品|瓶子|瓶身|瓶罐|主角)/;
const ACTOR = /(?:角色|模特|人物|人偶)/;
const CAMERA = /(?:机位|镜头|相机|摄像机|构图|俯拍|特写|全景|远景|近景|正面|侧拍)/;

function clauseFor(prompt: string, subject: RegExp): string {
  return prompt.split(/[，,。；;\n]/).find(part => {
    const match = subject.exec(part);
    if (!match) return false;
    // In “角色站在产品右侧”, 产品是方位参照，不是要移动的对象。
    const actor = ACTOR.exec(part);
    const product = PRODUCT.exec(part);
    const camera = CAMERA.exec(part);
    const firstSubject = [actor?.index, product?.index, camera?.index]
      .filter((index): index is number => index !== undefined)
      .reduce((first, index) => Math.min(first, index), Infinity);
    return match.index === firstSubject;
  }) || '';
}

function positionFor(object: DirectorObject, clause: string, podium?: DirectorObject): DirectorVector3 {
  const next: DirectorVector3 = [...object.position];
  if (/(?:中央|中心|中间|正中)/.test(clause)) next[0] = 0;
  else if (/(?:右侧|右边|画面右|靠右)/.test(clause)) next[0] = 1.55;
  else if (/(?:左侧|左边|画面左|靠左)/.test(clause)) next[0] = -1.55;
  if (/(?:前景|靠前|前面)/.test(clause)) next[2] = 1.2;
  else if (/(?:后景|靠后|后面|背景中)/.test(clause)) next[2] = -1.2;
  else if (/(?:中央|中心|中间|正中)/.test(clause)) next[2] = 0;
  if (object.kind === 'product' && podium) {
    if (/(?:展台上|台面上|放在展台|放到展台)/.test(clause)) {
      next[0] = podium.position[0];
      next[2] = podium.position[2];
    }
    next[1] = Math.abs(next[0] - podium.position[0]) < 0.1 && Math.abs(next[2] - podium.position[2]) < 0.1
      ? podium.position[1] + podium.scale[1] / 2 : 0;
  }
  return next;
}

function sameVector(a: DirectorVector3, b: DirectorVector3): boolean {
  return a.every((value, index) => Math.abs(value - b[index]) < 0.001);
}

/** A deterministic local layout preview; it never claims to understand an uploaded image or call an AI model. */
export function planDirectorLayout(scene: DirectorScene, input: string, selectedId?: string | null): DirectorLayoutResult {
  const prompt = input.trim().slice(0, 400);
  if (!prompt) return { scene, summary: '先描述想要搭建的场景。', changed: false };

  const objectChanges = new Map<string, DirectorVector3>();
  const skipped: string[] = [];
  const podium = scene.objects.find(object => object.kind === 'cylinder');
  const selected = scene.objects.find(object => object.id === selectedId);
  const product = selected?.kind === 'product' ? selected : scene.objects.find(object => object.kind === 'product');
  const actor = selected?.kind === 'actor' ? selected : scene.objects.find(object => object.kind === 'actor');
  const place = (object: DirectorObject | undefined, clause: string, label: string) => {
    if (!object) { skipped.push(`请先添加${label}`); return; }
    if (object.locked) { skipped.push(`${object.name}已锁定`); return; }
    const position = positionFor(object, clause, podium);
    if (!sameVector(position, object.position)) objectChanges.set(object.id, position);
  };

  const productClause = clauseFor(prompt, PRODUCT);
  const actorClause = clauseFor(prompt, ACTOR);
  const productPlacement = Boolean(productClause && /(?:中央|中心|中间|正中|右侧|右边|画面右|靠右|左侧|左边|画面左|靠左|前景|靠前|前面|后景|靠后|后面|背景中|展台)/.test(productClause));
  const actorPlacement = Boolean(actorClause && /(?:中央|中心|中间|正中|右侧|右边|画面右|靠右|左侧|左边|画面左|靠左|前景|靠前|前面|后景|靠后|后面|背景中)/.test(actorClause));
  if (productPlacement) place(product, productClause, '产品');
  if (actorPlacement) place(actor, actorClause, '角色');

  const objects = scene.objects.map(object => {
    const position = objectChanges.get(object.id);
    if (!position) return object;
    const delta: DirectorVector3 = position.map((value, index) => value - object.position[index]) as DirectorVector3;
    return { ...object, position, keyframes: object.keyframes.map(frame => ({ ...frame, position: frame.position.map((value, index) => value + delta[index]) as DirectorVector3 })) };
  });
  const focal = objects.find(object => object.id === product?.id) ?? objects.find(object => object.id === actor?.id);
  const cameraClause = clauseFor(prompt, CAMERA) || (CAMERA.test(prompt) ? prompt : '');
  const active = scene.cameras.find(camera => camera.id === scene.activeCameraId) ?? scene.cameras[0];
  let cameraChange: DirectorCamera | undefined;
  if (cameraClause && active) {
    if (active.locked) skipped.push(`${active.name}已锁定`);
    else {
      const point: DirectorVector3 = focal ? [focal.position[0], focal.position[1] + (focal.kind === 'actor' ? 1.1 : 0.6), focal.position[2]] : [...active.target];
      const position: DirectorVector3 = [...active.position];
      let fov = active.fov;
      if (/俯拍|顶视|鸟瞰/.test(cameraClause)) { position[0] = point[0]; position[1] = point[1] + 4.2; position[2] = point[2] + 2.6; }
      else if (/特写|近景|拉近/.test(cameraClause)) { position[0] = point[0]; position[1] = point[1] + 0.45; position[2] = point[2] + 2.4; fov = 32; }
      else if (/全景|远景|拉远/.test(cameraClause)) { position[0] = point[0]; position[1] = point[1] + 1.4; position[2] = point[2] + 6.5; fov = 48; }
      else if (/正面|对准|朝向/.test(cameraClause)) { position[0] = point[0]; position[1] = point[1] + 0.55; position[2] = point[2] + 4.5; }
      else if (/左侧|左边|侧拍/.test(cameraClause)) { position[0] = point[0] - 3.4; position[1] = point[1] + 0.7; position[2] = point[2] + 3.4; }
      else if (/右侧|右边/.test(cameraClause)) { position[0] = point[0] + 3.4; position[1] = point[1] + 0.7; position[2] = point[2] + 3.4; }
      if (!sameVector(position, active.position) || !sameVector(point, active.target) || fov !== active.fov) {
        const positionDelta: DirectorVector3 = position.map((value, index) => value - active.position[index]) as DirectorVector3;
        const targetDelta: DirectorVector3 = point.map((value, index) => value - active.target[index]) as DirectorVector3;
        cameraChange = { ...active, position, target: point, fov, keyframes: active.keyframes.map(frame => ({ ...frame,
          position: frame.position.map((value, index) => value + positionDelta[index]) as DirectorVector3,
          target: frame.target.map((value, index) => value + targetDelta[index]) as DirectorVector3,
          fov: Math.min(100, Math.max(15, frame.fov + fov - active.fov)),
        })) };
      }
    }
  }

  const changed = objectChanges.size > 0 || Boolean(cameraChange);
  const cameras = cameraChange ? scene.cameras.map(camera => camera.id === cameraChange!.id ? cameraChange! : camera) : scene.cameras;
  const summary = changed
    ? `已调整 ${objectChanges.size} 个对象${cameraChange ? '及当前机位' : ''}；可用撤销恢复。${skipped.length ? ` ${skipped.join('，')}。` : ''}`
    : skipped.length ? skipped.join('，') : productPlacement || actorPlacement || cameraClause ? '当前布局已符合描述。' : '未识别到可调整的方位；试试“产品放中央、角色在右侧、机位俯拍”。';
  return { scene: changed ? { ...scene, objects, cameras } : scene, summary, changed };
}
