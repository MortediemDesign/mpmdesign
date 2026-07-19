import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ---------- CONFIG ----------
// Funkce běží samostatně na Vercelu (GitHub Pages neumí spouštět serverless
// kód). Po nasazení sem vlož svou skutečnou Vercel URL, např.:
// "https://mpmdesign-klicenka.vercel.app/api/order"
const ORDER_ENDPOINT = "https://TVOJE-PROJEKT.vercel.app/api/order";
const FONT_FILES = {
  helvetiker: "./klicenka-assets/fonts/helvetiker_regular.typeface.json",
  optimer: "./klicenka-assets/fonts/optimer_regular.typeface.json",
  gentilis: "./klicenka-assets/fonts/gentilis_regular.typeface.json",
};
const COLORS = [
  { name: "Černá", hex: "#1a1a1a" },
  { name: "Bílá", hex: "#f2f2f2" },
  { name: "Oranžová", hex: "#ff6a00" },
  { name: "Červená", hex: "#c81e1e" },
  { name: "Modrá", hex: "#1e56c8" },
  { name: "Zelená", hex: "#2ea043" },
  { name: "Žlutá", hex: "#f2c200" },
];

// ---------- STATE ----------
let state = {
  text: "MPMDESIGN",
  font: "helvetiker",
  color: COLORS[0].hex,
  width: 70,
  thickness: 4,
};
const fontCache = {};

// ---------- THREE SETUP ----------
const viewerEl = document.getElementById("viewer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d0d);

const camera = new THREE.PerspectiveCamera(40, viewerEl.clientWidth / viewerEl.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 140);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(viewerEl.clientWidth, viewerEl.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
viewerEl.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
dir1.position.set(50, 80, 100);
scene.add(dir1);
const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
dir2.position.set(-60, -40, -80);
scene.add(dir2);

let currentMesh = null;
let currentGeometry = null; // merged geometry used for STL export

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = viewerEl.clientWidth / viewerEl.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewerEl.clientWidth, viewerEl.clientHeight);
});

// ---------- GEOMETRY BUILDING ----------
function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x, y + r);
  shape.lineTo(x, y + h - r);
  shape.quadraticCurveTo(x, y + h, x + r, y + h);
  shape.lineTo(x + w - r, y + h);
  shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  shape.lineTo(x + w, y + r);
  shape.quadraticCurveTo(x + w, y, x + w - r, y);
  shape.lineTo(x + r, y);
  shape.quadraticCurveTo(x, y, x, y + r);
  return shape;
}

function buildTagGeometry(width, thickness) {
  const height = width * 0.36;
  const shape = roundedRectShape(width, height, height * 0.18);

  // hole for keyring, near left edge
  const holeR = Math.min(height * 0.16, 4);
  const holeCenterX = -width / 2 + holeR * 2.2;
  const holeCenterY = 0;
  const hole = new THREE.Path();
  hole.absarc(holeCenterX, holeCenterY, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.translate(0, 0, -thickness / 2);
  return { geo, width, height, holeCenterX, holeR };
}

function loadFont(key) {
  if (fontCache[key]) return Promise.resolve(fontCache[key]);
  return new Promise((resolve, reject) => {
    new FontLoader().load(
      FONT_FILES[key],
      (font) => { fontCache[key] = font; resolve(font); },
      undefined,
      reject
    );
  });
}

async function rebuild() {
  const font = await loadFont(state.font);

  const { geo: tagGeo, width, height, holeCenterX, holeR } = buildTagGeometry(state.width, state.thickness);

  const textDepth = 1.6;
  let textGeo = new TextGeometry(state.text || " ", {
    font,
    size: height * 0.4,
    height: textDepth,
    curveSegments: 6,
    bevelEnabled: false,
  });
  textGeo.computeBoundingBox();
  const bb = textGeo.boundingBox;
  const textW = bb.max.x - bb.min.x;
  const textH = bb.max.y - bb.min.y;

  // available printable area (avoid the ring hole zone on the left)
  const safeLeft = -width / 2 + holeR * 4.5;
  const availableW = (width / 2 - 3) - safeLeft;
  const availableH = height - 4;

  let scale = 1;
  if (textW > 0) scale = Math.min(availableW / textW, availableH / Math.max(textH, 0.001), 1.4);
  if (!isFinite(scale) || scale <= 0) scale = 1;

  textGeo.scale(scale, scale, 1);
  textGeo.computeBoundingBox();
  const bb2 = textGeo.boundingBox;
  const cx = (bb2.max.x + bb2.min.x) / 2;
  const cy = (bb2.max.y + bb2.min.y) / 2;
  const centerX = safeLeft + (availableW) / 2;
  textGeo.translate(centerX - cx, -cy, state.thickness / 2 - 0.05);

  // merge for a single-color STL
  const merged = mergeGeometries([tagGeo, textGeo], false);
  merged.computeVertexNormals();

  if (currentMesh) scene.remove(currentMesh);
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(state.color), roughness: 0.55, metalness: 0.05 });
  currentMesh = new THREE.Mesh(merged, material);
  scene.add(currentMesh);
  currentGeometry = merged;

  // frame camera roughly
  camera.position.set(0, 0, width * 1.6);
  controls.target.set(0, 0, 0);
}

// ---------- STL EXPORT ----------
function exportSTLBase64() {
  const exporter = new STLExporter();
  const mesh = currentMesh;
  const stlString = exporter.parse(mesh, { binary: false });
  const blob = new Blob([stlString], { type: "model/stl" });
  return blob;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- UI WIRING ----------
const textInput = document.getElementById("text-input");
const fontSelect = document.getElementById("font-select");
const widthInput = document.getElementById("width-input");
const thicknessInput = document.getElementById("thickness-input");
const colorPicker = document.getElementById("color-picker");
const statusEl = document.getElementById("status");
const sendBtn = document.getElementById("send");

COLORS.forEach((c, i) => {
  const sw = document.createElement("div");
  sw.className = "swatch" + (i === 0 ? " active" : "");
  sw.style.background = c.hex;
  sw.title = c.name;
  sw.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
    sw.classList.add("active");
    state.color = c.hex;
    state.colorName = c.name;
    if (currentMesh) currentMesh.material.color.set(c.hex);
  });
  colorPicker.appendChild(sw);
});
state.colorName = COLORS[0].name;

let rebuildTimer = null;
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(rebuild, 150);
}

textInput.addEventListener("input", () => { state.text = textInput.value; scheduleRebuild(); });
fontSelect.addEventListener("change", () => { state.font = fontSelect.value; scheduleRebuild(); });
widthInput.addEventListener("change", () => { state.width = parseFloat(widthInput.value) || 70; scheduleRebuild(); });
thicknessInput.addEventListener("change", () => { state.thickness = parseFloat(thicknessInput.value) || 4; scheduleRebuild(); });

rebuild();

// ---------- ORDER SUBMIT ----------
sendBtn.addEventListener("click", async () => {
  const name = document.getElementById("cust-name").value.trim();
  const email = document.getElementById("cust-email").value.trim();
  const qty = document.getElementById("cust-qty").value || 1;
  const note = document.getElementById("cust-note").value.trim();

  statusEl.className = "";
  if (!name || !email) {
    statusEl.textContent = "Vyplň prosím jméno a e-mail.";
    statusEl.className = "err";
    return;
  }
  if (!state.text.trim()) {
    statusEl.textContent = "Napiš prosím text na klíčenku.";
    statusEl.className = "err";
    return;
  }

  sendBtn.disabled = true;
  statusEl.textContent = "Generuji STL a odesílám objednávku…";

  try {
    const stlBlob = exportSTLBase64();
    const stlBase64 = await blobToBase64(stlBlob);
    const previewDataUrl = renderer.domElement.toDataURL("image/jpeg", 0.85);

    const payload = {
      customer: { name, email, qty, note },
      design: {
        text: state.text,
        font: state.font,
        color: state.color,
        colorName: state.colorName,
        width_mm: state.width,
        thickness_mm: state.thickness,
      },
      stlBase64,
      previewImageBase64: previewDataUrl.split(",")[1],
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(ORDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Server vrátil chybu " + res.status);

    statusEl.textContent = "Hotovo! Objednávka byla odeslána, ozveme se ti na e-mail.";
    statusEl.className = "ok";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Něco se nepovedlo (" + err.message + "). Zkus to prosím znovu.";
    statusEl.className = "err";
  } finally {
    sendBtn.disabled = false;
  }
});
