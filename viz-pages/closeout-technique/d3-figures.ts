export type Three = typeof import("three");
export type Fig = {
  g: import("three").Group;
  torso: import("three").Mesh;
  head: import("three").Mesh;
  legL: Limb;
  legR: Limb;
  armL: Limb;
  armR: Limb;
  scale: number;
};
export type Limb = import("three").Mesh<
  import("three").CapsuleGeometry,
  import("three").MeshStandardMaterial
>;
export type Foot = { x: number; y: number; z: number };

type Vec3 = [number, number, number];
export type FigureKit = {
  makeFigure: (color: number, scale?: number) => Fig;
  pose: (
    f: Fig,
    pos: [number, number],
    crouch: number,
    fL: Foot,
    fR: Foot,
    hhi: Vec3 | null,
    hlo: Vec3 | null,
    leanFwd: number,
  ) => void;
};

/** The pieces that need the lazily loaded `three` module: figures and the court, built once it is in. */
export function createFigureKit(THREE: Three, scene: import("three").Scene): FigureKit {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  function makeFigure(color: number, scale = 1): Fig {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.7 * scale, 1.5 * scale, 6, 12), mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 18, 18), mat);
    g.add(torso, head);
    const limb = (r: number, l: number) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), mat);
      m.geometry.translate(0, -l / 2, 0);
      g.add(m);
      return m;
    };
    const legL = limb(0.22 * scale, 1.7 * scale),
      legR = limb(0.22 * scale, 1.7 * scale),
      armL = limb(0.18 * scale, 1.4 * scale),
      armR = limb(0.18 * scale, 1.4 * scale);
    scene.add(g);
    return { g, torso, head, legL, legR, armL, armR, scale };
  }
  function aimLimb(mesh: Limb, from: import("three").Vector3, to: import("three").Vector3) {
    const d = new THREE.Vector3().subVectors(to, from);
    const len = d.length() || 0.001;
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(V(0, -1, 0), d.clone().normalize());
    mesh.scale.y = len / (mesh.geometry.parameters.length || 1);
  }
  // crouch 0..1 lowers hips; legs aim at actual world foot positions (fL/fR), so the figure steps.
  function pose(
    f: Fig,
    pos: [number, number],
    crouch: number,
    fL: Foot,
    fR: Foot,
    hhi: [number, number, number] | null,
    hlo: [number, number, number] | null,
    leanFwd: number,
  ) {
    const [x, z] = pos;
    const drop = crouch * 1.0;
    const bob = (fL.y + fR.y) * 0.22; // torso rises on the swing
    f.g.position.set(x, 0, z);
    f.g.rotation.set(leanFwd || 0, 0, 0);
    const hipY = 1.5 - drop + bob,
      shY = 3.0 - drop * 1.3 + bob;
    f.torso.position.set(0, 2.3 - drop * 1.15 + bob, 0);
    f.head.position.set(0, 3.7 - drop * 1.3 + bob, 0);
    const hipL = V(-0.4, hipY, 0),
      hipR = V(0.4, hipY, 0),
      shL = V(-0.6, shY, 0),
      shR = V(0.6, shY, 0);
    aimLimb(f.legL, hipL, V(fL.x - x, fL.y, fL.z - z));
    aimLimb(f.legR, hipR, V(fR.x - x, fR.y, fR.z - z));
    aimLimb(f.armR, shR, hhi ? V(hhi[0] - x, hhi[1], hhi[2] - z) : V(0.9, 1.6, 0.2));
    aimLimb(f.armL, shL, hlo ? V(hlo[0] - x, hlo[1], hlo[2] - z) : V(-0.9, 1.5, 0.2));
  }
  return { makeFigure, pose };
}

/** Floor, paint, backboard and rim, in ground coordinates (rim at z=-22). */
export function buildStage(THREE: Three, scene: import("three").Scene): void {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x241a0e, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -6;
  scene.add(floor);
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 22),
    new THREE.MeshStandardMaterial({ color: 0x3a2b14, roughness: 0.95 }),
  );
  paint.rotation.x = -Math.PI / 2;
  paint.position.set(0, 0.02, -11);
  scene.add(paint);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 9),
    new THREE.MeshStandardMaterial({ color: 0x888888 }),
  );
  pole.position.set(0, 4.5, -23.5);
  scene.add(pole);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3.5, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xcbb78a }),
  );
  board.position.set(0, 8, -22.7);
  scene.add(board);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.13, 12, 28),
    new THREE.MeshStandardMaterial({ color: 0xff7a3c, roughness: 0.4 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 6.6, -21);
  scene.add(rim);
}
