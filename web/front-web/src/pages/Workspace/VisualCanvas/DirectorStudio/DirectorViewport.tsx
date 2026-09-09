import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  directorAspectValue, evaluateDirectorCamera, evaluateDirectorObject,
  type DirectorCamera, type DirectorObject, type DirectorScene, type DirectorVector3,
} from './directorScene';

export interface DirectorViewportHandle {
  /** Captures the active shot camera, without editor guides, as a PNG. */
  capture(): Promise<Blob>;
  resetView(): void;
  getViewCamera(): { position: DirectorVector3; target: DirectorVector3; fov: number };
}

export interface DirectorViewportProps {
  scene: DirectorScene;
  selectedId: string | null;
  view: 'director' | 'camera';
  transformMode: 'translate' | 'rotate' | 'scale';
  playhead: number;
  onSelect: (id: string | null) => void;
  onObjectChange: (id: string, patch: Partial<DirectorObject>) => void;
  onCameraChange: (id: string, patch: Partial<DirectorCamera>) => void;
}

interface ViewportRuntime extends DirectorViewportHandle {
  sync(): void;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: DirectorVector3 = [0, 0, 0]): THREE.Mesh {
  const item = new THREE.Mesh(geometry, material);
  item.position.fromArray(position);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function productLabel(): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#ebe9dd';
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = '#747f70';
  context.lineWidth = 2;
  context.strokeRect(28, 28, 456, 456);
  context.fillStyle = '#334c44';
  context.textAlign = 'center';
  context.font = '54px Georgia, serif';
  context.fillText('L U M I', 256, 172);
  context.font = '18px sans-serif';
  context.fillText('BOTANICAL ESSENCE', 256, 220);
  context.beginPath();
  context.moveTo(216, 272);
  context.lineTo(296, 272);
  context.stroke();
  context.font = '15px sans-serif';
  context.fillText('STUDIO COLLECTION', 256, 342);
  context.fillText('50 ml / 1.7 fl.oz.', 256, 380);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createActor(object: DirectorObject, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  const jointMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(object.color).multiplyScalar(0.7), roughness: 0.6, metalness: 0.06 });
  const torso = mesh(new THREE.CapsuleGeometry(0.18, 0.3, 6, 16), material, [0, 1.2, 0]);
  torso.scale.set(1, 1, 0.66);
  group.add(torso);
  group.add(mesh(new THREE.SphereGeometry(0.13, 20, 14), material, [0, 1.73, 0]));
  group.add(mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.14, 12), jointMaterial, [0, 1.55, 0]));
  const hips = mesh(new THREE.SphereGeometry(0.16, 16, 12), material, [0, 0.92, 0]);
  hips.scale.set(1, 0.65, 0.7);
  group.add(hips);
  const limb = (start: DirectorVector3, end: DirectorVector3, radius: number) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const bone = mesh(new THREE.CylinderGeometry(radius * 0.82, radius, direction.length(), 12), material);
    bone.position.copy(a.add(b).multiplyScalar(0.5));
    bone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(bone);
    group.add(mesh(new THREE.SphereGeometry(radius * 1.13, 12, 10), jointMaterial, end));
  };
  const wave = object.pose === 'wave';
  const walk = object.pose === 'walk';
  const leftElbow: DirectorVector3 = [-0.3, 1.12, walk ? -0.16 : 0];
  const leftWrist: DirectorVector3 = [-0.33, 0.88, walk ? -0.28 : 0.025];
  const rightElbow: DirectorVector3 = wave ? [0.43, 1.58, 0] : [0.3, 1.12, walk ? 0.18 : 0];
  const rightWrist: DirectorVector3 = wave ? [0.46, 1.88, 0] : [0.33, 0.88, walk ? 0.32 : 0.025];
  limb([-0.18, 1.43, 0], leftElbow, 0.063);
  limb(leftElbow, leftWrist, 0.047);
  limb([0.18, 1.43, 0], rightElbow, 0.063);
  limb(rightElbow, rightWrist, 0.047);
  const leftKnee: DirectorVector3 = [-0.105, 0.5, walk ? 0.21 : 0];
  const rightKnee: DirectorVector3 = [0.105, 0.5, walk ? -0.16 : 0];
  const leftAnkle: DirectorVector3 = [-0.12, 0.09, walk ? 0.3 : 0];
  const rightAnkle: DirectorVector3 = [0.12, 0.09, walk ? -0.29 : 0];
  limb([-0.095, 0.9, 0], leftKnee, 0.082);
  limb(leftKnee, leftAnkle, 0.06);
  limb([0.095, 0.9, 0], rightKnee, 0.082);
  limb(rightKnee, rightAnkle, 0.06);
  [leftAnkle, rightAnkle].forEach(ankle => group.add(mesh(new THREE.BoxGeometry(0.13, 0.1, 0.24), material, [ankle[0], 0.055, ankle[2] + 0.05])));
  // A small face-plane makes the mannequin's facing direction readable from a wide shot.
  group.add(mesh(new THREE.BoxGeometry(0.065, 0.025, 0.025), jointMaterial, [0, 1.74, 0.125]));
  return group;
}

function createObjectVisual(object: DirectorObject): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: object.color, roughness: 0.42, metalness: object.kind === 'product' ? 0.22 : 0.05 });
  if (object.kind === 'product') {
    group.add(mesh(new THREE.CylinderGeometry(0.245, 0.245, 1, 48), material, [0, 0.57, 0]));
    const shoulder = mesh(new THREE.SphereGeometry(0.245, 40, 20), material, [0, 1.07, 0]);
    shoulder.scale.y = 0.6;
    group.add(shoulder);
    group.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 32), material, [0, 1.22, 0]));
    const metal = new THREE.MeshStandardMaterial({ color: '#b4a787', metalness: 0.7, roughness: 0.26 });
    group.add(mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.2, 40), metal, [0, 1.36, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.249, 0.249, 0.07, 48), metal, [0, 0.055, 0]));
    const texture = productLabel();
    const labelMaterial = new THREE.MeshStandardMaterial({ map: texture, color: '#f7f3e8', roughness: 0.9, side: THREE.DoubleSide });
    const label = mesh(new THREE.CylinderGeometry(0.247, 0.247, 0.66, 32, 1, true, -0.92, 1.84), labelMaterial, [0, 0.58, 0]);
    label.castShadow = false;
    group.add(label);
  } else if (object.kind === 'actor') {
    group.add(createActor(object, material));
  } else if (object.kind === 'box') {
    group.add(mesh(new THREE.BoxGeometry(1, 1, 1), material));
  } else if (object.kind === 'sphere') {
    group.add(mesh(new THREE.SphereGeometry(0.5, 32, 24), material));
  } else {
    group.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 48), material));
  }
  group.userData.directorId = object.id;
  group.userData.signature = `${object.kind}/${object.color}/${object.pose}`;
  return group;
}

function createCameraVisual(id: string): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#d7ab6e', roughness: 0.7, metalness: 0.1 });
  group.add(mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), material));
  const lens = mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.13, 16), material, [0, 0, -0.14]);
  lens.rotation.x = Math.PI / 2;
  group.add(lens);
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(0.23, 0.48, 4)), new THREE.LineBasicMaterial({ color: '#d7ab6e', transparent: true, opacity: 0.4 }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.y = Math.PI / 4;
  line.position.z = -0.39;
  group.add(line);
  group.traverse(object => {
    // Editor icons are not set pieces: they must never cast scene shadows.
    object.castShadow = false;
    object.receiveShadow = false;
  });
  group.userData.directorId = id;
  return group;
}

function disposeTree(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      if (object.geometry) geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => {
    if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
    material.dispose();
  });
}

const degrees = (radians: number) => THREE.MathUtils.radToDeg(radians);
const round = (value: number) => Math.round(value * 1000) / 1000;
const tuple = (value: THREE.Vector3): DirectorVector3 => [round(value.x), round(value.y), round(value.z)];

/** One renderer per mounted studio; React changes synchronize scene data, never recreate WebGL per frame. */
export const DirectorViewport = forwardRef<DirectorViewportHandle, DirectorViewportProps>(function DirectorViewport(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const runtimeRef = useRef<ViewportRuntime | null>(null);
  const [error, setError] = useState('');
  propsRef.current = props;

  useImperativeHandle(ref, () => ({
    capture: () => runtimeRef.current?.capture() ?? Promise.reject(new Error('3D 视图尚未准备好，请等待加载完成。')),
    resetView: () => runtimeRef.current?.resetView(),
    getViewCamera: () => runtimeRef.current?.getViewCamera() ?? { position: [5, 3, 6], target: [0, 1, 0], fov: 42 },
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    } catch {
      setError('当前浏览器无法启动 WebGL 3D 视图。请开启硬件加速，或使用支持 WebGL 2 的浏览器。场景数据仍可保存。');
      return;
    }
    setError('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = 'director-viewport-canvas';
    renderer.domElement.setAttribute('aria-label', '导演台三维场景：拖动旋转视角，滚轮缩放，点击对象后拖动坐标轴编辑');
    renderer.domElement.tabIndex = 0;
    container.appendChild(renderer.domElement);

    const stage = new THREE.Scene();
    stage.background = new THREE.Color('#151d21');
    stage.fog = new THREE.Fog('#151d21', 18, 60);
    const world = new THREE.Group();
    const cameraGuides = new THREE.Group();
    stage.add(world, cameraGuides);
    stage.add(new THREE.HemisphereLight('#e4f2ee', '#52604e', 2));
    const keyLight = new THREE.DirectionalLight('#fff1d7', 4);
    keyLight.position.set(-3, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.normalBias = 0.03;
    stage.add(keyLight);
    const rimLight = new THREE.DirectionalLight('#c0e6ff', 2);
    rimLight.position.set(4, 3, -4);
    stage.add(rimLight);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: '#5b6662', roughness: 0.92, metalness: 0 });
    const floor = mesh(new THREE.PlaneGeometry(200, 200), floorMaterial, [0, -0.008, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    stage.add(floor);
    const grid = new THREE.GridHelper(30, 30, '#8e9b9d', '#819090');
    grid.position.y = 0.001;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.14;
    stage.add(grid);
    const selection = new THREE.Box3Helper(new THREE.Box3(), '#96d0bd');
    selection.visible = false;
    stage.add(selection);

    const directorCamera = new THREE.PerspectiveCamera(42, 1, 0.03, 300);
    directorCamera.position.set(5.8, 3.6, 7);
    const shotCamera = new THREE.PerspectiveCamera(40, 16 / 9, 0.03, 300);
    const orbit = new OrbitControls(directorCamera, renderer.domElement);
    orbit.target.set(0, 0.95, 0);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.minDistance = 0.35;
    orbit.maxDistance = 75;
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.update();
    const transform = new TransformControls(directorCamera, renderer.domElement);
    transform.setSize(0.8);
    const transformHelper = transform.getHelper();
    stage.add(transformHelper);
    const visuals = new Map<string, THREE.Group>();
    const cameraVisuals = new Map<string, THREE.Group>();
    const raycaster = new THREE.Raycaster();
    const cursor = new THREE.Vector2();
    let width = 1;
    let height = 1;
    let animation = 0;
    let dirty = true;
    let disposed = false;
    let contextLost = false;
    let capturing = false;
    let pointerStart = { x: 0, y: 0, gizmo: false, button: 0 };
    const invalidate = () => { dirty = true; };
    // OrbitControls retains angular/pan deltas while damping. Drain those deltas
    // before an explicit view change so the next RAF cannot undo the new camera.
    const clearOrbitInertia = () => {
      const damping = orbit.enableDamping;
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = damping;
    };
    const selectedObject = () => {
      const id = propsRef.current.selectedId;
      return id ? visuals.get(id) ?? cameraVisuals.get(id) : undefined;
    };
    const updateSelection = () => {
      const current = propsRef.current;
      const selected = selectedObject();
      const data = current.scene.objects.find(item => item.id === current.selectedId);
      const enabled = current.view === 'director' && selected?.visible && !data?.locked;
      if (selected && enabled) {
        if (transform.object !== selected) transform.attach(selected);
        transform.setMode(cameraVisuals.has(selected.userData.directorId) && current.transformMode === 'scale' ? 'translate' : current.transformMode);
        transform.enabled = true;
        transformHelper.visible = true;
      } else {
        transform.detach();
        transform.enabled = false;
        transformHelper.visible = false;
      }
      selection.visible = Boolean(selected?.visible && current.view === 'director');
      if (selection.visible && selected) selection.box.setFromObject(selected);
    };

    const sync = () => {
      if (disposed || contextLost) return;
      const current = propsRef.current;
      stage.background = new THREE.Color(current.scene.background);
      (stage.fog as THREE.Fog).color.set(current.scene.background);
      floorMaterial.color.set(current.scene.floorColor);
      const ids = new Set(current.scene.objects.map(object => object.id));
      visuals.forEach((visual, id) => {
        if (!ids.has(id)) {
          if (transform.object === visual) transform.detach();
          world.remove(visual);
          disposeTree(visual);
          visuals.delete(id);
        }
      });
      current.scene.objects.forEach(object => {
        let visual = visuals.get(object.id);
        const signature = `${object.kind}/${object.color}/${object.pose}`;
        if (!visual || visual.userData.signature !== signature) {
          if (visual) {
            if (transform.object === visual) transform.detach();
            world.remove(visual);
            disposeTree(visual);
          }
          visual = createObjectVisual(object);
          visuals.set(object.id, visual);
          world.add(visual);
        }
        visual.visible = object.visible;
        if (!(transform.dragging && transform.object === visual)) {
          const evaluated = evaluateDirectorObject(object, current.playhead);
          visual.position.fromArray(evaluated.position);
          visual.rotation.set(...evaluated.rotation.map(THREE.MathUtils.degToRad) as DirectorVector3);
          visual.scale.fromArray(evaluated.scale);
        }
      });
      const cameraIds = new Set(current.scene.cameras.map(camera => camera.id));
      cameraVisuals.forEach((visual, id) => {
        if (!cameraIds.has(id)) {
          if (transform.object === visual) transform.detach();
          cameraGuides.remove(visual);
          disposeTree(visual);
          cameraVisuals.delete(id);
        }
      });
      current.scene.cameras.forEach(camera => {
        let visual = cameraVisuals.get(camera.id);
        if (!visual) {
          visual = createCameraVisual(camera.id);
          cameraVisuals.set(camera.id, visual);
          cameraGuides.add(visual);
        }
        if (!(transform.dragging && transform.object === visual)) {
          const evaluated = evaluateDirectorCamera(camera, current.playhead);
          visual.position.fromArray(evaluated.position);
          const rotationCamera = new THREE.PerspectiveCamera();
          rotationCamera.position.copy(visual.position);
          rotationCamera.lookAt(new THREE.Vector3(...evaluated.target));
          visual.quaternion.copy(rotationCamera.quaternion);
        }
      });
      const active = current.scene.cameras.find(camera => camera.id === current.scene.activeCameraId) ?? current.scene.cameras[0];
      if (active) {
        const evaluated = evaluateDirectorCamera(active, current.playhead);
        shotCamera.position.fromArray(evaluated.position);
        shotCamera.lookAt(new THREE.Vector3(...evaluated.target));
        shotCamera.fov = evaluated.fov;
        shotCamera.aspect = directorAspectValue(current.scene.aspectRatio);
        shotCamera.updateProjectionMatrix();
      }
      orbit.enabled = current.view === 'director' && !transform.dragging;
      cameraGuides.visible = current.view === 'director';
      grid.visible = current.scene.grid && current.view === 'director';
      stage.updateMatrixWorld(true);
      updateSelection();
      invalidate();
    };

    const render = () => {
      if (disposed || capturing || contextLost) return;
      if (propsRef.current.view === 'director') {
        cameraVisuals.forEach(visual => {
          // Keep nearby camera icons readable without allowing them to fill the
          // viewport. This is only an editor marker, not the shot camera scale.
          const markerScale = THREE.MathUtils.clamp(visual.position.distanceTo(directorCamera.position) * 0.075, 0.15, 1.2);
          visual.scale.setScalar(markerScale);
        });
        const selected = selectedObject();
        if (selected && selection.visible && cameraVisuals.has(selected.userData.directorId)) selection.box.setFromObject(selected);
      }
      if (propsRef.current.view === 'camera') {
        const aspect = directorAspectValue(propsRef.current.scene.aspectRatio);
        const shotWidth = Math.min(width, height * aspect);
        const shotHeight = Math.min(height, width / aspect);
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, width, height);
        renderer.setClearColor('#0b1012');
        renderer.clear();
        renderer.setViewport((width - shotWidth) / 2, (height - shotHeight) / 2, shotWidth, shotHeight);
        renderer.setScissor((width - shotWidth) / 2, (height - shotHeight) / 2, shotWidth, shotHeight);
        renderer.setScissorTest(true);
        renderer.render(stage, shotCamera);
        renderer.setScissorTest(false);
      } else {
        renderer.setViewport(0, 0, width, height);
        renderer.setScissorTest(false);
        renderer.render(stage, directorCamera);
      }
      dirty = false;
    };
    const resize = () => {
      if (disposed || capturing) return;
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height);
      directorCamera.aspect = width / height;
      directorCamera.updateProjectionMatrix();
      invalidate();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const onDragging = (event: { value: unknown }) => {
      orbit.enabled = !event.value && propsRef.current.view === 'director';
      invalidate();
    };
    const commitTransform = () => {
      const current = propsRef.current;
      const visual = transform.object;
      if (!visual) return;
      const id = visual.userData.directorId as string;
      const object = current.scene.objects.find(item => item.id === id);
      if (object && !object.locked) {
        current.onObjectChange(id, { position: tuple(visual.position), rotation: [round(degrees(visual.rotation.x)), round(degrees(visual.rotation.y)), round(degrees(visual.rotation.z))], scale: [Math.max(0.02, round(visual.scale.x)), Math.max(0.02, round(visual.scale.y)), Math.max(0.02, round(visual.scale.z))] });
      } else {
        const camera = current.scene.cameras.find(item => item.id === id);
        if (camera) {
          const evaluated = evaluateDirectorCamera(camera, current.playhead);
          const distance = new THREE.Vector3(...evaluated.position).distanceTo(new THREE.Vector3(...evaluated.target));
          const target = new THREE.Vector3(0, 0, -1).applyQuaternion(visual.quaternion).multiplyScalar(Math.max(distance, 0.1)).add(visual.position);
          current.onCameraChange(id, { position: tuple(visual.position), target: tuple(target) });
        }
      }
      invalidate();
    };
    const onTransformChange = () => {
      const selected = selectedObject();
      if (selected && selection.visible) selection.box.setFromObject(selected);
      invalidate();
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY, gizmo: transform.axis !== null, button: event.button };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (propsRef.current.view !== 'director' || pointerStart.button !== 0 || pointerStart.gizmo || transform.dragging || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      cursor.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(cursor, directorCamera);
      const candidates = [...visuals.values(), ...cameraVisuals.values()].filter(object => object.visible);
      const hit = raycaster.intersectObjects(candidates, true)[0];
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !object.userData.directorId) object = object.parent;
      propsRef.current.onSelect(object?.userData.directorId ?? null);
    };
    const onDoubleClick = () => {
      const selected = selectedObject();
      if (!selected || propsRef.current.view !== 'director') return;
      clearOrbitInertia();
      const bounds = new THREE.Box3().setFromObject(selected);
      const center = bounds.getCenter(new THREE.Vector3());
      const distance = Math.max(bounds.getSize(new THREE.Vector3()).length() * 1.5, 1.2);
      const direction = directorCamera.position.clone().sub(orbit.target).normalize();
      orbit.target.copy(center);
      directorCamera.position.copy(center).addScaledVector(direction, distance);
      orbit.update();
      invalidate();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      setError('3D 图形上下文已中断。请先保存场景，再关闭并重新打开导演台。');
    };
    transform.addEventListener('dragging-changed', onDragging);
    transform.addEventListener('mouseUp', commitTransform);
    transform.addEventListener('change', onTransformChange);
    orbit.addEventListener('change', invalidate);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    runtimeRef.current = {
      sync,
      resetView: () => {
        clearOrbitInertia();
        directorCamera.position.set(5.8, 3.6, 7);
        orbit.target.set(0, 0.95, 0);
        orbit.update();
        invalidate();
      },
      getViewCamera: () => ({ position: tuple(directorCamera.position), target: tuple(orbit.target), fov: directorCamera.fov }),
      capture: async () => {
        if (contextLost || disposed) throw new Error('3D 视图不可用，无法导出构图。');
        if (capturing) throw new Error('正在导出，请稍候。');
        sync();
        capturing = true;
        const pixelRatio = renderer.getPixelRatio();
        const gridWasVisible = grid.visible;
        const guidesWereVisible = cameraGuides.visible;
        const selectionWasVisible = selection.visible;
        const transformWasVisible = transformHelper.visible;
        try {
          grid.visible = false;
          cameraGuides.visible = false;
          selection.visible = false;
          transformHelper.visible = false;
          const aspect = directorAspectValue(propsRef.current.scene.aspectRatio);
          const captureWidth = Math.round(aspect >= 1 ? 1600 : 1600 * aspect);
          const captureHeight = Math.round(aspect >= 1 ? 1600 / aspect : 1600);
          renderer.setPixelRatio(1);
          renderer.setSize(captureWidth, captureHeight, false);
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, captureWidth, captureHeight);
          renderer.render(stage, shotCamera);
          return await new Promise<Blob>((resolve, reject) => {
            renderer.domElement.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 导出失败，请重新尝试。')), 'image/png');
          });
        } finally {
          capturing = false;
          if (!disposed) {
            grid.visible = gridWasVisible;
            cameraGuides.visible = guidesWereVisible;
            selection.visible = selectionWasVisible;
            transformHelper.visible = transformWasVisible;
            renderer.setPixelRatio(pixelRatio);
            resize();
            sync();
            render();
          }
        }
      },
    };
    const tick = () => {
      if (disposed) return;
      animation = requestAnimationFrame(tick);
      if (!capturing && orbit.enabled) orbit.update();
      if (dirty) render();
    };
    resize();
    sync();
    tick();
    return () => {
      disposed = true;
      runtimeRef.current = null;
      cancelAnimationFrame(animation);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      transform.removeEventListener('dragging-changed', onDragging);
      transform.removeEventListener('mouseUp', commitTransform);
      transform.removeEventListener('change', onTransformChange);
      orbit.removeEventListener('change', invalidate);
      transform.detach();
      stage.remove(transformHelper);
      transform.dispose();
      orbit.dispose();
      disposeTree(stage);
      keyLight.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => { runtimeRef.current?.sync(); }, [props.scene, props.selectedId, props.view, props.transformMode, props.playhead]);

  return <div className="director-viewport" ref={containerRef}>
    {error ? <div className="director-viewport-error" role="alert"><strong>3D 视图暂不可用</strong><p>{error}</p></div> : null}
  </div>;
});

export default DirectorViewport;
