import { type Api, clamp } from "./common.js";
import { PHASES, PLANTS, SHOOTER, feet, rootKf, sample3 } from "./d3-choreography.js";
import { buildStage, createFigureKit, type Fig, type FigureKit, type Three } from "./d3-figures.js";

/* ---------------- TAB 5: 3D VIEW ---------------- */
export function initD3(root: HTMLElement): Api {
  const host = root.querySelector<HTMLElement>(".d3-canvas")!;
  const playBtn = root.querySelector<HTMLElement>(".d3play")!,
    scrub = root.querySelector<HTMLInputElement>(".d3scrub")!,
    rotChk = root.querySelector<HTMLInputElement>(".d3rot")!,
    sideBtn = root.querySelector<HTMLElement>(".d3side")!,
    phaseEl = root.querySelector<HTMLElement>(".d3phase")!,
    titleEl = root.querySelector<HTMLElement>("#d3phaseTitle")!;
  let THREE: Three,
    OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls,
    scene: import("three").Scene,
    cam: import("three").PerspectiveCamera,
    renderer: import("three").WebGLRenderer | undefined,
    controls: import("three/examples/jsm/controls/OrbitControls.js").OrbitControls,
    raf: number | null = null,
    built = false,
    a = 0,
    last = 0,
    playing = false;
  const DUR = 6000;
  const figs: {
    ball?: import("three").Mesh;
    off?: Fig;
    def?: Fig;
    plants?: import("three").Mesh[];
  } = {};
  let kit: FigureKit;
  function build() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a06);
    const w = host.clientWidth || 520,
      h = host.clientHeight || 520;
    cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    cam.position.set(16, 14, 18);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    host.append(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dl = new THREE.DirectionalLight(0xfff0d8, 1.1);
    dl.position.set(10, 20, 8);
    scene.add(dl);
    buildStage(THREE, scene);
    figs.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xff9b3c, roughness: 0.5 }),
    );
    scene.add(figs.ball);
    kit = createFigureKit(THREE, scene);
    figs.off = kit.makeFigure(0x36c98f);
    figs.def = kit.makeFigure(0x4aa8ff, 1.0);
    // ground footprints — the stride pattern, laid down as you pass each plant
    figs.plants = PLANTS.map((p) => {
      const col = p.kind === "sprint" ? 0x5b6b82 : p.kind === "chop" ? 0x4aa8ff : 0x36c98f;
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(p.kind === "stance" ? 0.44 : 0.36, 0.32, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }),
      );
      m.position.set(p.pos.x, 0.03, p.pos.z);
      m.visible = false;
      scene.add(m);
      return m;
    });
    controls = new OrbitControls(cam, renderer.domElement);
    controls.target.set(3, 2, -8);
    controls.enableDamping = true;
    controls.minDistance = 8;
    controls.maxDistance = 55;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    window.addEventListener("resize", onResize);
  }
  function onResize() {
    if (!renderer) return;
    const w = host.clientWidth || 520,
      h = host.clientHeight || 520;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  function render(t: number) {
    const [x, z] = sample3(rootKf, t);
    const crouch = clamp((t - 0.35) / 0.35, 0, 1); // stand → sink
    const { fL, fR } = feet(t); // stepping feet
    if (figs.plants)
      figs.plants.forEach((m, i) => {
        m.visible = PLANTS[i]!.t <= t;
      });
    // shooter holds ball at chest, raises to shoot at very end
    const shoot = clamp((t - 0.9) / 0.1, 0, 1);
    figs.ball!.position.set(SHOOTER[0] - 1.1, 2.4 + shoot * 2.2, SHOOTER[1] + 0.3);
    const sfL = { x: SHOOTER[0] - 0.5, z: SHOOTER[1] + 0.1, y: 0 },
      sfR = { x: SHOOTER[0] + 0.5, z: SHOOTER[1] - 0.1, y: 0 };
    kit.pose(
      figs.off!,
      SHOOTER,
      0.15,
      sfL,
      sfR,
      [SHOOTER[0] - 1, 2.6 + shoot * 2, SHOOTER[1] + 0.4],
      [SHOOTER[0] + 0.6, 2.2, SHOOTER[1] - 0.2],
      0,
    );
    // defender: high right hand toward the ball once close; low left hand walls the middle (−x side)
    const close = t > 0.7;
    const hhi: [number, number, number] = close
      ? [SHOOTER[0] - 1, 4.2, SHOOTER[1] + 0.3]
      : [x + 1.2, 2.4, z + 0.2];
    const hlo: [number, number, number] = close ? [x - 1.4, 0.8, z + 0.6] : [x - 1, 1.6, z + 0.2];
    kit.pose(figs.def!, [x, z], crouch, fL, fR, hhi, hlo, (1 - crouch) * 0.18);
    let ph = PHASES[0]!;
    PHASES.forEach((p) => {
      if (t >= p[0]) ph = p;
    });
    titleEl.textContent = ph[1];
    phaseEl.textContent = ph[2];
    scrub.value = String(Math.round(t * 1000));
  }
  function loop(ts: number) {
    if (!last) last = ts;
    if (playing) {
      a += (ts - last) / DUR;
      if (a >= 1) {
        a = 1;
        playing = false;
        playBtn.textContent = "↺ Play again";
      }
      render(a);
    }
    last = ts;
    controls.autoRotate = rotChk.checked;
    controls.autoRotateSpeed = 0.7;
    controls.update();
    renderer!.render(scene, cam);
    raf = requestAnimationFrame(loop);
  }
  async function onShow() {
    if (!built) {
      THREE = await import("three");
      ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
      build();
      render(0);
      built = true;
    }
    onResize();
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    }
  }
  function onHide() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  playBtn.addEventListener("click", () => {
    if (playing) {
      playing = false;
      playBtn.textContent = "▶ Play";
    } else {
      if (a >= 1) a = 0;
      playing = true;
      last = 0;
      playBtn.textContent = "❚❚ Pause";
    }
  });
  scrub.addEventListener("input", () => {
    playing = false;
    playBtn.textContent = "▶ Play";
    a = +scrub.value / 1000;
    if (built) render(a);
  });
  sideBtn.addEventListener("click", () => {
    if (!built) return;
    rotChk.checked = false;
    cam.position.set(20, 4, -8);
    controls.target.set(4, 2.5, -8.5);
    controls.update();
  });
  return {
    onShow: () => {
      onShow().catch((e: unknown) => {
        console.error("3D view failed to load:", e);
      });
    },
    onHide,
  };
}
