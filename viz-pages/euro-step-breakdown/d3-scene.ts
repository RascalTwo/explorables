export type T3 = typeof import("three");
export type Limb = import("three").Mesh<
  import("three").CapsuleGeometry,
  import("three").MeshStandardMaterial
>;
export type Fig = {
  g: import("three").Group;
  torso: import("three").Mesh;
  head: import("three").Mesh;
  legL: Limb;
  legR: Limb;
  armL: Limb;
  armR: Limb;
  scale: number;
  _y?: number;
};
export type XZ = [number, number];
export type FigureKit = {
  makeFigure: (color: number, scale?: number) => Fig;
  poseFigure: (
    f: Fig,
    pos: XZ,
    lean: { side: number; fwd: number },
    footL: XZ,
    footR: XZ,
    handBall: [number, number, number] | null,
  ) => void;
};

/** The figures: built and posed with the lazily loaded `three` module once it is in. */
export function createFigureKit(THREE: T3, scene: import("three").Scene): FigureKit {
  function makeFigure(color: number, scale = 1): Fig {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.7 * scale, 1.5 * scale, 6, 12), mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 18, 18), mat);
    g.add(torso, head);
    const limb = (r: number, l: number): Limb => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), mat);
      m.geometry.translate(0, -l / 2, 0);
      g.add(m);
      return m;
    };
    const legL = limb(0.22 * scale, 1.6 * scale),
      legR = limb(0.22 * scale, 1.6 * scale),
      armL = limb(0.18 * scale, 1.4 * scale),
      armR = limb(0.18 * scale, 1.4 * scale);
    scene.add(g);
    return { g, torso, head, legL, legR, armL, armR, scale };
  }
  // orient a top-anchored capsule (its top at `from`) to point toward `to`
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  function aimLimb(mesh: Limb, from: import("three").Vector3, to: import("three").Vector3) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length() || 0.001;
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(V(0, -1, 0), dir.clone().normalize());
    mesh.scale.y = len / (mesh.geometry.parameters.length || 1);
  }
  function poseFigure(
    f: Fig,
    pos: XZ,
    lean: { side: number; fwd: number },
    footL: XZ,
    footR: XZ,
    handBall: [number, number, number] | null,
  ) {
    const [x, z] = pos;
    const y = f._y ?? 0;
    f.g.position.set(x, 0, z);
    // torso leans (rotate group about Z for lateral lean, X for forward)
    f.g.rotation.set(lean.fwd, 0, lean.side);
    f.torso.position.set(0, 2.3 + y, 0);
    f.head.position.set(0, 3.7 + y, 0);
    // hips/shoulders in group-local space
    const hipL = V(-0.45, 1.5 + y, 0),
      hipR = V(0.45, 1.5 + y, 0),
      shL = V(-0.6, 3.0 + y, 0),
      shR = V(0.6, 3.0 + y, 0);
    // feet given in WORLD-ish offset relative to root; convert to local by subtracting root x/z
    aimLimb(f.legL, hipL, V(footL[0] - x, 0, footL[1] - z));
    aimLimb(f.legR, hipR, V(footR[0] - x, 0, footR[1] - z));
    // arms: ball-side arm reaches to the ball, other relaxed
    aimLimb(
      f.armR,
      shR,
      handBall ? V(handBall[0] - x, handBall[1], handBall[2] - z) : V(0.9, 1.6 + y, 0.2),
    );
    aimLimb(f.armL, shL, V(-0.9, 1.6 + y, 0.2));
  }
  return { makeFigure, poseFigure };
}

/** Floor, paint, backboard and rim, in ground coordinates (rim at z=-22). */
export function buildStage(THREE: T3, scene: import("three").Scene): void {
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
    new THREE.MeshStandardMaterial({ color: 0x888 }),
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
