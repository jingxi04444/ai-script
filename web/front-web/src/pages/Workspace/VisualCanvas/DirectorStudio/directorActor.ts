import * as THREE from 'three';
import { directorPoseJoints, type DirectorJoint, type DirectorObject, type DirectorVector3 } from './directorScene';

/** An editable previs mannequin, not a replacement for a licensed character asset. */
export function createDirectorActor(object: DirectorObject, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  const pivots = new Map<DirectorJoint, THREE.Group>();
  const rotations = directorPoseJoints(object.pose, object.joints);
  const jointMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(object.color).multiplyScalar(0.66), roughness: 0.75 });
  const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, position: DirectorVector3, scale: DirectorVector3 = [1, 1, 1], surface = material) => {
    const visual = new THREE.Mesh(geometry, surface);
    visual.position.fromArray(position);
    visual.scale.fromArray(scale);
    visual.castShadow = true;
    visual.receiveShadow = true;
    parent.add(visual);
    return visual;
  };
  const joint = (parent: THREE.Object3D, key: DirectorJoint, position: DirectorVector3) => {
    const pivot = new THREE.Group();
    pivot.name = key;
    // Apply flexion, then local twist, then abduction. A shoulder twist must
    // rotate the elbow's bending plane without swinging the upper arm away.
    pivot.rotation.order = 'ZYX';
    pivot.position.fromArray(position);
    pivot.rotation.set(...rotations[key].map(THREE.MathUtils.degToRad) as DirectorVector3);
    parent.add(pivot);
    pivots.set(key, pivot);
    return pivot;
  };
  const body = joint(group, 'body', [0, 0.94, 0]);
  part(body, new THREE.SphereGeometry(0.165, 24, 16), [0, 0, 0], [1, 0.65, 0.7]);
  const spine = joint(body, 'spine', [0, 0.08, 0]);
  part(spine, new THREE.CapsuleGeometry(0.175, 0.25, 8, 24), [0, 0.23, 0], [1, 1, 0.65]);
  const head = joint(spine, 'head', [0, 0.49, 0]);
  part(head, new THREE.CylinderGeometry(0.052, 0.06, 0.11, 16), [0, 0.045, 0], [1, 1, 1], jointMaterial);
  part(head, new THREE.SphereGeometry(0.12, 24, 18), [0, 0.21, 0], [0.92, 1.2, 0.95]);
  part(head, new THREE.SphereGeometry(0.024, 12, 8), [0, 0.21, 0.11], [0.6, 0.6, 1]);
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? -1 : 1;
    const shoulder = joint(spine, `${side}Shoulder`, [sign * 0.19, 0.35, 0]);
    part(shoulder, new THREE.SphereGeometry(0.066, 16, 12), [0, 0, 0], [1, 1, 1], jointMaterial);
    part(shoulder, new THREE.CapsuleGeometry(0.057, 0.2, 6, 16), [0, -0.16, 0]);
    const elbow = joint(shoulder, `${side}Elbow`, [0, -0.32, 0]);
    part(elbow, new THREE.SphereGeometry(0.052, 16, 12), [0, 0, 0], [1, 1, 1], jointMaterial);
    part(elbow, new THREE.CapsuleGeometry(0.043, 0.19, 6, 16), [0, -0.135, 0]);
    part(elbow, new THREE.SphereGeometry(0.046, 16, 12), [0, -0.32, 0], [0.85, 1.5, 0.6]);
    const hip = joint(body, `${side}Hip`, [sign * 0.095, -0.03, 0]);
    part(hip, new THREE.CapsuleGeometry(0.077, 0.28, 8, 18), [0, -0.205, 0]);
    const knee = joint(hip, `${side}Knee`, [0, -0.43, 0]);
    part(knee, new THREE.SphereGeometry(0.06, 16, 12), [0, 0, 0], [1, 1, 1], jointMaterial);
    part(knee, new THREE.CapsuleGeometry(0.052, 0.28, 8, 18), [0, -0.2, 0]);
    part(knee, new THREE.SphereGeometry(0.072, 20, 12), [0, -0.42, 0.045], [0.82, 0.65, 1.85]);
  }
  // Anchor each pose to the ground; sitting/kneeling naturally lower the pelvis.
  group.userData.jointPivots = pivots;
  updateDirectorActor(group, object);
  return group;
}

export function updateDirectorActor(group: THREE.Group, object: DirectorObject): void {
  const signature = `${object.pose}/${JSON.stringify(object.joints || {})}`;
  if (group.userData.poseSignature === signature) return;
  group.userData.poseSignature = signature;
  const pivots = group.userData.jointPivots as Map<DirectorJoint, THREE.Group>;
  const rotations = directorPoseJoints(object.pose, object.joints);
  pivots.forEach((pivot, key) => pivot.rotation.set(...rotations[key].map(THREE.MathUtils.degToRad) as DirectorVector3));
  const body = pivots.get('body');
  if (!body) return;
  body.position.y = 0.94;
  // Measure in mannequin-local coordinates, independent of world transforms.
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const bounds = new THREE.Box3();
  group.traverse(child => { if (!(child instanceof THREE.Mesh)) return; if (!child.geometry.boundingBox) child.geometry.computeBoundingBox(); const local = child.geometry.boundingBox?.clone().applyMatrix4(inverse.clone().multiply(child.matrixWorld)); if (local) bounds.union(local); });
  body.position.y -= bounds.min.y;
}
