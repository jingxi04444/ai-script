import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';
import { createDirectorActor, updateDirectorActor } from './directorActor';
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
    const actor = createDirectorActor(object, material);
    group.userData.actorRig = actor;
    group.add(actor);
  } else if (object.kind === 'box') {
    group.add(mesh(new THREE.BoxGeometry(1, 1, 1), material));
  } else if (object.kind === 'sphere') {
    group.add(mesh(new THREE.SphereGeometry(0.5, 32, 24), material));
  } else {
    group.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 48), material));
  }
  group.userData.directorId = object.id;
  group.userData.signature = `${object.kind}/${object.color}`;
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
    // A neutral previs floor keeps the authored colour independent of the
    // subject's studio lighting; a separate catcher preserves contact shadows.
    const floorMaterial = new THREE.MeshBasicMaterial({ color: '#5b6662', toneMapped: false, fog: false });
    const floor = mesh(new THREE.PlaneGeometry(200, 200), floorMaterial, [0, -0.008, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    stage.add(floor);
    const shadowFloor = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#000000', opacity: 0.3 }), [0, -0.007, 0]);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.castShadow = false;
    stage.add(shadowFloor);
    const grid = new THREE.GridHelper(40, 40, '#394055', '#292e3b');
    grid.position.y = 0.001;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    stage.add(grid);
    const selection = new THREE.Box3Helper(new THREE.Box3(), '#96d0bd');
    selection.visible = false;
    stage.add(selection);

    const directorCamera = new THREE.PerspectiveCamera(42, 1, 0.03, 300);
    directorCamera.position.set(0, 1.6, 12.2);
    const shotCamera = new THREE.PerspectiveCamera(40, 16 / 9, 0.03, 300);
    // The editor frustum stops around the subject, not the render camera's
    // 300-metre clipping plane, which otherwise covers the stage in diagonals.
    const guideCamera = shotCamera.clone();
    const shotGuide = new THREE.CameraHelper(guideCamera);
    const guideColor = new THREE.Color('#5b7587');
    shotGuide.setColors(guideColor, guideColor, guideColor, guideColor, guideColor);
    (shotGuide.material as THREE.LineBasicMaterial).transparent = true;
    (shotGuide.material as THREE.LineBasicMaterial).opacity = 0.25;
    cameraGuides.add(shotGuide);
    const orbit = new OrbitControls(directorCamera, renderer.domElement);
    orbit.target.set(0, 1.22, 0);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.minDistance = 0.35;
    orbit.maxDistance = 75;
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.update();
    // Three's interactive orientation helper is kept outside exported shots.
    const orientationRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    orientationRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    orientationRenderer.setSize(128, 128);
    orientationRenderer.domElement.className = 'director-orientation-canvas';
    orientationRenderer.domElement.setAttribute('aria-label', '视角方向：点击坐标轴切换视角');
    container.appendChild(orientationRenderer.domElement);
    const orientation = new ViewHelper(directorCamera, orientationRenderer.domElement);
    orientationRenderer.autoClear = false;
    const orientationClick = (event: PointerEvent) => {
      if (propsRef.current.view !== 'director') return;
      clearOrbitInertia();
      orientation.center.copy(orbit.target);
      if (orientation.handleClick(event)) { orbit.enabled = false; invalidate(); }
    };
    orientationRenderer.domElement.addEventListener('pointerup', orientationClick);
    const transform = new TransformControls(directorCamera, renderer.domElement);
    transform.setSize(0.8);
    const transformHelper = transform.getHelper();
    stage.add(transformHelper);
    const visuals = new Map<string, THREE.Group>();
    const cameraVisuals = new Map<string, THREE.Group>();
    const labels = new Map<string, HTMLSpanElement>();
    const raycaster = new THREE.Raycaster();
    const cursor = new THREE.Vector2();
    let width = 1;
    let height = 1;
    let animation = 0;
    let dirty = true;
    let disposed = false;
    let contextLost = false;
    let capturing = false;
    let panoramaUrl: string | undefined;
    let panoramaTexture: THREE.Texture | null = null;
    let panoramaRequest = 0;
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
      const objectData = current.scene.objects.find(item => item.id === current.selectedId);
      const data = objectData ?? current.scene.cameras.find(item => item.id === current.selectedId);
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
      selection.visible = Boolean(selected?.visible && current.view === 'director' && objectData?.kind !== 'actor');
      if (selection.visible && selected) selection.box.setFromObject(selected);
    };

    const sync = () => {
      if (disposed || contextLost) return;
      const current = propsRef.current;
      const nextPanorama = current.scene.panoramaUrl;
      if (nextPanorama !== panoramaUrl) {
        panoramaUrl = nextPanorama;
        const request = ++panoramaRequest;
        panoramaTexture?.dispose(); panoramaTexture = null;
        if (nextPanorama) new THREE.TextureLoader().load(nextPanorama, texture => {
          if (disposed || request !== panoramaRequest) { texture.dispose(); return; }
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.colorSpace = THREE.SRGBColorSpace;
          panoramaTexture = texture; stage.background = texture; invalidate();
        }, undefined, () => {
          if (disposed || request !== panoramaRequest) return;
          setError('全景图片加载失败，请移除背景或换一张支持跨域访问的图片。');
        });
        setError('');
      }
      stage.background = panoramaTexture || new THREE.Color(current.scene.background);
      (stage.fog as THREE.Fog).color.set(current.scene.background);
      floorMaterial.color.set(current.scene.floorColor);
      const ids = new Set(current.scene.objects.map(object => object.id));
      visuals.forEach((visual, id) => {
        if (!ids.has(id)) {
          if (transform.object === visual) transform.detach();
          world.remove(visual);
          disposeTree(visual);
          visuals.delete(id);
          labels.get(id)?.remove();
          labels.delete(id);
        }
      });
      current.scene.objects.forEach(object => {
        let visual = visuals.get(object.id);
        const signature = `${object.kind}/${object.color}`;
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
        if (!labels.has(object.id)) { const label = document.createElement('span'); label.className = 'director-object-label'; container.appendChild(label); labels.set(object.id, label); }
        labels.get(object.id)!.textContent = object.name;
        if (!(transform.dragging && transform.object === visual)) {
          const evaluated = evaluateDirectorObject(object, current.playhead);
          if (object.kind === 'actor') updateDirectorActor(visual.userData.actorRig as THREE.Group, evaluated);
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
        visual.visible = camera.visible;
        if (!(transform.dragging && transform.object === visual)) {
          const evaluated = evaluateDirectorCamera(camera, current.playhead);
          visual.position.fromArray(evaluated.position);
          const rotationCamera = new THREE.PerspectiveCamera();
          rotationCamera.position.copy(visual.position);
          rotationCamera.lookAt(new THREE.Vector3(...evaluated.target));
          rotationCamera.rotateZ(THREE.MathUtils.degToRad(evaluated.roll || 0));
          visual.quaternion.copy(rotationCamera.quaternion);
        }
      });
      const active = current.scene.cameras.find(camera => camera.id === current.scene.activeCameraId) ?? current.scene.cameras[0];
      if (active) {
        const evaluated = evaluateDirectorCamera(active, current.playhead);
        shotCamera.position.fromArray(evaluated.position);
        shotCamera.lookAt(new THREE.Vector3(...evaluated.target));
        shotCamera.rotateZ(THREE.MathUtils.degToRad(evaluated.roll || 0));
        shotCamera.fov = evaluated.fov;
        shotCamera.aspect = directorAspectValue(current.scene.aspectRatio, width / height);
        shotCamera.updateProjectionMatrix();
        shotCamera.updateMatrixWorld(true);
        guideCamera.copy(shotCamera);
        guideCamera.far = Math.max(0.5, shotCamera.position.distanceTo(new THREE.Vector3(...evaluated.target)) + 0.75);
        guideCamera.updateProjectionMatrix();
        shotGuide.update();
      }
      orbit.enabled = current.view === 'director' && !transform.dragging && !orientation.animating;
      orientationRenderer.domElement.hidden = current.view !== 'director';
      // Three sets an inline display:block when sizing a canvas, overriding the
      // normal [hidden] rule. Shot preview must not expose director-only axes.
      orientationRenderer.domElement.style.display = current.view === 'director' ? 'block' : 'none';
      if (current.view !== 'director') orientation.animating = false;
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
        const aspect = directorAspectValue(propsRef.current.scene.aspectRatio, width / height);
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
      orientationRenderer.clear();
      if (propsRef.current.view === 'director') orientation.render(orientationRenderer);
      visuals.forEach((visual, id) => { const label = labels.get(id); if (!label) return; const bounds = new THREE.Box3().setFromObject(visual); const point = bounds.getCenter(new THREE.Vector3()); point.y = bounds.max.y + 0.14; point.project(directorCamera); label.hidden = !visual.visible || propsRef.current.view !== 'director' || point.z > 1 || point.z < -1; label.style.transform = `translate(${(point.x + 1) * width / 2}px, ${(1 - point.y) * height / 2}px) translate(-50%, -100%)`; });
      dirty = false;
    };
    const resize = () => {
      if (disposed || capturing) return;
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height);
      directorCamera.aspect = width / height;
      directorCamera.updateProjectionMatrix();
      shotCamera.aspect = directorAspectValue(propsRef.current.scene.aspectRatio, width / height);
      shotCamera.updateProjectionMatrix();
      guideCamera.aspect = shotCamera.aspect;
      guideCamera.updateProjectionMatrix();
      shotGuide.update();
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
        orientation.animating = false;
        directorCamera.position.set(0, 1.6, 12.2);
        orbit.target.set(0, 1.22, 0);
        orbit.update();
        invalidate();
      },
      getViewCamera: () => ({ position: tuple(directorCamera.position), target: tuple(orbit.target), fov: directorCamera.fov }),
      capture: async () => {
        if (contextLost || disposed) throw new Error('3D 视图不可用，无法导出构图。');
        if (capturing) throw new Error('正在导出，请稍候。');
        sync();
        if (propsRef.current.scene.panoramaUrl && !panoramaTexture) throw new Error('全景背景尚未加载成功，请稍后重试，或移除背景。');
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
          const aspect = directorAspectValue(propsRef.current.scene.aspectRatio, width / height);
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
    let lastTick = performance.now();
    const tick = () => {
      if (disposed) return;
      animation = requestAnimationFrame(tick);
      const now = performance.now();
      if (orientation.animating && !capturing) {
        orientation.update(Math.min((now - lastTick) / 1000, 0.1));
        if (!orientation.animating) { orbit.target.copy(orientation.center); orbit.enabled = propsRef.current.view === 'director'; orbit.update(); }
        invalidate();
      } else if (!capturing && orbit.enabled) orbit.update();
      lastTick = now;
      if (dirty) render();
    };
    resize();
    sync();
    tick();
    return () => {
      disposed = true;
      panoramaTexture?.dispose();
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
      orientationRenderer.domElement.removeEventListener('pointerup', orientationClick);
      orientation.dispose();
      orientationRenderer.dispose();
      orientationRenderer.forceContextLoss();
      orientationRenderer.domElement.remove();
      labels.forEach(label => label.remove());
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
