// Raspberry Pi 4 Model B on a bench, with a GPIO probe gantry.
// Source of static/anatomy/raspberry-pi*. Run through: npm run build:anatomy -- raspberry-pi
// Direct: node figures/raspberry-pi/build.mjs [--light] [--full] [--out <dir>]
//   default: just the card, for embedding. --full adds the legend, caption and page margins.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "../../.claude/skills/anatomy");
const k = await import(pathToFileURL(`${SKILL}/kit/iso-kit.mjs`).href);
const { kitScript } = await import(pathToFileURL(`${SKILL}/scripts/inline-kit.mjs`).href);
const theme = process.argv.includes("--light") ? "light" : "dark";
// embed (default): just the card (no legend or caption, no page margins), for use as a thumbnail inside a document
const embed = !process.argv.includes("--full");

const WIDTH = 640;
const HEIGHT = 420;

// ---- units: 1 mm = 4 world units -------------------------------------------------
const U = 4;
const X = (mm) => (mm - 42.5) * U;
const Y = (mm) => (mm - 28) * U;
const pl = (x, y, w, d, r = 0.5) => ({
  x: X(x),
  y: Y(y),
  w: w * U,
  d: d * U,
  r: Math.min(r * U, (w * U) / 2 - 0.01, (d * U) / 2 - 0.01),
});
const mid = (p) => [p.x + p.w / 2, p.y + p.d / 2];

// ---- the bench -----------------------------------------------------------------
const PLATE = { x: -205, y: -150, w: 410, d: 284, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const BOARD = pl(0, 0, 85, 56, 3);
const Z0 = 36; // underside of the PCB, on 9 mm standoffs
const TB = 1.4 * U; // 1.4 mm board
const ZT = Z0 + TB;

const HOLES = [
  [3.5, 3.5],
  [61.5, 3.5],
  [3.5, 52.5],
  [61.5, 52.5],
].map(([x, y]) => [X(x), Y(y)]);

// 40-pin header: 2 x 20, 2.54 mm pitch. Odd pins on the inner row, pin 1 at the left.
const PITCH = 2.54 * U;
const PINX = (col) => X(8.37 + 2.54 * col);
const ROW_OUTER = Y(3.7);
const ROW_INNER = Y(6.24);
const HEADER = pl(7.1, 2.43, 50.8, 5.08, 0.4);
const HEADER_H = 2.5 * U;
const PIN_H = 6 * U;
const PIN_TOP = ZT + HEADER_H + PIN_H;

const NAMES = [
  "3V3 power", "5V power", "GPIO2 · SDA1", "5V power", "GPIO3 · SCL1",
  "ground", "GPIO4 · GPCLK0", "GPIO14 · TXD", "ground", "GPIO15 · RXD",
  "GPIO17", "GPIO18 · PCM CLK", "GPIO27", "ground", "GPIO22",
  "GPIO23", "3V3 power", "GPIO24", "GPIO10 · SPI0 MOSI", "ground",
  "GPIO9 · SPI0 MISO", "GPIO25", "GPIO11 · SPI0 SCLK", "GPIO8 · SPI0 CE0", "ground",
  "GPIO7 · SPI0 CE1", "GPIO0 · ID_SD", "GPIO1 · ID_SC", "GPIO5 · GPCLK1", "ground",
  "GPIO6 · GPCLK2", "GPIO12 · PWM0", "GPIO13 · PWM1", "ground", "GPIO19 · PCM FS",
  "GPIO16", "GPIO26", "GPIO20 · PCM DIN", "ground", "GPIO21 · PCM DOUT",
];
const volts = (name) => (name.startsWith("3V3") ? "3.3 V" : name.startsWith("5V") ? "5 V" : name === "ground" ? "0 V" : "3.3 V logic");
const PINS = NAMES.map((name, index) => {
  const n = index + 1;
  const col = (n - 1) >> 1;
  return { n, col, x: PINX(col), y: n % 2 ? ROW_INNER : ROW_OUTER, name, volts: volts(name) };
});

// gantry
const RAIL_Y = -142;
const RAIL_D = 14;
const RAIL_Z = 62;
const RAIL_H = 12;
const POST_H = RAIL_Z;
const TOWER_TOP = 118;
const ARM = { x: -12, y: -141, w: 24, d: 81, r: 2 };
const ARM_Z = TOWER_TOP;
const ARM_H = 8;
const SLIDER_Z = 100;
const BARREL_Z = 82;
const LIFT = 9;

const USB_TOP = ZT + 15.3 * U;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(BOARD, Z0, USB_TOP),
    [-12, ARM.y, ARM_Z + ARM_H],
    [12, ARM.y + ARM.d, ARM_Z + ARM_H],
    [X(87.2), Y(22), USB_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 33, elevation: 36 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (x, y) => k.depthOf([x, y, 0], P);
const byDepth = (points) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
const fmt = (n) => (Math.round(n * 10) / 10).toString();
const poly = (pts, closed = true) => "M" + pts.map((p) => at(p).map(fmt).join(" ")).join("L") + (closed ? "Z" : "");

// a chamfered slot drawn on a vertical face: axis "x" is the plane x = c, "y" the plane y = c
function faceSlot(axis, c, a0, a1, z0, z1, r) {
  const seq = [[a0 + r, z0], [a1 - r, z0], [a1, z0 + r], [a1, z1 - r], [a1 - r, z1], [a0 + r, z1], [a0, z1 - r], [a0, z0 + r]];
  return poly(seq.map(([a, z]) => (axis === "x" ? [c, a, z] : [a, c, z])));
}
const faceLine = (axis, c, a0, a1, z) => poly([axis === "x" ? [c, a0, z] : [a0, c, z], axis === "x" ? [c, a1, z] : [a1, c, z]], false);

// ---- bench plate -----------------------------------------------------------------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // ruler: one tick per header column, 2.54 mm apart
  const x0 = PINX(0);
  const x1 = PINX(19);
  const strip = { x: x0 - 9, y: 112, w: x1 - x0 + 18, d: 9, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(x0, x1, PITCH, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2.4, strip.y + 4.5, 0.6]), at([strip.x + strip.w - 2.4, strip.y + 4.5, 0.6])], { size: 0.45 }));

  // label plate
  const label = { x: 120, y: 108, w: 62, d: 22, r: 3 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.8), 0.8, P, 4), { tone: "faint" }));
  [[8, 44], [13, 34], [18, 40]].forEach(([dy, len]) => {
    out.push(L(k.lineOnTop([label.x + 7, label.y + dy - 4], [label.x + 7 + len, label.y + dy - 4], 0.8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([label.x + 3.6, label.y + 3.6, 0.8]), at([label.x + label.w - 3.6, label.y + label.d - 3.6, 0.8])], { size: 0.4 }));
  return out.join("");
}

// ---- the rail the gantry runs on: raised on two end posts so the board never hides it ----
function rail() {
  const out = [];
  const x0 = PINX(0) - 46;
  const x1 = PINX(19) + 58;
  const plan = { x: x0, y: RAIL_Y, w: x1 - x0, d: RAIL_D, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: x0 - 8, y: RAIL_Y - 4, w: x1 - x0 + 16, d: RAIL_D + 8, r: 3 }, 0, 6, P)}"/>`);
  for (const x of [x0 + 4, x1 - 22]) {
    const post = { x, y: RAIL_Y - 3, w: 18, d: RAIL_D + 6, r: 2.4 };
    out.push(S(k.slabOf(post, 0, POST_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(post, 14, P, 4) + k.sideSeam(post, 40, P, 4), { tone: "faint" }) }));
    out.push(S(k.slabOf({ x: x - 4, y: RAIL_Y - 7, w: 26, d: RAIL_D + 14, r: 2.4 }, 0, 4, P, 4, 0.4), { tone: "lo" }));
    out.push(D([at([x - 1, RAIL_Y - 4, 4]), at([x + 19, RAIL_Y - 4, 4]), at([x - 1, RAIL_Y + RAIL_D + 4, 4]), at([x + 19, RAIL_Y + RAIL_D + 4, 4])], { size: 0.45 }));
  }
  out.push(S(k.slabOf(plan, RAIL_Z, RAIL_H, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.lineOnTop([x0, RAIL_Y + RAIL_D / 2], [x1, RAIL_Y + RAIL_D / 2], RAIL_Z + RAIL_H, P), { tone: "faint" }));
  // end stops
  for (const x of [x0 - 5, x1]) {
    out.push(S(k.slabOf({ x, y: RAIL_Y - 2, w: 5, d: RAIL_D + 4, r: 1.2 }, RAIL_Z - 2, RAIL_H + 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, RAIL_Y + 3, RAIL_Z + RAIL_H + 6]), at([x + 2.5, RAIL_Y + RAIL_D - 3, RAIL_Z + RAIL_H + 6])], { size: 0.42 }));
  }
  out.push(D([x0 + 16, x0 + 100, x1 - 100, x1 - 16].map((x) => at([x, RAIL_Y + RAIL_D / 2, RAIL_Z + RAIL_H])), { size: 0.45 }));
  return out.join("");
}

// carriage + tower, built at x = 0: a saddle over the rail and a tower up to the arm
function carriage() {
  const out = [];
  const zr = RAIL_Z + RAIL_H;
  const saddle = { x: -26, y: RAIL_Y - 4, w: 52, d: RAIL_D + 8, r: 3 };
  out.push(S(k.slabOf(saddle, RAIL_Z - 2, zr - RAIL_Z + 2 + 8, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(saddle, zr - 2, P, 5), { tone: "faint" }) }));
  const top = zr + 8;
  out.push(D([[-19, saddle.y + 4], [19, saddle.y + 4], [-19, saddle.y + saddle.d - 4], [19, saddle.y + saddle.d - 4]].map(([x, y]) => at([x, y, top])), { size: 0.45 }));
  const tower = { x: -10, y: ARM.y, w: 20, d: 12, r: 2 };
  out.push(S(k.slabOf(tower, top, TOWER_TOP - top, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(tower, top + 10, P, 4) + k.sideSeam(tower, top + 24, P, 4), { tone: "faint" }) }));
  const knob = [14, saddle.y + saddle.d - 6];
  out.push(S(k.cylinder(knob[0], knob[1], 5, top, 5, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 5, top, top + 5, 26, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([knob[0] - 3.2, knob[1]], [knob[0] + 4.8, knob[1]], top + 5, P), { tone: "hi" }));
  return out.join("");
}

// ---- standoffs ------------------------------------------------------------------
function standoffs() {
  const out = [];
  for (const [x, y] of byDepth(HOLES)) {
    out.push(S(k.cylinder(x, y, 8.4, 0, 3, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 7, 3, Z0 - 3, P, 6, 0.4), { tone: "mid", crease: "lo" }));
    out.push(L(k.sideArc(x, y, 7, 14, P, 8) + k.sideArc(x, y, 7, 26, P, 8), { tone: "faint" }));
  }
  return out.join("");
}

// ---- the PCB -------------------------------------------------------------------------
function boardBody() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BOARD, Z0, TB, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(BOARD, Z0, TB, P, 10, 1.1), { tone: "hi", crease: "lo", inner: L(k.sideSeam(BOARD, Z0 + 2.6, P, 10), { tone: "faint" }) }));
  // keep-out groove and mounting holes
  out.push(L(k.planOutline(k.insetPlan(BOARD, 4), ZT, P, 10), { tone: "faint" }));
  for (const [x, y] of HOLES) {
    out.push(L(k.ring(x, y, 5.5, ZT, P, 20) + k.ring(x, y, 10.5, ZT, P, 24), { tone: "lo" }));
  }
  return out.join("");
}

function screws() {
  for (const [x, y] of HOLES) {
    const out = [S(k.cylinder(x, y, 7.6, ZT, 3.2, P, 24, 0.4), { tone: "mid" })];
    out.push(L(k.planOutline({ x: x - 4.6, y: y - 0.9, w: 9.2, d: 1.8, r: 0.9 }, ZT + 3.2, P, 3), { tone: "lo" }));
    items.push({ key: [x, y], svg: out.join("") });
  }
}

// traces from the inner header row, each ending on a pad and a via
function traces() {
  const lines = [];
  const pads = [];
  for (let col = 1; col <= 10; col++) {
    const px = 8.37 + 2.54 * col;
    const pts = [[px, 7.75], [px, 9.2], [px + 2.4, 11.6], [px + 2.4, 12.8]].map(([x, y]) => [X(x), Y(y)]);
    lines.push(k.onTop(pts, ZT, P));
    pads.push(at([pts[0][0], pts[0][1], ZT]), at([pts[3][0], pts[3][1], ZT]));
  }
  const vias = pads.filter((_, i) => i % 2 === 1);
  return L(lines.join(""), { tone: "faint" }) + D(pads, { size: 0.42, tone: "lo" }) + L(vias.map((p) => circleAt(p, 1.6)).join(""), { tone: "faint" });
}
const circleAt = ([sx, sy], r) => `M${fmt(sx - r)} ${fmt(sy)}a${r} ${r} 0 1 0 ${fmt(r * 2)} 0a${r} ${r} 0 1 0 ${fmt(-r * 2)} 0`;

// parallel trace bundles: n lines starting at (x, y) in mm, stepping by (sx, sy), each running (dx, dy)
function bus(x, y, n, sx, sy, dx, dy, jog = 0) {
  const lines = [];
  const pads = [];
  const ends = [];
  for (let i = 0; i < n; i++) {
    const a = [x + sx * i, y + sy * i];
    const b = [a[0] + dx, a[1] + dy];
    const pts = jog ? [a, [a[0] + dx * 0.5, a[1] + dy * 0.5], [a[0] + dx * 0.5 + jog, a[1] + dy * 0.5 + jog], b] : [a, b];
    lines.push(k.onTop(pts.map(([px, py]) => [X(px), Y(py)]), ZT, P));
    pads.push(at([X(a[0]), Y(a[1]), ZT]));
    ends.push(at([X(b[0]), Y(b[1]), ZT]));
  }
  return L(lines.join(""), { tone: "faint" }) + D([...pads, ...ends], { size: 0.4, tone: "lo" }) + L(ends.map((p) => circleAt(p, 1.5)).join(""), { tone: "faint" });
}

function boardDetail() {
  const out = [];
  out.push(bus(43.2, 18.8, 8, 1.2, 0, 0, -5.4, 0));
  out.push(bus(23.4, 18.2, 6, 1.0, 0, 0, -2.6, 0));
  out.push(bus(62.4, 38.6, 5, 0, 1.0, 6.4, 0));
  out.push(bus(24, 37.2, 6, 1.2, 0, 0, 3.4));
  out.push(bus(44.5, 54.6, 1, 0, 0, 0, 0));
  // silkscreen outlines around the big parts
  out.push(L(k.planOutline(k.insetPlan(pl(22.5, 18.5, 17, 17, 1), -4.2 * U / 4 * 1), ZT, P, 4), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(pl(8, 14, 11.5, 10.5, 0.6), -4), ZT, P, 3), { tone: "faint" }));
  // test points
  const tp = [[28, 44.5], [30.2, 44.5], [42, 46], [60, 49], [62.6, 49], [60, 52], [62.6, 52], [14, 34], [14, 36.4]];
  out.push(L(tp.map(([x, y]) => k.ring(X(x), Y(y), 4.2, ZT, P, 14)).join(""), { tone: "faint" }));
  out.push(D(tp.map(([x, y]) => at([X(x), Y(y), ZT])), { size: 0.5, tone: "lo" }));
  return out.join("");
}

// ---- components, sorted by depth ------------------------------------------------------
const items = [];
const put = (plan, svg) => items.push({ key: mid(plan), svg });

function smd(x, y, w, d) {
  const p = pl(x, y, w, d, 0.1);
  put(p, S(k.slabOf(p, ZT, 3, P, 2, 0), { tone: "lo", crease: "faint" }));
}

function header() {
  const out = [];
  out.push(S(k.slabOf(HEADER, ZT, HEADER_H, P, 3, 0.5), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(HEADER, 1.6), ZT + HEADER_H, P, 3), { tone: "faint" }));
  for (const pin of [...PINS].sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y))) {
    out.push(S(k.slabOf({ x: pin.x - 1.3, y: pin.y - 1.3, w: 2.6, d: 2.6, r: 0.5 }, ZT + HEADER_H, PIN_H, P, 2, 0), { tone: "hi", crease: "lo" }));
  }
  // pin 1 marker: a square pad ring
  out.push(L(k.ring(PINX(0), ROW_INNER, 3.2, ZT + HEADER_H, P, 4), { tone: "lo" }));
  put(HEADER, out.join(""));
}

function soc() {
  const pkg = pl(22.5, 18.5, 17, 17, 1);
  const lid = pl(23.7, 19.7, 14.6, 14.6, 1);
  const out = [];
  out.push(S(k.slabOf(pkg, ZT, 3.4, P, 4, 0.4), { tone: "lo", crease: "faint" }));
  out.push(S(k.slabOf(lid, ZT + 3.4, 4.6, P, 4, 0.9), { tone: "hi", crease: "lo", inner: L(k.sideSeam(lid, ZT + 5.6, P, 4), { tone: "faint" }) }));
  const inner = k.insetPlan(lid, 3);
  out.push(L(k.planOutline(inner, ZT + 8, P, 4), { tone: "faint" }));
  const c = mid(lid);
  [[-8, 30], [-3.4, 40], [1.2, 24]].forEach(([dy, len]) => {
    out.push(L(k.lineOnTop([c[0] - len / 2, c[1] + dy], [c[0] + len / 2, c[1] + dy], ZT + 8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([lid.x + 6, lid.y + 6, ZT + 8])], { size: 0.5 }));
  put(pkg, out.join(""));
}

function ram() {
  const p = pl(42, 19.5, 12, 14, 0.8);
  const out = [S(k.slabOf(p, ZT, 4, P, 3, 0.4), { tone: "lo", crease: "faint" })];
  out.push(L(k.planOutline(k.insetPlan(p, 2), ZT + 4, P, 3), { tone: "faint" }));
  out.push(D([at([p.x + 5, p.y + 5, ZT + 4])], { size: 0.5, tone: "lo" }));
  put(p, out.join(""));
}

function wifi() {
  const p = pl(8, 14, 11.5, 10.5, 0.6);
  const out = [S(k.slabOf(p, ZT, 4.8, P, 3, 0.5), { tone: "mid", crease: "lo" })];
  out.push(L(k.planOutline(k.insetPlan(p, 1.8), ZT + 4.8, P, 3), { tone: "faint" }));
  out.push(D(k.dotGrid(p.x + 7, p.y + 7, 4, 3, 7, ZT + 4.8, P), { size: 0.34, tone: "lo" }));
  put(p, out.join(""));
}

function chips() {
  const specs = [
    [pl(15, 41, 6, 6, 0.6), 3.6],
    [pl(58, 11, 6, 6.5, 0.6), 3.6],
    [pl(59, 38, 6, 6, 0.6), 3.6],
  ];
  for (const [p, h] of specs) {
    const out = [S(k.slabOf(p, ZT, h, P, 3, 0.3), { tone: "lo", crease: "faint" })];
    out.push(D([at([p.x + 5, p.y + 5, ZT + h])], { size: 0.42, tone: "lo" }));
    put(p, out.join(""));
  }
  const xt = pl(51, 36.5, 3.2, 2.5, 0.4);
  put(xt, S(k.slabOf(xt, ZT, 4.4, P, 2, 0.3), { tone: "mid", crease: "lo" }));
}

function connectorsFlat() {
  // CSI and DSI ribbon sockets
  for (const [p, vertical] of [[pl(44.5, 36, 3.2, 17.5, 0.4), true], [pl(1.5, 20, 3.2, 17.5, 0.4), true]]) {
    const out = [S(k.slabOf(p, ZT, 2.6 * 1, P, 2, 0.3), { tone: "lo", crease: "faint" })];
    const lid = { x: p.x + 1.6, y: p.y + 4, w: p.w - 3.2, d: p.d - 8, r: 0.5 };
    out.push(L(k.planOutline(lid, ZT + 2.6, P, 2), { tone: "faint" }));
    put(p, out.join(""));
  }
}

function usbC() {
  const p = pl(6.7, 48.9, 9, 8.2, 1.2);
  const h = 3.3 * U;
  const yF = p.y + p.d;
  const out = [S(k.slabOf(p, ZT, h, P, 4, 0.5), { tone: "mid", crease: "lo" })];
  out.push(faceOf("y", yF, p.x + 1.2 * U, p.x + p.w - 1.2 * U, ZT + 0.45 * U, ZT + h - 0.45 * U, 1.1 * U, true));
  out.push(L(faceLine("y", yF, p.x + 3 * U, p.x + p.w - 3 * U, ZT + h / 2), { tone: "lo", free: true }));
  put(p, out.join(""));
}
function faceOf(axis, c, a0, a1, z0, z1, r, tongue) {
  return L(faceSlot(axis, c, a0, a1, z0, z1, r), { tone: "lo" });
}

function hdmi() {
  for (const x of [22.3, 35.8]) {
    const p = pl(x, 49.5, 7.5, 6.5, 0.8);
    const h = 3.4 * U;
    const yF = p.y + p.d;
    const out = [S(k.slabOf(p, ZT, h, P, 3, 0.4), { tone: "mid", crease: "lo" })];
    out.push(faceOf("y", yF, p.x + 0.9 * U, p.x + p.w - 0.9 * U, ZT + 0.5 * U, ZT + h - 0.5 * U, 0.7 * U));
    put(p, out.join(""));
  }
}

function audio() {
  const p = pl(50.5, 46.5, 6.5, 9.5, 0.8);
  const h = 5.5 * U;
  const yF = p.y + p.d;
  const out = [S(k.slabOf(p, ZT, h, P, 3, 0.4), { tone: "mid", crease: "lo" })];
  const cx = p.x + p.w / 2;
  out.push(L(k.sideRing([cx, yF, ZT + h / 2], 1.5 * U, "y", P, 24) + k.sideRing([cx, yF, ZT + h / 2], 0.75 * U, "y", P, 16), { tone: "lo" }));
  put(p, out.join(""));
}

function usbStack(yMm, wMm, lMm, hMm, x0Mm, kind) {
  const p = pl(x0Mm, yMm, lMm, wMm, 0.8);
  const h = hMm * U;
  const xF = p.x + p.w;
  const out = [S(k.slabOf(p, ZT, h, P, 3, 0.5), { tone: "hi", crease: "lo", inner: L(k.sideSeam(p, ZT + h - 2 * U, P, 3), { tone: "faint" }) })];
  const y0 = p.y + 0.8 * U;
  const y1 = p.y + p.d - 0.8 * U;
  if (kind === "usb") {
    for (const [a, b] of [[1.2, 6.2], [8.7, 13.7]]) {
      out.push(L(faceSlot("x", xF, y0, y1, ZT + a * U, ZT + b * U, 0.5 * U), { tone: "lo" }));
      out.push(L(faceLine("x", xF, y0, y1, ZT + ((a + b) / 2) * U), { tone: "lo" }));
    }
  } else {
    out.push(L(faceSlot("x", xF, p.y + 2.2 * U, p.y + p.d - 2.2 * U, ZT + 1.6 * U, ZT + 10 * U, 0.9 * U), { tone: "lo" }));
    const cs = [];
    for (let i = 0; i < 8; i++) {
      const y = p.y + 3 * U + (i * (p.d - 6 * U)) / 7;
      cs.push(faceLine("x", xF, y, y, ZT + 10 * U).replace(/Z?$/, ""));
    }
    out.push(
      L(
        Array.from({ length: 8 }, (_, i) => {
          const y = p.y + 3.4 * U + (i * (p.d - 6.8 * U)) / 7;
          return poly([[xF, y, ZT + 10 * U], [xF, y, ZT + 8 * U]], false);
        }).join(""),
        { tone: "faint", free: "end" },
      ),
    );
  }
  put(p, out.join(""));
}

function leds() {
  for (const [x, y] of [[18, 49.4], [18, 51.8]]) {
    const p = pl(x, y, 1.8, 1, 0.2);
    put(p, S(k.slabOf(p, ZT, 1.6, P, 2, 0), { tone: "mid", crease: "faint" }));
  }
}

function silk() {
  return k.faceTextSvg(k.topMatrix([X(6), Y(30.6)], ZT, P, "x"), "Raspberry Pi 4 Model B", { size: 2.6, tone: "lo" });
}

// ---- the gantry arm (built at x = 0) ----------------------------------------------------
function arm() {
  const out = [];
  out.push(S(k.slabOf(ARM, ARM_Z, ARM_H, P, 4, 0.7), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(ARM, 3.5), ARM_Z + ARM_H, P, 4), { tone: "faint" }));
  out.push(D([at([0, ARM.y + 7, ARM_Z + ARM_H]), at([0, ARM.y + ARM.d - 7, ARM_Z + ARM_H])], { size: 0.5 }));
  return out.join("");
}

const slider = () => {
  const out = [];
  const body = { x: -12, y: -10, w: 24, d: 20, r: 3 };
  out.push(S(k.slabOf(body, SLIDER_Z, ARM_Z - SLIDER_Z, P, 4, 0.5), { tone: "mid", crease: "lo", inner: L(k.sideSeam(body, SLIDER_Z + 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.sideRing([12, 0, SLIDER_Z + 9], 4.4, "x", P, 20), { tone: "lo" }));
  out.push(D([at([12, 0, SLIDER_Z + 9])], { size: 0.45 }));
  return out.join("");
};

const probe = () => {
  const out = [];
  out.push(S(k.cylinder(0, 0, 2.6, 98, 18, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(0, 0, 6.2, BARREL_Z, SLIDER_Z - BARREL_Z, P, 28, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(0, 0, 6.2, BARREL_Z + 4, SLIDER_Z - 1, 30, P), { tone: "lo" }));
  out.push(L(k.sideArc(0, 0, 6.2, BARREL_Z + 3.4, P, 14), { tone: "faint" }));
  out.push(S(k.cylinder(0, 0, 2.5, PIN_TOP + 3, BARREL_Z - PIN_TOP - 3, P, 16), { tone: "hi", crease: "none", lit: true }));
  out.push(S(k.cylinder(0, 0, 1.5, PIN_TOP, 3, P, 12), { tone: "hi", lit: true }));
  return out.join("");
};

const ruleCursor = () => {
  const strip = { x: -2.4, y: 115.4, w: 4.8, d: 11, r: 0.8 };
  return S(k.slabOf(strip, 0.6, 2.4, P, 2, 0.3), { tone: "hi", crease: "lo" });
};

// ---- assemble ---------------------------------------------------------------------------
header();
soc();
ram();
wifi();
chips();
connectorsFlat();
usbC();
hdmi();
audio();
usbStack(2.25, 16, 21, 13.5, 65.2, "eth");
usbStack(22.4, 13.2, 17.7, 15.3, 69.5, "usb");
usbStack(40.4, 13.2, 17.7, 15.3, 69.5, "usb");
leds();
[20, 23, 26, 29, 32].forEach((y) => smd(20.9, y, 0.8, 1.6));
[24, 27, 30, 33, 36].forEach((x) => smd(x, 16.9, 1.6, 0.8));
[24, 27, 30, 33, 36, 39].forEach((x) => smd(x, 36.3, 1.6, 0.8));
[21, 24, 27, 30, 33].forEach((y) => smd(40.6, y, 0.8, 1.6));
[[22.5, 43], [24.1, 43], [25.7, 43], [31, 43], [32.6, 43], [34.2, 43]].forEach(([x, y]) => smd(x, y, 1.6, 0.8));
[[55, 20], [55, 23], [57, 28], [59.5, 20], [59.5, 24]].forEach(([x, y]) => smd(x, y, 0.8, 1.6));
screws();
items.sort((a, b) => depth(...a.key) - depth(...b.key));

const startPin = PINS[0];
const startX = startPin.x;
const startY = startPin.y;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A Raspberry Pi 4 Model B circuit board on four standoffs. A probe gantry runs along a rail behind it; its spring-loaded probe slides over the 40-pin GPIO header and presses on one pin at a time, and the card reads that pin's number, function and voltage.",
  body: [
    plate(),
    rail(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [startX, 0, 0])}">${carriage()}</g>`,
    standoffs(),
    boardBody(),
    traces(),
    boardDetail(),
    ...items.map((item) => item.svg),
    silk(),
    `<g data-part="cursor" transform="${k.translateAlong(P, [startX, 0, 0])}">${ruleCursor()}</g>`,
    `<g data-part="arm" transform="${k.translateAlong(P, [startX, 0, 0])}">` +
      `<g data-part="probe" transform="${k.translateAlong(P, [0, startY, 0])}">${probe()}</g>` +
      `<g data-part="slider" transform="${k.translateAlong(P, [0, startY, 0])}">${slider()}</g>` +
      arm() +
      `</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const PINS = ${JSON.stringify(PINS)};
const LIFT = ${LIFT};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const cursor = svg.querySelector('[data-part="cursor"]');
const arm = svg.querySelector('[data-part="arm"]');
const probe = svg.querySelector('[data-part="probe"]');
const slider = svg.querySelector('[data-part="slider"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const TOUR = [1, 2, 6, 3, 5, 8, 12, 19, 23, 32, 36, 40, 29, 17];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let pin = PINS[0], x = pin.x, y = pin.y, lift = 0;
let touring = true, tourAt = 0, dwell = 0, visible = false, frame = 0, last = 0, idleTimer = 0, text = "";
function draw() {
  const along = translateAlong(P, [x, 0, 0]);
  carriage.setAttribute("transform", along);
  cursor.setAttribute("transform", along);
  arm.setAttribute("transform", along);
  slider.setAttribute("transform", translateAlong(P, [0, y, 0]));
  probe.setAttribute("transform", translateAlong(P, [0, y, lift * LIFT]));
  const touching = lift < 0.02 && Math.hypot(pin.x - x, pin.y - y) < 0.3;
  const next = touching ? "pin " + pin.n + " · " + pin.name + " · " + pin.volts : "moving to pin " + pin.n;
  if (next !== text) { text = next; readout.textContent = text; }
  stage.setAttribute("aria-valuenow", String(pin.n));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  const dist = Math.hypot(pin.x - x, pin.y - y);
  const follow = calm ? 1 : 1 - Math.exp(-dt / 0.26);
  const wantLift = dist > 1.5 ? 1 : 0;
  if (dist > 1.5 || lift > 0.6) {
    x += (pin.x - x) * follow * (lift > 0.6 ? 1 : 0.2);
    y += (pin.y - y) * follow * (lift > 0.6 ? 1 : 0.2);
  }
  if (dist <= 1.5 && lift <= 0.6) { x = pin.x; y = pin.y; }
  lift += (wantLift - lift) * (calm ? 1 : 1 - Math.exp(-dt / 0.11));
  if (Math.abs(wantLift - lift) < 0.004) lift = wantLift;
  if (dist <= 0.3 && lift === 0) { dwell += dt; if (touring && dwell > 2.1) { tourAt = (tourAt + 1) % TOUR.length; pin = PINS[TOUR[tourAt] - 1]; dwell = 0; } }
  else dwell = 0;
  draw();
  const settled = !touring && lift === 0 && x === pin.x && y === pin.y;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const pick = (n) => { touring = false; pin = PINS[clamp(n, 1, 40) - 1]; dwell = 0; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; run(); }, 4200); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const fx = (event.clientX - box.left) / box.width, fy = (event.clientY - box.top) / box.height;
  const col = clamp(Math.round(((fx - 0.2) / 0.5) * 19), 0, 19);
  pick(col * 2 + (fy > 0.42 ? 1 : 2));
});
stage.addEventListener("keydown", (event) => {
  const col = (pin.n - 1) >> 1, inner = pin.n % 2 === 1;
  let n = null;
  if (event.key === "ArrowRight") n = Math.min(19, col + 1) * 2 + (inner ? 1 : 2);
  if (event.key === "ArrowLeft") n = Math.max(0, col - 1) * 2 + (inner ? 1 : 2);
  if (event.key === "ArrowUp") n = col * 2 + 2;
  if (event.key === "ArrowDown") n = col * 2 + 1;
  if (event.key === "Home") n = 1;
  if (event.key === "End") n = 40;
  if (n === null) return;
  event.preventDefault();
  pick(n);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Raspberry Pi 4 Model B",
  hint: "Hover to probe a pin",
  readout: `pin ${startPin.n} · ${startPin.name} · ${startPin.volts}`,
  keys: embed ? [] : [
    { mark: "lit", label: "Spring probe: the one contact on the header" },
    { mark: "raised", label: "The PCB, 85 × 56 mm, on four standoffs" },
  ],
  caption: embed ? "" :
    "A Raspberry Pi 4 Model B on a bench. The probe slides along the 40-pin header, one tick of the ruler per 2.54 mm column, and presses on one pin at a time: odd pins sit on the inner row, even pins on the outer row. Component layout is simplified; the header geometry and pin functions follow the Raspberry Pi pinout.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="GPIO probe: arrow keys move between header pins" aria-valuemin="1" aria-valuemax="40" aria-valuenow="1">${svg}</div>`,
});

let page = k.pageHtml({ title: "Raspberry Pi 4", theme, body, script: kitScript() + live });
if (embed) page = page.replace(/\.iso-page\{[^}]*\}/, ".iso-page{width:100%;margin:0}.iso-figure{margin:0!important}");
const outIndex = process.argv.indexOf("--out");
const outDir = outIndex > 0 ? resolve(process.argv[outIndex + 1]) : HERE;
const file = join(outDir, outIndex > 0 ? "index.html" : theme === "light" ? "raspberry-pi-light.html" : "raspberry-pi.html");
mkdirSync(outDir, { recursive: true });
writeFileSync(file, page);
console.log("wrote", file);
