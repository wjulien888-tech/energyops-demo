/* 港科大（广州）校园数字孪生三维模型
 * 几何：OpenStreetMap 实测建筑轮廓（ODbL），高度由 building:levels 推算
 * 能耗：EnergyOps 已验证的聚合负荷与物理光伏模型输出（研究日 2026-02-19）
 * 说明：分楼负荷由合成校园负荷按建筑面积分配。
 */
import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { GLTFExporter } from "./vendor/GLTFExporter.js";

const $ = (id) => document.getElementById(id);
const rad = Math.PI / 180;

/* ------------------------------------------------------------------ 常量 */
const CAT = {
  lab:             { label: "实验楼",   color: 0xd9e0e8, roof: 0xa8b4c2 },
  library:         { label: "图书馆",   color: 0xe4ebf2, roof: 0x93a4b7 },
  admin:           { label: "行政办公", color: 0xd2dae4, roof: 0x9fadbd },
  student_life:    { label: "学生活动", color: 0xd6dde5, roof: 0x4c6a52 },
  sports:          { label: "体育设施", color: 0xc9d2dc, roof: 0x4e6357 },
  dorm:            { label: "学生宿舍", color: 0xd4d0c8, roof: 0xa89f92 },
  faculty_housing: { label: "教职工公寓", color: 0xd8d2c7, roof: 0xb0a696 },
  energy:          { label: "能源中心", color: 0x93a1af, roof: 0x6d7a88 },
  data_center:     { label: "数据中心", color: 0x9aa8ba, roof: 0x7a8797 },
  service:         { label: "配套设施", color: 0xa9b5c2, roof: 0x8b96a3 },
  transit:         { label: "轨道交通", color: 0x7f8b99, roof: 0x69737f },
  academic:        { label: "教学科研", color: 0xd6dde6, roof: 0xa4b1c0 },
};

const BATT = { cap: 400, init: 200, min: 40, max: 360, p: 150, eff: 0.95 };

let data, scene, camera, renderer, controls, world, sun, hemi, fill, ambient, skyMat, stars;
let dayTintMats = [];      // { mat, base, k } 白天向亮色插值的材质
let gridHelper = null;
const DAY_TINT = new THREE.Color(0xa9b7c6);
function regDay(mat, base, k, dayHex) {
  dayTintMats.push({ mat, base, k, day: new THREE.Color(dayHex != null ? dayHex : 0xa9b7c6) });
  return mat;
}
let buildings = [], bars = [], arcs = [], labelEls = [], raycaster, pointer;
let mode = "arch", hour = 12, playing = false, nightForce = false, autoSpin = false;
let labelsOn = true;
let socSeries = [], kpis = {}, pvTotalKwp = 1;
const clockHour = () => hour;

const state = { hover: null, selected: null, tween: null };

/* ------------------------------------------------------------------ 工具 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/* ------------------------------------------------------------------ 立面贴图 */
function facadeTextures() {
  const S = 256;
  const albedo = document.createElement("canvas");
  albedo.width = albedo.height = S;
  const g = albedo.getContext("2d");

  // 墙体底色（白，靠材质 color 上色）
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, S, S);
  // 楼板腰线
  const bandH = S * 0.2;
  g.fillStyle = "rgba(52,64,80,0.42)";
  g.fillRect(0, S - bandH, S, bandH);
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.fillRect(0, S - bandH, S, S * 0.012);

  // 两个开间，一个亮一个略暗，增加层次
  const draws = [
    { x: 0.09, w: 0.34, tone: 0.26 },
    { x: 0.57, w: 0.34, tone: 0.36 },
  ];
  for (const d of draws) {
    const x = d.x * S;
    const w = d.w * S;
    const y = S * 0.13;
    const h = S * 0.53;
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, `rgba(70,104,132,${d.tone + 0.3})`);
    grd.addColorStop(0.42, `rgba(46,74,100,${d.tone + 0.1})`);
    grd.addColorStop(1, `rgba(26,42,58,${d.tone})`);
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
    // 竖梃
    g.fillStyle = "rgba(235,242,250,0.55)";
    g.fillRect(x + w * 0.48, y, S * 0.008, h);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(x, y, w, S * 0.006);
  }

  // 自发光窗格
  const emis = document.createElement("canvas");
  emis.width = emis.height = S;
  const e = emis.getContext("2d");
  e.fillStyle = "#000";
  e.fillRect(0, 0, S, S);
  const lit = [1, 0, 1, 1, 0, 1];
  draws.forEach((d, i) => {
    if (!lit[i % lit.length]) return;
    const grad = e.createLinearGradient(0, S * 0.14, 0, S * 0.74);
    grad.addColorStop(0, "#ffe7bd");
    grad.addColorStop(1, "#ffbf7d");
    e.fillStyle = grad;
    e.fillRect(d.x * S, S * 0.13, d.w * S, S * 0.53);
  });

  const mk = (cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  return { map: mk(albedo), emissiveMap: mk(emis) };
}

/* ------------------------------------------------------------------ 场景基础 */
function initScene() {
  const canvas = $("stage");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1220, 0.00045);

  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 4, 8000);
  camera.position.set(860, 720, 1240);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(30, 0, 150);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.maxPolarAngle = Math.PI * 0.492;
  controls.minDistance = 60;
  controls.maxDistance = 2000;
  controls.zoomSpeed = 0.85;
  controls.enabled = false;

  world = new THREE.Group();
  scene.add(world);

  // 天空
  skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x0d2136) },
      uHorizon: { value: new THREE.Color(0x1b3448) },
      uBottom: { value: new THREE.Color(0x080f18) },
      uSunColor: { value: new THREE.Color(0xffe9c4) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSun: { value: 1 },
      uTwilight: { value: 0 },
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vDir;
      uniform vec3 uTop, uHorizon, uBottom, uSunColor, uSunDir;
      uniform float uSun;      // 0 夜 → 1 昼
      uniform float uTwilight; // 日升/日落权重
      void main(){
        float h = clamp(vDir.y*0.5+0.5, 0.0, 1.0);
        vec3 col = mix(uBottom, uHorizon, smoothstep(0.44, 0.53, h));
        col = mix(col, uTop, smoothstep(0.52, 0.95, h));
        float d = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
        // 日轮
        col += uSunColor * pow(d, 2400.0) * (2.2 + 2.6 * uSun);
        // 大气光晕：黄昏显著增强并压低
        col += uSunColor * pow(d, 8.0) * (0.06 + 0.5 * uTwilight) * mix(1.0, 0.45, uSun);
        col += uSunColor * pow(d, 48.0) * 0.35 * uTwilight;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3400, 32, 16), skyMat);
  sky.name = "sky";
  scene.add(sky);

  // 星空
  const sg = new THREE.BufferGeometry();
  const sp = [];
  const rnd = mulberry32(7);
  for (let i = 0; i < 1400; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 3200;
    const y = Math.abs(u) * 0.9;
    sp.push(Math.cos(th) * Math.sqrt(1 - y * y) * r, y * r, Math.sin(th) * Math.sqrt(1 - y * y) * r);
  }
  sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  stars = new THREE.Points(
    sg,
    new THREE.PointsMaterial({ color: 0xa9c6e4, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false })
  );
  scene.add(stars);

  // 光照
  sun = new THREE.DirectionalLight(0xfff1da, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  renderer.shadowMap.autoUpdate = false;
  const sc = sun.shadow.camera;
  sc.left = -760; sc.right = 760; sc.top = 760; sc.bottom = -760; sc.near = 10; sc.far = 2600;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  scene.add(sun.target);

  hemi = new THREE.HemisphereLight(0x8fb6dd, 0x141c26, 0.62);
  scene.add(hemi);

  fill = new THREE.DirectionalLight(0x4b86c8, 0.28);
  fill.position.set(-600, 380, -520);
  scene.add(fill);

  // 夜间体积补光：让建筑在无日照时仍读得出体量
  ambient = new THREE.AmbientLight(0x3a5f8a, 0.16);
  scene.add(ambient);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  addEventListener("resize", onResize);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  drawTimelineChart();
}

/* ------------------------------------------------------------------ 地面 / 水系 / 道路 */
function convexHull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

function buildSitePlate() {
  const pts = data.buildings.map((b) => [b.cx, b.cz]);
  const hull = convexHull(pts);
  const cx = hull.reduce((s2, p2) => s2 + p2[0], 0) / hull.length;
  const cz = hull.reduce((s2, p2) => s2 + p2[1], 0) / hull.length;
  const grown = hull.map(([x, z]) => {
    const dx = x - cx, dz = z - cz;
    const d = Math.hypot(dx, dz) || 1;
    return [x + (dx / d) * 62, z + (dz / d) * 62];
  });

  // 地面分层高度刻意拉开间隔，避免远景深度精度不足导致的 z-fighting 闪烁
  const plate = flatShape([grown], 0x12202f, 0.06, { roughness: 1, opacity: 0.92 });
  plate.children.forEach((m) => { m.receiveShadow = true; regDay(m.material, 0x12202f, 0.36, 0x60705f); });
  world.add(plate);

  const verts = grown.map(([x, z]) => new THREE.Vector3(x, 0.12, z));
  verts.push(verts[0].clone());
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(verts),
    new THREE.LineBasicMaterial({ color: 0x2b4a67, transparent: true, opacity: 0.75 })
  );
  world.add(line);
}

function buildGround() {
  const g = new THREE.PlaneGeometry(5200, 5200, 1, 1);
  g.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(
    g,
    regDay(new THREE.MeshStandardMaterial({ color: 0x0e1a28, roughness: 1, metalness: 0 }), 0x0e1a28, 0.42, 0x7d8f72)
  );
  ground.receiveShadow = true;
  ground.name = "ground";
  world.add(ground);

  gridHelper = new THREE.GridHelper(2600, 52, 0x1d3648, 0x142434);
  gridHelper.position.y = 0.14;          // 与地面(y=0)错开，避免共面 z-fighting 闪烁
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.55;
  gridHelper.material.depthWrite = false;
  world.add(gridHelper);
}

/* ------------------------------------------------------------------ 面片工具 */
function flatShape(polys, color, y, opts = {}) {
  const group = new THREE.Group();
  for (const poly of polys) {
    if (!poly || poly.length < 3) continue;
    const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.9,
      metalness: opts.metalness ?? 0,
      transparent: opts.opacity != null,
      opacity: opts.opacity ?? 1,
      side: THREE.DoubleSide,
      depthWrite: opts.opacity == null,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

function ribbon(pts, width, y) {
  const half = width / 2;
  const pos = [];
  const idx = [];
  let vi = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1];
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * half, nz = (dx / len) * half;
    pos.push(x1 + nx, y, z1 + nz, x1 - nx, y, z1 - nz, x2 + nx, y, z2 + nz, x2 - nx, y, z2 - nz);
    idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
    vi += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ 建筑 */
function buildBuildings() {
  const tex = facadeTextures();
  tex.map.repeat.set(1 / 13, 1 / 3.6);
  tex.emissiveMap.repeat.set(1 / 13, 1 / 3.6);

  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b5, roughness: 0.92, metalness: 0.02 });
  const rnd = mulberry32(21);

  for (const b of data.buildings) {
    const style = CAT[b.cat] || CAT.academic;
    const facade = new THREE.MeshStandardMaterial({
      map: tex.map,
      emissiveMap: tex.emissiveMap,
      emissive: new THREE.Color(0xffd9a3),
      emissiveIntensity: 0,
      color: new THREE.Color(style.color),
      roughness: 0.74,
      metalness: 0.06,
      transparent: true,
      opacity: 1,
    });

    const shapePts = b.pool.map(([x, z]) => new THREE.Vector2(x, -z));
    const shape = new THREE.Shape(shapePts);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);

    const rm = roofMat.clone();
    rm.name = `${b.name} / 屋面`;
    rm.color.setHex(style.roof);
    facade.name = `${b.name} / 幕墙`;
    const mesh = new THREE.Mesh(geo, [rm, facade]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = b.name;
    mesh.userData.building = b;
    mesh.userData.baseOpacity = 1;
    world.add(mesh);

    // 屋顶设备 / 天窗
    const boxes = new THREE.Group();
    const nBox = b.area > 3000 ? 2 : 1;
    for (let i = 0; i < nBox; i++) {
      let tries = 0, x = 0, z = 0, ok = false;
      const bw = 4 + rnd() * 6, bd = 4 + rnd() * 6, bh = 1.4 + rnd() * 2.2;
      while (!ok && tries++ < 40) {
        x = b.cx + (rnd() - 0.5) * Math.sqrt(b.area) * 0.7;
        z = b.cz + (rnd() - 0.5) * Math.sqrt(b.area) * 0.7;
        ok = pointInPoly(x, z, b.pool);
      }
      if (!ok) continue;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, bd),
        new THREE.MeshStandardMaterial({ color: 0x6e7a88, roughness: 0.85 })
      );
      box.position.set(x, b.h + bh / 2, z);
      box.castShadow = true;
      box.name = `${b.name} / 屋顶设备`;
      box.material.name = `${b.name} / 设备`;
      boxes.add(box);
    }
    boxes.userData.isBoxes = true;
    boxes.name = `${b.name} / 屋顶`;
    world.add(boxes);

    // 能量柱（负荷模式）
    const barH = 4;
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 6.4, 1, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x35d6e0, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })
    );
    bar.geometry.translate(0, 0.5, 0);
    bar.name = `${b.name} / 负荷柱`;
    bar.material.name = `${b.name} / 负荷柱`;
    bar.position.set(b.cx, b.h + 1.2, b.cz);
    bar.visible = false;
    world.add(bar);

    buildings.push({ data: b, mesh, facade, roof: rm, bar, boxes, loadKw: 0, pvKw: 0 });
  }
}

/* 屋顶光伏阵列 */
function buildPv() {
  const panelGeo = new THREE.BoxGeometry(4.2, 0.12, 2.1);
  panelGeo.rotateX(10 * rad);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x12223c,
    roughness: 0.3,
    metalness: 0.62,
    emissive: new THREE.Color(0x1e4f8f),
    emissiveIntensity: 0.03,
  });

  const list = [];
  for (const item of buildings) {
    const b = item.data;
    if (!b.pv) continue;
    const stepX = 5.0, stepZ = 3.0;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const [x, z] of b.pool) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    const inset = 3.0;
    let row = 0;
    for (let z = minZ + inset; z <= maxZ - inset; z += stepZ, row++) {
      if (row % 5 === 4) continue; // 检修通道
      for (let x = minX + inset; x <= maxX - inset; x += stepX) {
        const corners = [
          [x - 1.9, z - 0.95], [x + 1.9, z - 0.95], [x - 1.9, z + 0.95], [x + 1.9, z + 0.95],
        ];
        if (!corners.every(([cx, cz]) => pointInPoly(cx, cz, b.pool))) continue;
        list.push({ x, z, y: b.h + 0.5, b: item });
      }
    }
  }

  const inst = new THREE.InstancedMesh(panelGeo, mat, list.length);
  inst.castShadow = false;
  inst.receiveShadow = false;
  inst.name = "rooftop-pv";
  const m = new THREE.Matrix4();
  list.forEach((p, i) => {
    m.makeTranslation(p.x, p.y, p.z);
    inst.setMatrixAt(i, m);
  });
  inst.instanceMatrix.needsUpdate = true;
  inst.userData.pvMat = mat;
  inst.userData.count = list.length;
  world.add(inst);
  world.userData.pvInst = inst;

  const modules = list.length;
  return modules;
}


/* ------------------------------------------------------------------ 光伏车棚（规划示意） */
function buildCarports() {
  if (!data.parkings || !data.parkings.length) return 0;
  const canopyMat = regDay(
    new THREE.MeshStandardMaterial({ color: 0x46536a, roughness: 0.65, metalness: 0.3 }),
    0x46536a, 0.55, 0xa4b0bd
  );
  const postMat = regDay(
    new THREE.MeshStandardMaterial({ color: 0x39424e, roughness: 0.8, metalness: 0.3 }),
    0x39424e, 0.5
  );
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1a3352,
    roughness: 0.32,
    metalness: 0.6,
    emissive: new THREE.Color(0x2fae6e),
    emissiveIntensity: 0.03,
  });

  const panelGeo = new THREE.BoxGeometry(4.82, 0.12, 2.92);
  const postGeo = new THREE.CylinderGeometry(0.38, 0.38, 4.94, 6);
  postGeo.translate(0, 2.47, 0);

  const list = [];
  for (const p of data.parkings) {
    // 棚顶面
    const canopy = flatShape([p.pool], 0x46536a, 4.92, { roughness: 0.65 });
    canopy.children.forEach((m) => { m.material = canopyMat; m.castShadow = true; m.name = "光伏车棚/棚顶"; });
    world.add(canopy);
    // 檐口边梁：一圈 0.5 m 高的竖向封边，让车棚在鸟瞰下读得出是「棚」而不是地面
    const fasciaMat = regDay(
      new THREE.MeshStandardMaterial({ color: 0x5b6a7d, roughness: 0.7, metalness: 0.25 }),
      0x5b6a7d, 0.5, 0xb3bec9
    );
    for (let i = 0; i < p.pool.length; i++) {
      const [x1, z1] = p.pool[i];
      const [x2, z2] = p.pool[(i + 1) % p.pool.length];
      const len = Math.hypot(x2 - x1, z2 - z1) * 0.98;
      if (len < 2) continue;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.22), fasciaMat);
      beam.position.set((x1 + x2) / 2, 4.72, (z1 + z2) / 2);
      beam.rotation.y = Math.atan2(-(z2 - z1), x2 - x1);
      beam.name = "光伏车棚/檐口";
      world.add(beam);
    }

    // 立柱：轮廓 bbox 四角
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const [x, z] of p.pool) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    for (const [px, pz] of [[minX + 2, minZ + 2], [maxX - 2, minZ + 2], [minX + 2, maxZ - 2], [maxX - 2, maxZ - 2]]) {
      if (pointInPoly(px, pz, p.pool)) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, 0, pz);
        post.name = "光伏车棚/立柱";
        world.add(post);
      }
    }

    // 组件阵列（倾斜 8°）
    const stepX = 5.0, stepZ = 3.05, inset = 2.5;
    for (let z = minZ + inset; z <= maxZ - inset; z += stepZ) {
      for (let x = minX + inset; x <= maxX - inset; x += stepX) {
        // 四角都落在停车场轮廓内才铺，避免组件挑出到草地
        const corners = [[x - 2.3, z - 1.4], [x + 2.3, z - 1.4], [x - 2.3, z + 1.4], [x + 2.3, z + 1.4]];
        if (!corners.every(([cx, cz]) => pointInPoly(cx, cz, p.pool))) continue;
        list.push({ x, y: 5.08, z });
      }
    }
  }

  const inst = new THREE.InstancedMesh(panelGeo, panelMat, Math.max(1, list.length));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();          // 平铺，避免组件悬空与缝隙过大
  const one = new THREE.Vector3(1, 1, 1);
  list.forEach((pt, i) => {
    m.compose(new THREE.Vector3(pt.x, pt.y, pt.z), q, one);
    inst.setMatrixAt(i, m);
  });
  inst.instanceMatrix.needsUpdate = true;
  inst.name = "光伏车棚/组件";
  world.add(inst);
  world.userData.carportInst = inst;
  world.userData.carportMat = panelMat;
  return list.length;
}

/* ------------------------------------------------------------------ 幕墙 BIPV（规划示意） */
function buildBipv() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2b2f55,
    roughness: 0.18,
    metalness: 0.75,
    emissive: new THREE.Color(0x6a5df0),
    emissiveIntensity: 0.03,
    side: THREE.DoubleSide,
  });
  let n = 0;
  for (const item of buildings) {
    const b = item.data;
    if (!b.bipvKwp || b.bipvKwp < 60) continue;

    // 质心用于判断边朝外方向
    const cx = b.cx, cz = b.cz;
    const poly = b.pool;
    const hBand = Math.max(8, b.h - 5);           // 幕墙高度：距地 2 m 起，避开屋顶
    for (let i = 0; i < poly.length; i++) {
      const [x1, z1] = poly[i];
      const [x2, z2] = poly[(i + 1) % poly.length];
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 10) continue;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      // 边中点相对质心的外法向（只用 z 分量判断是否朝南）
      const ox = mx - cx, oz = mz - cz;
      const on = Math.hypot(ox, oz) || 1;
      if (oz / on < 0.55) continue;               // 只取朝南（+z）的立面
      const geo = new THREE.BoxGeometry(len * 0.94, hBand, 0.24);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(mx + (ox / on) * 0.5, 2 + hBand / 2, mz + (oz / on) * 0.5);
      m.rotation.y = Math.atan2(-dz, dx);
      m.name = `${b.name} / 幕墙BIPV`;
      world.add(m);
      n++;
    }
  }
  world.userData.bipvMat = mat;
  world.userData.bipvCount = n;
  return n;
}

/* ------------------------------------------------------------------ 道路 / 树 */
function buildGroundDetail() {
  // 水系
  const water = flatShape(data.water, 0x0a2e42, 0.30, { roughness: 0.12, metalness: 0.62 });
  water.children.forEach((m) => { m.receiveShadow = true; m.name = "water"; regDay(m.material, 0x0a2e42, 0.3, 0x3f7290); });
  world.add(water);

  for (const w of data.waterways) {
    const geo = ribbon(w.pts, w.kind === "canal" ? 18 : 26, 0.34);
    const m = new THREE.Mesh(geo, regDay(new THREE.MeshStandardMaterial({ color: 0x0a2b3d, roughness: 0.25, metalness: 0.5 }), 0x0a2b3d, 0.3));
    world.add(m);
  }

  // 运动场地
  const pitches = flatShape(data.pitches, 0x14301f, 0.22, { roughness: 0.95 });
  pitches.children.forEach((m) => regDay(m.material, 0x14301f, 0.32, 0x4c7a44));
  world.add(pitches);

  // 道路：各类道路取不同高度，交叉重叠处按层级覆盖，避免同平面 z-fighting
  const roadColors = { tertiary: 0x25384c, residential: 0x213246, service: 0x1e2e40, footway: 0x243648, path: 0x243648, steps: 0x243648, unclassified: 0x213246, tertiary_link: 0x25384c };
  const widths = { tertiary: 14, tertiary_link: 9, residential: 9, service: 6, footway: 3, path: 2.5, steps: 3, unclassified: 7 };
  const roadY = { footway: 0.18, path: 0.20, steps: 0.20, service: 0.24, unclassified: 0.26, residential: 0.28, tertiary_link: 0.30, tertiary: 0.32 };
  for (const r of data.roads) {
    if (r.pts.length < 2) continue;
    const geo = ribbon(r.pts, widths[r.cls] || 5, r.bridge ? 0.6 : (roadY[r.cls] ?? 0.22));
    const base = roadColors[r.cls] || 0x182636;
    const m = new THREE.Mesh(geo, regDay(new THREE.MeshStandardMaterial({ color: base, roughness: 0.85 }), base, 0.5, 0x8b939f));
    m.receiveShadow = true;
    world.add(m);
  }
}

function buildTrees() {
  const rnd = mulberry32(99);
  const pts = [];
  let guard = 0;
  while (pts.length < 820 && guard++ < 30000) {
    const x = (rnd() - 0.5) * 1000 - 40;
    const z = (rnd() - 0.42) * 1150 + 130;
    let ok = Math.hypot(x, z - 140) < 620;
    if (!ok) continue;
    for (const item of buildings) if (pointInPoly(x, z, item.data.pool)) { ok = false; break; }
    if (!ok) continue;
    for (const w of data.water) if (pointInPoly(x, z, w)) { ok = false; break; }
    if (!ok) continue;
    for (const pk of data.parkings || []) if (pointInPoly(x, z, pk.pool)) { ok = false; break; }
    if (!ok) continue;
    for (const pk of data.parkings || []) if (pointInPoly(x, z, pk.pool)) { ok = false; break; }
    if (!ok) continue;
    pts.push([x, z]);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.46, 3.2, 5);
  trunkGeo.translate(0, 1.6, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 0);
  crownGeo.scale(2.4, 2.9, 2.4);
  crownGeo.translate(0, 5.1, 0);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.95 });
  const crownMat = regDay(new THREE.MeshStandardMaterial({ color: 0x24402c, roughness: 0.9, flatShading: true }), 0x24402c, 0.34, 0x4a744c);

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, pts.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, pts.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  pts.forEach(([x, z], i) => {
    const sc = 0.7 + rnd() * 0.75;
    p.set(x, 0, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    s.set(sc, sc * (0.85 + rnd() * 0.4), sc);
    m.compose(p, q, s);
    trunks.setMatrixAt(i, m);
    crowns.setMatrixAt(i, m);
  });
  trunks.castShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = true;
  world.add(trunks, crowns);
}

/* ------------------------------------------------------------------ 潮流 */
// 电网接入点（示意）：城市电网自校园东侧接入，向各楼宇负荷供电。
// 线路按合成楼栋峰值负荷绘制，供场景示意。
const INTAKE = { x: 395, z: 110 };

function buildFlows() {
  // 接入点标记：地面圆环 + 立柱光束
  const marker = new THREE.Group();
  marker.name = "电网接入点（示意）";
  const amber = 0xffc46b;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(7, 9.5, 32),
    new THREE.MeshBasicMaterial({ color: amber, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(INTAKE.x, 0.6, INTAKE.z);
  marker.add(ring);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 96, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: amber, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  beam.position.set(INTAKE.x, 48, INTAKE.z);
  marker.add(beam);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  head.position.set(INTAKE.x, 14, INTAKE.z);
  marker.add(head);

  marker.visible = false;   // 仅潮流模式显示
  world.add(marker);
  world.userData.intake = marker;

  // 目标：合成负荷峰值较高的楼宇
  const targets = buildings
    .slice()
    .filter((item) => item.data.demoLoad)
    .sort((a, b) => Math.max(...b.data.demoLoad.loadKw) - Math.max(...a.data.demoLoad.loadKw))
    .slice(0, 9);
  if (!targets.length) return;
  const maxShare = Math.max(...targets[0].data.demoLoad.loadKw) || 1;

  targets.forEach((t, i) => {
    const isDc = false;
    const w = clamp(Math.max(...t.data.demoLoad.loadKw) / maxShare, 0.12, 1);   // 相对负荷 -> 线径
    // 起点在接入点周围散开，避免多条管线在一点叠加叠加成一团白光
    const ang = (i / targets.length) * Math.PI * 2;
    const from = new THREE.Vector3(
      INTAKE.x + Math.cos(ang) * 9,
      24 + (i % 3) * 4,
      INTAKE.z + Math.sin(ang) * 9
    );
    const to = new THREE.Vector3(t.data.cx, Math.max(16, t.data.h * 0.8), t.data.cz);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y = Math.max(from.y, to.y) + 26 + from.distanceTo(to) * 0.13;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = new THREE.TubeGeometry(curve, 56, 0.9 + w * 2.1, 6, false);
    const col = isDc ? 0xffc46b : 0x53e6f2;
    const mat = new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const tube = new THREE.Mesh(geo, mat);
    tube.visible = false;
    world.add(tube);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(2.2 + w * 1.2, 10, 8),
      new THREE.MeshBasicMaterial({ color: isDc ? 0xffe2b0 : 0xa8f4ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    dot.visible = false;
    world.add(dot);
    arcs.push({ curve, tube, dot, target: t, offset: Math.random(), w, isDc, kind: "grid" });
  });

  // 园区屋面光伏汇集点及数据中心的示意连接，不代表真实接线。
  const dc = buildings.find((item) => item.data.cat === "data_center");
  const roof = buildings.reduce((largest, item) => item.data.pvKwp > largest.data.pvKwp ? item : largest);
  if (dc && roof) {
    const from = new THREE.Vector3(roof.data.cx, roof.data.h + 10, roof.data.cz);
    const to = new THREE.Vector3(dc.data.cx, dc.data.h + 10, dc.data.cz);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y = Math.max(from.y, to.y) + 80;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 2.5, 6, false),
      new THREE.MeshBasicMaterial({color: 0x55edaf, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false}));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6),
      new THREE.MeshBasicMaterial({color: 0xb4ffdc, transparent: true, opacity: 0.95, depthWrite: false}));
    tube.visible = dot.visible = false;
    world.add(tube, dot);
    arcs.push({curve, tube, dot, offset: 0, kind: "solar"});
  }
}

/* ------------------------------------------------------------------ 标注 */
const KEY_NAMES = ["图书馆", "行政大楼", "能源中心", "体育馆", "C2 活动中心", "数据中心 智算中心"];

function buildLabels() {
  const wrap = document.createElement("div");
  wrap.id = "labels";
  document.body.appendChild(wrap);

  const picked = buildings
    .filter((b) => b.data.area > 2600 || KEY_NAMES.includes(b.data.name))
    .sort((a, b) => b.data.area - a.data.area)
    .slice(0, 12);

  for (const b of picked) {
    const el = document.createElement("div");
    el.className = "label3d" + (KEY_NAMES.includes(b.data.name) ? " key" : "");
    el.textContent = b.data.name;
    wrap.appendChild(el);
    labelEls.push({ el, b, pos: new THREE.Vector3(b.data.cx, b.data.h + 8, b.data.cz) });
  }

  // 电网接入点标注（潮流模式）
  const gi = document.createElement("div");
  gi.className = "label3d key";
  gi.textContent = "电网接入点（示意）";
  gi.style.display = "none";
  wrap.appendChild(gi);
  world.userData.intakeLabel = gi;
  labelEls.push({ el: gi, b: null, pos: new THREE.Vector3(INTAKE.x, 78, INTAKE.z) });
}

/* ------------------------------------------------------------------ 能耗状态 */
function computeEnergy() {
  const { loadKw, pvKw, solar } = data.series;
  pvTotalKwp = data.buildings.reduce((s, b) => s + (b.pvKwp || 0), 0) || 1;

  let soc = BATT.init;
  socSeries = [];
  for (let h = 0; h < 24; h++) {
    const net = loadKw[h] - pvKw[h];
    let chg = 0;
    if (net < 0) chg = Math.min(-net, BATT.p) * BATT.eff;
    else chg = -Math.min(net, BATT.p) / BATT.eff;
    soc = clamp(soc + chg, BATT.min, BATT.max);
    socSeries[h] = soc;
  }
  state.solar = solar;
}

function applyHour(h, instant) {
  hour = ((h % 24) + 24) % 24;
  const s = data.series;
  const load = s.loadKw[hour];
  const pv = s.pvKw[hour];
  const solar = s.solar[hour];
  const pvRatio = pv / Math.max(1, data.kpi.pvPeakKw);
  const alt = solar.alt;
  const dayF = smooth(-7, 9, alt);
  const night = 1 - dayF;

  // 太阳方向：方位角自北顺时针，北 = -z
  const azr = solar.az * rad, altr = alt * rad;
  const dir = new THREE.Vector3(
    Math.sin(azr) * Math.cos(altr),
    Math.sin(altr),
    -Math.cos(azr) * Math.cos(altr)
  ).normalize();
  skyMat.uniforms.uSunDir.value.copy(dir);
  skyMat.uniforms.uSun.value = dayF;
  // 黄昏权重：太阳在地平线附近达到峰值，白天和深夜都归零
  const twilight = smooth(-9, 0, alt) * (1 - smooth(6, 17, alt));
  skyMat.uniforms.uTwilight.value = twilight;

  // 太阳落到地平线以下时，让平行光贴着地平线擦过，避免整场变黑
  const lampDir = dir.clone();
  if (lampDir.y < 0.07) { lampDir.y = 0.26; lampDir.normalize(); }
  sun.position.copy(lampDir).multiplyScalar(1100);
  sun.target.position.set(0, 0, 100);
  sun.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true;
  sun.intensity = 0.18 + 2.35 * clamp(Math.sin(altr) * 1.35 + 0.55 * twilight, 0, 1);
  // 太阳颜色：清晨/黄昏暖橙，正午暖白
  sun.color.setHSL(0.075 - 0.045 * dayF, 0.55 + 0.25 * twilight, 0.62 + 0.16 * dayF);

  hemi.intensity = 0.4 + 0.7 * dayF + 0.16 * twilight;
  hemi.color.setHex(0x3a5f86).lerp(new THREE.Color(0xbdd9f2), dayF).lerp(new THREE.Color(0xffb583), twilight * 0.7);
  hemi.groundColor.setHex(0x1a2230).lerp(new THREE.Color(0x8a8b74), dayF * 0.85);
  fill.intensity = 0.18 + 0.3 * dayF;
  fill.color.setHex(0x2b4a6e).lerp(new THREE.Color(0x9db8d8), dayF);
  ambient.intensity = 0.14 + 0.42 * night + 0.22 * twilight + 0.05 * dayF;
  stars.material.opacity = (1 - smooth(-12, -3, alt)) * 0.9;

  // 地面/道路/树木昼间提亮，网格线白天减淡
  for (const t of dayTintMats) t.mat.color.setHex(t.base).lerp(t.day, dayF * t.k);
  if (gridHelper) gridHelper.material.opacity = 0.55 * (1 - dayF * 0.75);

  // 天空配色：夜 → 黄昏 → 昼 连续插值
  const C = (hex) => new THREE.Color(hex);
  const topC = C(0x050912).lerp(C(0x4f97d4), dayF);
  const horC = C(0x0b1424).lerp(C(0x9cc6e2), dayF).lerp(C(0xf59a4e), twilight * 1.0);
  const botC = C(0x070d15).lerp(C(0x86aec9), dayF).lerp(C(0xc9703c), twilight * 0.8);
  skyMat.uniforms.uTop.value.copy(topC);
  skyMat.uniforms.uHorizon.value.copy(horC);
  skyMat.uniforms.uBottom.value.copy(botC);
  skyMat.uniforms.uSunColor.value.copy(C(0xfff3d8).lerp(C(0xffb469), twilight));
  // 雾色随天色走，白天远景泛蓝、黄昏泛暖
  if (scene.fog) { scene.fog.color.copy(horC).lerp(topC, 0.35); scene.fog.density = 0.00045 - 0.00026 * dayF; }

  const nightLook = Math.max(night, nightForce ? 1 : 0);
  const windowGlow = smooth(0.35, 1, nightLook) * 0.95 + (hour >= 18 || hour <= 6 ? 0.25 : 0);

  // 分楼负荷 / 光伏
  let maxLoad = 1;
  const perBuilding = buildings.map((item) => {
    const b = item.data;
    const l = b.demoLoad ? b.demoLoad.loadKw[hour] : null;
    item.loadKw = l;
    item.pvKw = pv * ((b.pvKwp || 0) / pvTotalKwp);
    maxLoad = Math.max(maxLoad, l);
    return item;
  });

  for (const item of perBuilding) {
    const t = clamp((item.loadKw ?? 0) / maxLoad, 0, 1);
    item.facade.emissiveIntensity = windowGlow;

    if (mode === "load") {
      if (item.loadKw === null) item.facade.emissive.setHex(0x30343a);
      else item.facade.emissive.setHSL(lerp(0.55, 0.02, t), 0.85, 0.55);
      item.facade.emissiveIntensity = item.loadKw === null ? 0.12 : 0.28 + t * 1.15;
      item.bar.visible = item.loadKw !== null;
      const bh = 26 + t * 118;
      item.bar.scale.y += (bh - item.bar.scale.y) * (instant ? 1 : 0.15);
      item.bar.material.color.setHSL(lerp(0.52, 0.02, t), 0.9, 0.6);
      item.bar.material.opacity = 0.42 + t * 0.4;
    } else {
      item.bar.visible = false;
      item.facade.emissive.setHex(0xffd9a3);
      item.facade.emissiveIntensity = windowGlow * 0.9;
    }

    if (mode === "pv") {
      item.facade.emissive.setHex(0x1c2b3e);
      item.facade.emissiveIntensity = 0.03 + (item.data.bipvKwp ? 0.3 : 0.02) * pvRatio;
    }
  }

  if (world.userData.pvInst) {
    const pvMat = world.userData.pvInst.userData.pvMat;
    pvMat.emissiveIntensity = mode === "pv" ? 0.14 + pvRatio * 0.65 : 0.02 + pvRatio * 0.14;
    pvMat.emissive.setHex(mode === "pv" ? 0x38e0d0 : 0x1e4f8f);
  }
  if (world.userData.carportMat) {
    const cm = world.userData.carportMat;
    cm.emissiveIntensity = mode === "pv" ? 0.12 + pvRatio * 0.6 : 0.02 + pvRatio * 0.1;
    cm.emissive.setHex(mode === "pv" ? 0x46e08a : 0x2fae6e);
  }
  if (world.userData.bipvMat) {
    const bm = world.userData.bipvMat;
    bm.emissiveIntensity = mode === "pv" ? 0.1 + pvRatio * 0.55 : 0.02 + pvRatio * 0.08;
    bm.emissive.setHex(mode === "pv" ? 0x8f7ef2 : 0x6a5df0);
  }

  // 潮流
  for (const a of arcs) {
    const gridFraction = clamp((load - pv) / Math.max(1, load), 0, 1);
    const on = mode === "flow" && (a.kind === "solar" ? pv > 1 : gridFraction > 0.01);
    a.tube.visible = on;
    a.dot.visible = on;
    a.strength = a.kind === "solar" ? clamp(pvRatio, 0.2, 1) : gridFraction;
  }
  if (world.userData.intake) world.userData.intake.visible = mode === "flow";
  $("flowStatus").textContent = pv <= 1 ? "当前无屋面光伏出力" : pv >= load ? "屋面光伏出力高于合成负荷；可向数据中心供电（示意）" : "屋面光伏可向数据中心及其他负荷供电（示意）";

  // HUD
  const net = load - pv;
  const curtail = Math.max(0, -net - BATT.p);
  const soc = socSeries[hour];
  kpis = { load, pv, net, soc, curtail, alt, ghi: solar.ghi, temp: solar.temp };
  updateHud(kpis, solar);
  if (state.selected) renderDetail(state.selected);

  $("tlRange").value = hour;
  $("tlCursor").style.left = `${(hour / 23) * 100}%`;
  [...$("tlTicks").children].forEach((el, i) => el.classList.toggle("on", i === hour));
}

function updateHud(k, solar) {
  $("clockTime").textContent = `${String(hour).padStart(2, "0")}:00`;
  $("clockWeather").textContent = `辐照 ${k.ghi.toFixed(0)} W/m² · ${k.temp.toFixed(1)}°C`;
  $("kLoad").textContent = (k.load / 1000).toFixed(2);
  $("kPv").textContent = (k.pv / 1000).toFixed(2);
  $("kNet").textContent = (k.net / 1000).toFixed(2);
  $("kNet").style.color = k.net < 0 ? "#5fe3c8" : "#ffd08a";
  $("kSoc").textContent = Math.round((k.soc / BATT.cap) * 100);
  $("kLoadBar").style.width = `${clamp((k.load / data.kpi.loadPeakKw) * 100, 3, 100)}%`;
  $("kPvBar").style.width = `${clamp((k.pv / data.kpi.pvPeakKw) * 100, 0, 100)}%`;
  $("kNetBar").style.width = `${clamp((Math.abs(k.net) / data.kpi.loadPeakKw) * 100, 2, 100)}%`;
  $("kSocBar").style.width = `${clamp((k.soc / BATT.cap) * 100, 2, 100)}%`;
  // 光伏构成实时出力（车棚 / BIPV 按屋面曲线等比缩放，规划示意）
  const pr = k.pv / Math.max(1, data.kpi.pvPeakKw);
  $("pvRoofVal").textContent = `${(k.pv / 1000).toFixed(2)} MW`;
  $("pvCarportVal").textContent = `${((data.pv.carportKwp * pr) / 1000).toFixed(2)} MW`;
  $("pvBipvVal").textContent = `${((data.pv.bipvKwp * pr) / 1000).toFixed(2)} MW`;
  $("kCurtail").textContent = k.curtail > 1 ? `${(k.curtail / 1000).toFixed(2)} MW` : "0 kW";
  $("curtailCard").style.opacity = k.curtail > 1 ? 1 : 0.45;
  $("curtailNote").textContent =
    k.curtail > 1
      ? `光伏 ${(k.pv / 1000).toFixed(2)} MW 超出负荷与储能消纳能力，需限发 ${(k.curtail / 1000).toFixed(2)} MW。`
      : "光伏出力可被负荷与储能完全消纳，无限发。";
}

/* ------------------------------------------------------------------ 交互 */
function renderDetail(item) {
  const b = item.data;
  const info = CAT[b.cat] || CAT.academic;
  $("detail").hidden = false;
  $("detailCat").textContent = info.label;
  $("detailName").textContent = b.name;
  const dayKwh = b.demoLoad ? b.demoLoad.loadKw.reduce((a, v) => a + v, 0) : null;
  const pvKwh = b.pvKwp * (data.kpi.pvDayKwh / Math.max(1, data.kpi.pvKwp));
  const rows = [
    ["楼层 / 高度", `${b.levels} 层 · ${b.h} m`],
    ["占地 / 屋面", `${b.area.toLocaleString()} m²`],
    ["当前负荷", item.loadKw === null ? "未匹配" : `${item.loadKw.toFixed(1)} kW`],
    ["今日用电", dayKwh === null ? "未匹配" : `${Math.round(dayKwh).toLocaleString()} kWh`],
    ["屋面光伏", b.pvKwp ? `${b.pvKwp.toFixed(0)} kWp` : "—"],
    ["当前光伏", b.pvKwp ? `${item.pvKw.toFixed(0)} kW` : "—"],
    ["幕墙 BIPV", b.bipvKwp ? `${b.bipvKwp.toFixed(0)} kWp（规划示意）` : "—"],
    ["今日发电", b.pvKwp ? `${Math.round(pvKwh).toLocaleString()} kWh` : "—"],
    ["单位面积", dayKwh === null ? "未匹配" : `${(dayKwh / b.area).toFixed(3)} kWh/m²·d`],
  ];
  rows.push(["负荷口径", "合成校园负荷按建筑面积分配"]);
  $("detailList").innerHTML = rows
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join("");
}

function pickBuilding(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(buildings.map((b) => b.mesh), false);
  if (!hits.length) return null;
  return buildings.find((b) => b.mesh === hits[0].object) || null;
}

function syncIntakeLabel() {
  const el = world.userData.intakeLabel;
  if (el) el.style.display = mode === "flow" && labelsOn ? "" : "none";
}

function wireInteraction() {
  const canvas = renderer.domElement;
  let down = null;

  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5) return;
    const item = pickBuilding(e);
    if (item) {
      state.selected = item;
      renderDetail(item);
      highlight(item);
    } else {
      $("detail").hidden = true;
      state.selected = null;
      highlight(null);
    }
    $("hint").classList.add("hide");
  });

  let lastPick = 0;
  canvas.addEventListener("pointermove", (e) => {
    if (performance.now() - lastPick < 80 || e.buttons) return;
    lastPick = performance.now();
    const item = pickBuilding(e);
    if ((item || null) !== state.hover) {
      state.hover = item;
      canvas.style.cursor = item ? "pointer" : "grab";
    }
  });

  $("detailClose").onclick = () => {
    $("detail").hidden = true;
    state.selected = null;
    highlight(null);
  };

  // 模式
  $("modeSeg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    mode = btn.dataset.mode;
    [...$("modeSeg").children].forEach((b) => b.classList.toggle("on", b === btn));
    $("legend").classList.toggle("show", mode === "load" || mode === "pv" || mode === "flow");
  $("loadLegend").hidden = mode !== "load";
  $("pvLegend").hidden = mode !== "pv";
  $("flowLegend").hidden = mode !== "flow";
    applyHour(hour, true);
    syncIntakeLabel();
  });

  $("btnLabels").onclick = () => {
    labelsOn = $("btnLabels").classList.toggle("on");
    labelEls.forEach((l) => (l.el.style.display = labelsOn ? "" : "none"));
    syncIntakeLabel();
  };
  $("btnNight").onclick = () => {
    nightForce = !nightForce;
    $("btnNight").classList.toggle("on", nightForce);
    applyHour(hour);
  };
  $("btnSpin").onclick = () => {
    autoSpin = !autoSpin;
    $("btnSpin").classList.toggle("on", autoSpin);
  };
  $("btnReset").onclick = () => flyTo([640, 560, 980], [30, 0, 150]);
  $("btnGlb").onclick = exportGlb;

  // 时间轴
  $("tlRange").addEventListener("input", (e) => {
    applyHour(parseInt(e.target.value, 10));
  });
  $("btnPlay").onclick = togglePlay;

  addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.key === "1") $("modeSeg").children[0].click();
    if (e.key === "2") $("modeSeg").children[1].click();
    if (e.key === "3") $("modeSeg").children[2].click();
    if (e.key === "4") $("modeSeg").children[3].click();
    if (e.key === "ArrowRight") applyHour(hour + 1);
    if (e.key === "ArrowLeft") applyHour(hour - 1);
  });
}

function highlight(item) {
  for (const b of buildings) {
    const sel = item && b === item;
    b.facade.opacity = item ? (sel ? 1 : 0.55) : 1;
    b.roof.opacity = item ? (sel ? 1 : 0.55) : 1;
    b.roof.transparent = !!item;
  }
}

let playTimer = null;
function togglePlay() {
  playing = !playing;
  $("playIcon").setAttribute("d", playing ? "M8 5h3v14H8zM13 5h3v14h-3z" : "M8 5l11 7-11 7z");
  if (playing) {
    playTimer = setInterval(() => {
      const next = (hour + 1) % 24;
      applyHour(next);
    }, 620);
  } else {
    clearInterval(playTimer);
  }
}

/* ------------------------------------------------------------------ 时间轴图表 */
function drawTimelineChart() {
  const svg = $("tlSvg");
  if (!svg || !data) return;
  const W = 1000, H = 100;
  const { loadKw, pvKw } = data.series;
  const maxL = Math.max(...loadKw, ...pvKw) * 1.08;
  const px = (i) => (i / 23) * W;
  const py = (v) => H - (v / maxL) * H;

  const line = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join("");
  const area = (arr) => `${line(arr)}L${W},${H}L0,${H}Z`;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5c9dff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#5c9dff" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffb347" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="#ffb347" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${area(pvKw)}" fill="url(#gPv)"/>
    <path d="${line(pvKw)}" fill="none" stroke="#ffb347" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <path d="${area(loadKw)}" fill="url(#gLoad)"/>
    <path d="${line(loadKw)}" fill="none" stroke="#6aa8ff" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
  `;
}

function buildTicks() {
  const box = $("tlTicks");
  box.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span");
    s.textContent = i % 3 === 0 ? String(i).padStart(2, "0") : "";
    box.appendChild(s);
  }
}

/* ------------------------------------------------------------------ 相机动画 */
function flyTo(pos, target, dur = 900) {
  state.tween = {
    from: camera.position.clone(),
    to: new THREE.Vector3(...pos),
    tFrom: controls.target.clone(),
    tTo: new THREE.Vector3(...target),
    start: performance.now(),
    dur,
  };
}

function updateTween(now) {
  if (!state.tween) return;
  const p = clamp((now - state.tween.start) / state.tween.dur, 0, 1);
  const e = 1 - Math.pow(1 - p, 3);
  camera.position.lerpVectors(state.tween.from, state.tween.to, e);
  controls.target.lerpVectors(state.tween.tFrom, state.tween.tTo, e);
  if (p >= 1) state.tween = null;
}

/* ------------------------------------------------------------------ 标注投影 */
const _v = new THREE.Vector3();
function updateLabels() {
  if (!labelEls.length) return;
  const w = innerWidth, h = innerHeight;
  for (const l of labelEls) {
    _v.copy(l.pos).project(camera);
    const on = _v.z < 1 && _v.z > -1;
    if (!on) { l.el.style.opacity = 0; continue; }
    const x = (_v.x * 0.5 + 0.5) * w;
    const y = (-_v.y * 0.5 + 0.5) * h;
    const dist = camera.position.distanceTo(l.pos);
    l.el.style.opacity = clamp(1.25 - dist / 1500, 0.12, 1);
    l.el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    // 电网接入点标注（b=null）的 display 由潮流模式控制，这里只管投影位置
    if (l.b !== null) l.el.style.display = x < -60 || x > w + 60 || y < -40 || y > h + 40 ? "none" : "";
  }
}

function updateCompass() {
  const d = camera.position.clone().sub(controls.target);
  const az = Math.atan2(d.x, -d.z) / rad;
  $("compassNeedle").setAttribute("transform", `rotate(${(-az).toFixed(1)} 24 24)`);

  const dist = camera.position.distanceTo(controls.target);
  const worldPerPx = (2 * dist * Math.tan((camera.fov * rad) / 2)) / innerHeight;
  let meters = 200;
  const targetPx = 74;
  meters = [50, 100, 200, 400, 800].reduce((a, b) =>
    Math.abs(b / worldPerPx - targetPx) < Math.abs(a / worldPerPx - targetPx) ? b : a
  );
  $("scaleBar").style.width = `${(meters / worldPerPx).toFixed(0)}px`;
  $("scaleLabel").textContent = `${meters} m`;
}

/* ------------------------------------------------------------------ 导出 */
// 直接导出场景组：世界节点本身只含模型（天空/星空在 scene 上），
// 且 InstancedMesh 无法通过 clone() 复制实例矩阵，故不做克隆。
function buildExportGroup() {
  return world;
}

function exportGlbBuffer() {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      buildExportGroup(),
      (buf) => resolve(new Uint8Array(buf)),
      reject,
      { binary: true }
    );
  });
}
window.__exportGlbBuffer = exportGlbBuffer;
window.__cam = (px, py, pz, tx, ty, tz) => { camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); controls.update(); };
window.__cam = (px, py, pz, tx, ty, tz) => { camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); controls.update(); };
window.__exportGroup = buildExportGroup;
window.__exportGroup = buildExportGroup;

function exportGlb() {
  const btn = $("btnGlb");
  btn.textContent = "导出中…";
  const exporter = new GLTFExporter();
  const keep = buildExportGroup();
  exporter.parse(
    keep,
    (buf) => {
      const blob = new Blob([buf], { type: "model/gltf-binary" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "hkust-gz-campus-3d.glb";
      a.click();
      URL.revokeObjectURL(a.href);
      btn.textContent = "已导出";
      setTimeout(() => (btn.textContent = "导出 GLB"), 2200);
    },
    (err) => {
      console.error(err);
      btn.textContent = "导出失败";
      setTimeout(() => (btn.textContent = "导出 GLB"), 2200);
    },
    { binary: true }
  );
}

/* ------------------------------------------------------------------ 主循环 */
let last = 0;
let lastOverlayUpdate = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;

  updateTween(now);
  if (autoSpin) {
    const d = camera.position.clone().sub(controls.target);
    const a = Math.atan2(d.z, d.x) + dt * 0.12;
    const r = Math.hypot(d.x, d.z);
    camera.position.x = controls.target.x + Math.cos(a) * r;
    camera.position.z = controls.target.z + Math.sin(a) * r;
  }
  controls.update();

  // 潮流粒子与呼吸（逐帧连续插值，避免逐小时刷新时亮度跳变造成频闪）
  if (mode === "flow" && arcs.length) {
    for (const a of arcs) {
      const t = ((now * 0.00016 + a.offset) % 1);
      const p = a.curve.getPointAt(t);
      a.dot.position.copy(p);
      const s = 0.7 + 0.6 * Math.sin(t * Math.PI);
      a.dot.scale.setScalar(s);
      a.tube.material.opacity = (0.22 + 0.22 * a.strength) * (0.8 + 0.2 * Math.sin(now * 0.0011 + a.offset * 6.283));
    }
  }

  if (now - lastOverlayUpdate > 50) {
    updateLabels();
    updateCompass();
    lastOverlayUpdate = now;
  }
  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ 启动 */
async function boot() {
  initScene();
  const res = await fetch("./campus-data.json");
  data = await res.json();

  computeEnergy();
  buildGround();
  buildSitePlate();
  buildGroundDetail();
  buildBuildings();
  buildPv();
  buildCarports();
  buildBipv();
  buildTrees();
  buildFlows();
  buildLabels();
  wireInteraction();
  buildTicks();
  drawTimelineChart();

  $("brandMeta").textContent =
    `${data.buildings.length} 栋建筑 · 屋面 ${(data.kpi.roofArea / 10000).toFixed(1)} 万 m² · 建筑面积 ${(data.kpi.gfa / 10000).toFixed(1)} 万 m² · 研究日 ${data.meta.studyDay}`;

  applyHour(12, true);
  window.__dbg = { pv: world.userData.pvInst ? world.userData.pvInst.count : -1, bld: buildings.length, err: null,
    carport: world.userData.carportInst ? world.userData.carportInst.count : -1,
    bipv: world.userData.bipvCount || 0,
    carport: world.userData.carportInst ? world.userData.carportInst.count : -1,
    bipv: world.userData.bipvCount || 0,
    probe: () => ({ alt: data.series.solar[hour].alt, dayF: smooth(-7, 9, data.series.solar[hour].alt),
      top: skyMat.uniforms.uTop.value.getHexString(), hor: skyMat.uniforms.uHorizon.value.getHexString(),
      fog: scene.fog ? scene.fog.density : -1, sun: sun.intensity, hemi: hemi.intensity, ambient: ambient.intensity }) };
  $("boot").classList.add("done");
  setTimeout(() => controls.enabled = true, 50);

  // 入场动画
  flyTo([640, 560, 980], [30, 0, 150], 2400);
  setTimeout(() => $("hint").classList.add("hide"), 7000);
  requestAnimationFrame(animate);
}

boot().catch((err) => {
  console.error(err);
  $("boot").innerHTML = `<p>三维场景加载失败</p><small>${err.message}</small>`;
});
