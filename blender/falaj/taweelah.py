"""Taweelah RO desalination plant — illustrative exterior reconstruction.

Layout follows public aerial imagery: a coastal plot between the intake channel
(north) and the sea (east); pretreatment basins near the intake; four large
process halls; extensive blue solar PV; squat cream product-water tanks; a
product-water pump station (simulation target); admin/control buildings.
Internal arrangement and all equipment are illustrative.

Frame: Blender metres, X east, Y north, Z up.
"""
import math
import random

from mathutils import Vector

from .common import Batch, anchor, collection, export_glb, reset_scene, stats

RND = random.Random(42)
SEA_X = 334.0          # top of the shoreline revetment
CH_Y0, CH_Y1 = 232.0, 292.0   # intake channel (water) between these Y


# ---------------------------------------------------------------------------
# reusable parts
# ---------------------------------------------------------------------------
def seg_box(B, a, b, w, h, mat, z0=0.0):
    ax, ay = a
    bx, by = b
    L = math.hypot(bx - ax, by - ay)
    if L < 1e-6:
        return
    rz = math.atan2(by - ay, bx - ax)
    B.box(((ax + bx) / 2, (ay + by) / 2, z0 + h / 2), (L, w, h), mat, rz=rz)


def railing(B, pts, z, height=1.1, spacing=2.2, mat="steel_grey", closed=False):
    pts = list(pts) + ([pts[0]] if closed else [])
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        L = math.hypot(bx - ax, by - ay)
        n = max(1, int(L / spacing))
        for k in range(n + 1):
            t = k / n
            B.box((ax + (bx - ax) * t, ay + (by - ay) * t, z + height / 2), (0.06, 0.06, height), mat)
        seg_box(B, (ax, ay), (bx, by), 0.06, 0.06, mat, z + height - 0.06)
        seg_box(B, (ax, ay), (bx, by), 0.05, 0.05, mat, z + height * 0.5)


def basin(B, cx, cy, sx, sy, h, water_z, wall=0.5, foam=0.0, walk=True, rail_mat="steel_grey"):
    hx, hy = sx / 2, sy / 2
    B.box((cx, cy + hy - wall / 2, h / 2), (sx, wall, h), "concrete")
    B.box((cx, cy - hy + wall / 2, h / 2), (sx, wall, h), "concrete")
    B.box((cx - hx + wall / 2, cy, h / 2), (wall, sy - 2 * wall, h), "concrete")
    B.box((cx + hx - wall / 2, cy, h / 2), (wall, sy - 2 * wall, h), "concrete")
    B.box((cx - hx * 0.35, cy, (water_z + 0.4) / 2), (0.35, sy - 2 * wall, water_z + 0.4), "concrete_dark")
    B.plane((cx, cy, water_z), sx - 2 * wall, sy - 2 * wall, "water")
    if foam > 0:
        fx = (sx - 2 * wall) * foam
        B.plane((cx + hx - wall - fx / 2, cy, water_z + 0.03), fx, sy - 2 * wall - 0.3, "water_foam")
    if walk:
        for s in (-1, 1):
            y = cy + s * (hy - wall / 2)
            B.plane((cx, y + s * 0.45, h + 0.02), sx, 1.3, "grating")
            railing(B, [(cx - hx, y + s * 1.05), (cx + hx, y + s * 1.05)], h, mat=rail_mat)


def building(B, x0, y0, x1, y1, h, wall="cladding", roof="roof", parapet=1.0, plinth=0.8,
             pilaster=None, pil_mat="cladding_grey"):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    sx, sy = x1 - x0, y1 - y0
    B.box((cx, cy, plinth / 2), (sx + 0.2, sy + 0.2, plinth), "concrete")
    B.box((cx, cy, plinth + (h - plinth) / 2), (sx, sy, h - plinth), wall, top=roof)
    if parapet > 0:
        t = 0.35
        B.box((cx, y1 - t / 2, h + parapet / 2), (sx, t, parapet), pil_mat)
        B.box((cx, y0 + t / 2, h + parapet / 2), (sx, t, parapet), pil_mat)
        B.box((x0 + t / 2, cy, h + parapet / 2), (t, sy - 2 * t, parapet), pil_mat)
        B.box((x1 - t / 2, cy, h + parapet / 2), (t, sy - 2 * t, parapet), pil_mat)
    if pilaster:
        n = int(sx / pilaster)
        for i in range(n + 1):
            x = x0 + i * sx / n
            for y, s in ((y0, -1), (y1, 1)):
                B.box((x, y + s * 0.15, h / 2 + 0.2), (0.6, 0.3, h + 0.4), pil_mat)


def door(B, x, y, z0, w, h, side, mat="louvre_grey", canopy=False):
    sx, sy = side
    if sx:
        B.box((x + sx * 0.12, y, z0 + h / 2), (0.24, w, h), mat)
        B.box((x + sx * 0.2, y, z0 + h + 0.25), (0.4, w + 0.6, 0.5), "steel_grey")
        if canopy:
            B.box((x + sx * 1.2, y, z0 + h + 0.6), (2.4, w + 1.0, 0.15), "steel_grey")
    else:
        B.box((x, y + sy * 0.12, z0 + h / 2), (w, 0.24, h), mat)
        B.box((x, y + sy * 0.2, z0 + h + 0.25), (w + 0.6, 0.4, 0.5), "steel_grey")
        if canopy:
            B.box((x, y + sy * 1.2, z0 + h + 0.6), (w + 1.0, 2.4, 0.15), "steel_grey")


def pv_table(B, x0, y0, n_wide, n_deep, tilt_deg, h0, panel_w=1.05, panel_l=2.0, posts=True):
    W = n_wide * panel_w
    D = n_deep * panel_l
    t = math.radians(tilt_deg)
    Dc, Ds = D * math.cos(t), D * math.sin(t)
    a = Vector((x0, y0, h0)); b = Vector((x0 + W, y0, h0))
    c = Vector((x0 + W, y0 + Dc, h0 + Ds)); d = Vector((x0, y0 + Dc, h0 + Ds))
    off = Vector((0, -math.sin(t), math.cos(t))) * -0.05
    B.poly([a, b, c, d], "solar", uvs=[(0, 0), (0, n_wide), (n_deep, n_wide), (n_deep, 0)])
    a2, b2, c2, d2 = a + off, b + off, c + off, d + off
    B.poly([a2, d2, c2, b2], "steel_grey")
    B.poly([a, a2, b2, b], "steel_grey")
    B.poly([d, c, c2, d2], "steel_grey")
    if posts:
        k = max(2, int(W / 4.2) + 1)
        for i in range(k):
            x = x0 + 0.3 + i * (W - 0.6) / (k - 1)
            B.box((x, y0 + 0.4, (h0 - 0.05) / 2), (0.09, 0.09, h0 - 0.05), "steel_grey")
            hb = h0 + Ds * (Dc - 0.4) / Dc
            B.box((x, y0 + Dc - 0.4, hb / 2), (0.09, 0.09, hb), "steel_grey")


def pv_field(B, x0, x1, y0, y1, n_wide=20, n_deep=2, tilt=25, pitch=7.2, gap=1.6, h0=0.7):
    W = n_wide * 1.05
    y = y0
    while y + n_deep * 2.0 * math.cos(math.radians(tilt)) <= y1:
        x = x0
        while x + W <= x1:
            pv_table(B, x, y, n_wide, n_deep, tilt, h0)
            x += W + gap
        y += pitch


def car(B, x, y, rz, color):
    ca, sa = math.cos(rz), math.sin(rz)

    def L(dx, dy):
        return (x + dx * ca - dy * sa, y + dx * sa + dy * ca)

    px, py = L(0, 0)
    B.box((px, py, 0.72), (4.5, 1.82, 0.72), color, rz=rz)
    cx, cy = L(-0.25, 0)
    B.box((cx, cy, 1.36), (2.5, 1.62, 0.56), "car_glass", rz=rz)
    B.box((cx, cy, 1.665), (2.35, 1.55, 0.07), color, rz=rz)
    for dx in (-1.45, 1.45):
        for dy in (-0.82, 0.82):
            wx, wy = L(dx, dy)
            ox, oy = -sa * 0.12, ca * 0.12
            B.tube((wx - ox, wy - oy, 0.34), (wx + ox, wy + oy, 0.34), 0.34, "rubber", seg=10)


def palm(B, x, y, h=None, seed=0):
    r = random.Random(seed)
    h = h or r.uniform(7.0, 10.5)
    lean = Vector((r.uniform(-0.4, 0.4), r.uniform(-0.4, 0.4), 0))
    pts = [Vector((x, y, h * (i / 6))) + lean * ((i / 6) ** 2) for i in range(7)]
    for i in range(6):
        B.tube(pts[i], pts[i + 1], 0.30 - 0.09 * (i / 6), "trunk", seg=8, caps=False)
    top = pts[-1]
    B.cyl((top.x, top.y, top.z - 0.4), 0.42, 0.8, "trunk", seg=8, top="leaf")
    nf = 15
    for f in range(nf):
        th = 2 * math.pi * f / nf + r.uniform(-0.15, 0.15)
        dirv = Vector((math.cos(th), math.sin(th), 0))
        side = Vector((-math.sin(th), math.cos(th), 0))
        L = r.uniform(3.6, 4.8)
        rise = r.uniform(0.6, 1.4)
        droop = r.uniform(2.2, 3.4)
        prev = None
        for s in range(7):
            t = s / 6
            c = top + dirv * (L * t) + Vector((0, 0, rise * t - droop * t * t))
            w = 0.65 * math.sin(math.pi * min(1.0, t * 1.15)) + 0.08
            pa, pb = c - side * w, c + side * w
            if prev:
                qa, qb, tp = prev
                B.poly([qa, qb, pb, pa], "leaf", uvs=[(0, tp), (1, tp), (1, t), (0, t)])
            prev = (pa, pb, t)


def street_light(B, x, y, rz=0.0, h=10.0):
    B.tube((x, y, 0), (x, y, h), 0.11, "steel_grey", seg=8, caps=False)
    ax, ay = x + math.cos(rz) * 1.4, y + math.sin(rz) * 1.4
    seg_box(B, (x, y), (ax, ay), 0.1, 0.1, "steel_grey", h - 0.1)
    B.box((ax, ay, h - 0.18), (0.75, 0.32, 0.16), "lamp", rz=rz)


def tank_stair(B, cx, cy, r, h, start_deg, sweep_deg=110, steps=42):
    a0 = math.radians(start_deg)
    for i in range(steps):
        t = i / (steps - 1)
        a = a0 + math.radians(sweep_deg) * t
        z = 0.6 + (h - 0.6) * t
        rr = r + 0.75
        B.box((cx + rr * math.cos(a), cy + rr * math.sin(a), z), (0.32, 1.1, 0.06), "grating", rz=a)
    prev = None
    for i in range(0, steps + 1, 3):
        t = min(1.0, i / (steps - 1))
        a = a0 + math.radians(sweep_deg) * t
        z = 0.6 + (h - 0.6) * t
        rr = r + 1.35
        p = Vector((cx + rr * math.cos(a), cy + rr * math.sin(a), z + 1.05))
        if prev is not None:
            B.tube(prev, p, 0.035, "steel_grey", seg=5, caps=False)
            B.tube(Vector((prev.x, prev.y, prev.z - 1.05)), prev, 0.03, "steel_grey", seg=5, caps=False)
        prev = p


def tank(B, cx, cy, r, h, stair_deg=200):
    B.cyl((cx, cy, 0), r + 0.6, 0.6, "concrete", seg=72)
    B.cyl((cx, cy, 0.6), r, h - 0.9, "tank", seg=72, cap=False)
    B.cyl((cx, cy, 0.6 + h - 0.9), r + 0.15, 0.9, "steel_grey", seg=72, cap=False)
    B.dome((cx, cy, 0.6 + h), r + 0.15, 3.2, "roof", seg=72, rings=5)
    B.cyl((cx, cy, 0.6 + h + 3.0), 0.9, 1.2, "steel_grey", seg=12, top="steel_dark")
    for k in range(4):
        a = math.radians(45 + k * 90)
        B.box((cx + r * 0.62 * math.cos(a), cy + r * 0.62 * math.sin(a), 0.6 + h + 1.9), (1.4, 1.4, 0.6), "steel_grey", rz=a)
    n = int(2 * math.pi * r / 3.0)
    ring = [Vector((cx + (r - 0.3) * math.cos(2 * math.pi * i / n), cy + (r - 0.3) * math.sin(2 * math.pi * i / n), 0.6 + h + 0.15)) for i in range(n + 1)]
    for i in range(n):
        B.tube(ring[i] + Vector((0, 0, 1.1)), ring[i + 1] + Vector((0, 0, 1.1)), 0.035, "steel_yellow", seg=5, caps=False)
        B.box((ring[i].x, ring[i].y, ring[i].z + 0.55), (0.06, 0.06, 1.1), "steel_yellow")
    tank_stair(B, cx, cy, r, h + 0.6, stair_deg)


def valve(B, p, axis, r, mat="steel_dark", wheel="steel_red", stem=1.6):
    x, y, z = p
    if axis == "x":
        B.tube((x - r * 0.9, y, z), (x + r * 0.9, y, z), r * 1.25, mat, seg=16)
    else:
        B.tube((x, y - r * 0.9, z), (x, y + r * 0.9, z), r * 1.25, mat, seg=16)
    B.box((x, y, z + r * 1.6), (r * 1.4, r * 1.4, r * 1.4), mat)
    B.tube((x, y, z + r * 2.2), (x, y, z + r * 2.2 + stem), 0.06, "steel_grey", seg=6)
    B.cyl((x, y, z + r * 2.2 + stem), r * 1.1, 0.09, wheel, seg=20)


def pump_set(B, x, y):
    """Horizontal pump + motor on a plinth, shaft along +Y (pump at y)."""
    B.box((x, y + 3.0, 0.7), (3.4, 9.6, 0.6), "concrete")
    B.box((x, y + 3.0, 1.12), (2.8, 8.6, 0.25), "steel_dark")
    cz = 2.5
    B.tube((x, y - 0.8, cz), (x, y + 0.8, cz), 1.2, "steel_blue", seg=28)        # volute
    B.box((x, y, cz - 0.8), (1.6, 1.6, 1.0), "steel_blue")
    B.tube((x, y, cz + 1.0), (x, y, cz + 1.9), 0.48, "steel_blue", seg=18)        # discharge nozzle
    B.cyl((x, y, cz + 1.9), 0.66, 0.12, "steel_blue", seg=18)
    B.tube((x, y - 0.8, cz), (x, y - 2.6, cz), 0.52, "steel_blue", seg=18)        # suction nozzle
    B.tube((x, y + 0.8, cz), (x, y + 2.1, cz), 0.42, "steel_blue", seg=16)        # bearing housing
    B.box((x, y + 2.5, cz), (0.95, 0.9, 0.95), "steel_yellow")                    # coupling guard
    B.tube((x, y + 2.95, cz), (x, y + 6.1, cz), 1.02, "steel_blue", seg=28)       # motor
    for k in range(9):
        yy = y + 3.15 + k * 0.33
        B.tube((x, yy, cz), (x, yy + 0.08, cz), 1.1, "steel_blue", seg=28)        # cooling fins
    B.tube((x, y + 6.1, cz), (x, y + 6.7, cz), 0.92, "steel_grey", seg=24)        # fan cowl
    B.box((x + 0.9, y + 4.2, cz + 0.85), (0.6, 0.7, 0.5), "steel_dark")          # terminal box
    B.box((x - 0.75, y + 4.5, 1.35), (0.5, 3.2, 0.25), "steel_dark")
    B.box((x + 0.75, y + 4.5, 1.35), (0.5, 3.2, 0.25), "steel_dark")
    B.box((x + 2.4, y + 4.0, 0.75), (0.12, 0.12, 1.5), "steel_grey")              # local control station
    B.box((x + 2.4, y + 4.0, 1.6), (0.45, 0.25, 0.55), "steel_yellow")


def cabinet(B, x, y, rz=0.0):
    B.box((x, y, 0.15), (2.6, 2.0, 0.3), "concrete")
    B.box((x, y, 1.35), (1.8, 0.7, 2.1), "cabinet", rz=rz)
    B.box((x, y, 2.75), (2.6, 1.6, 0.08), "white_paint", rz=rz)
    for dx in (-1.1, 1.1):
        B.box((x + dx, y + 0.7, 1.4), (0.08, 0.08, 2.75), "steel_grey")


# ---------------------------------------------------------------------------
# site
# ---------------------------------------------------------------------------
ROADS_X = [(-212, -305, 305), (-62, -305, 305), (22, -90, 226), (118, -305, 305), (212, -305, 305)]
ROADS_Y = [(-305, -212, 212), (-90, -212, 118), (226, -62, 118), (305, -212, 212)]
ROAD_W = 9.0

PUMP_XS = (248, 262, 276, 290)
TANKS = [(34, -128), (106, -128), (178, -128), (250, -128)]


def build(export=True):
    reset_scene()
    S = collection("Static")
    E = collection("Equipment")
    A = collection("Anchors")

    G, R, BLD, PRO, PV, PIPE = (Batch(n) for n in ("Ground", "Roads", "Buildings", "Process", "Solar", "Pipes"))
    DET, VEG, CAR, CTX = (Batch(n) for n in ("Details", "Vegetation", "Vehicles", "Context"))

    # ---- ground & coast ----------------------------------------------------
    G.plane(((-500 + SEA_X) / 2, (-320 + CH_Y0) / 2, 0), SEA_X + 500, CH_Y0 + 320, "sand")
    G.plane(((-500 + SEA_X) / 2, (CH_Y1 + 360) / 2, 0), SEA_X + 500, 360 - CH_Y1, "sand")
    G.box(((-480 + SEA_X) / 2, CH_Y0 - 4, -1.49), (SEA_X + 480, 8.0, 3.0), "concrete")
    G.box(((-480 + SEA_X) / 2, CH_Y1 + 2, -1.49), (SEA_X + 480, 4.0, 3.0), "concrete")
    G.box((-489, (CH_Y0 + CH_Y1) / 2, -1.49), (22, CH_Y1 - CH_Y0, 3.0), "concrete", top="sand")
    for (y0, y1) in ((-1500, CH_Y0), (CH_Y1, 1500)):
        a = Vector((SEA_X, y0, 0.0)); b = Vector((SEA_X, y1, 0.0))
        c = Vector((SEA_X + 22, y1, -3.2)); d = Vector((SEA_X + 22, y0, -3.2))
        G.poly([a, d, c, b], "rock")
    G.plane((0, 0, 0.012), 628, 432, "yard")

    # ---- roads -------------------------------------------------------------
    W = ROAD_W
    for (y, x0, x1) in ROADS_X:
        R.plane(((x0 + x1) / 2, y, 0.03), x1 - x0 + W, W, "asphalt")
    for (x, y0, y1) in ROADS_Y:
        R.plane((x, (y0 + y1) / 2, 0.03), W, y1 - y0 + W, "asphalt")
    R.plane((-120, -270, 0.03), 11, 100, "asphalt")
    xs_j = [x for (x, _, _) in ROADS_Y] + [-120]
    ys_j = [y for (y, _, _) in ROADS_X]
    for (y, x0, x1) in ROADS_X:
        for s in (-1, 1):
            R.plane(((x0 + x1) / 2, y + s * (W / 2 - 0.4), 0.045), x1 - x0, 0.15, "line_white")
        x = x0 + 6
        while x < x1 - 6:
            if all(abs(x - j) > 8 for j in xs_j):
                R.plane((x, y, 0.045), 3.0, 0.15, "line_white")
            x += 9
    for (x, y0, y1) in ROADS_Y:
        for s in (-1, 1):
            R.plane((x + s * (W / 2 - 0.4), (y0 + y1) / 2, 0.045), 0.15, y1 - y0, "line_white")
        y = y0 + 6
        while y < y1 - 6:
            if all(abs(y - j) > 8 for j in ys_j):
                R.plane((x, y, 0.045), 0.15, 3.0, "line_white")
            y += 9

    # ---- perimeter -----------------------------------------------------------
    for (a, b) in [((-320, -220), (-131, -220)), ((-109, -220), (320, -220)), ((-320, -220), (-320, 220))]:
        seg_box(BLD, a, b, 0.3, 3.0, "concrete")
        seg_box(BLD, a, b, 0.5, 0.15, "concrete_dark", 3.0)
    for i in range(int(440 / 3) + 1):
        DET.box((320, -220 + i * 3, 1.25), (0.08, 0.08, 2.5), "steel_grey")
    seg_box(DET, (320, -220), (320, 220), 0.05, 0.05, "steel_grey", 2.45)
    seg_box(DET, (320, -220), (320, 220), 0.04, 0.04, "steel_grey", 1.2)
    BLD.box((-136, -228, 1.6), (7, 5, 3.2), "plaster", top="roof")
    BLD.box((-136, -228, 3.35), (8.5, 6.5, 0.3), "white_paint")
    DET.box((-120, -221, 1.0), (16, 0.12, 0.12), "steel_red")
    DET.box((-112, -221, 0.5), (0.3, 0.3, 1.0), "steel_grey")

    # ---- intake -------------------------------------------------------------
    PRO.box((-130, 236, -0.5), (64, 16, 6.0), "concrete")
    for i in range(4):
        x = -154 + i * 16
        PRO.box((x, 241, 3.5), (0.9, 10, 7.0), "steel_green")
        PRO.box((x + 8, 241, 3.5), (0.9, 10, 7.0), "steel_green")
        PRO.box((x + 4, 236, 3.3), (1.6, 1.6, 1.6), "steel_green")
        PRO.cyl((x + 4, 236, 4.1), 0.7, 1.8, "steel_green", seg=16)
    PRO.box((-130, 236, 9.0), (66, 1.2, 1.0), "steel_yellow")
    for x in (-163, -97):
        PRO.box((x, 236, 4.5), (1.0, 1.0, 9.0), "steel_yellow")
    railing(PRO, [(-162, 228.6), (-98, 228.6)], 2.5)
    for x in (-145, -115):
        PIPE.tube((x, 228, 1.4), (x, 220, 1.4), 1.1, "steel_green", seg=20)
        PRO.box((x, 219, 0.6), (3.2, 3.2, 1.2), "concrete")
    INT = Batch("EQ_tw-plc-intake")
    cabinet(INT, -92, 225)

    # ---- pretreatment: DAF + DMF -----------------------------------------
    for row_y in (195, 160):
        for i in range(6):
            basin(PRO, -286 + i * 26, row_y, 24, 16, 4.2, 3.5, foam=0.55)
    PRO.box((-221, 177.5, 3.2), (156, 6, 6.4), "cladding_grey", top="roof")
    for row_y in (193, 157):
        for i in range(10):
            basin(PRO, -116 + i * 18, row_y, 16, 12, 5.0, 4.3)
    PRO.box((-35, 175, 3.5), (180, 8, 7.0), "cladding_grey", top="roof")
    for i in range(10):
        PRO.box((-116 + i * 18, 175, 7.6), (1.6, 1.6, 1.2), "steel_grey")
    PRO.box((100, 172, 3.2), (48, 62, 6.4), "concrete", top="concrete_dark")
    for i in range(6):
        PRO.box((84 + i * 6.4, 172, 6.6), (1.2, 1.2, 0.5), "steel_grey")
    railing(PRO, [(76, 141), (124, 141), (124, 203), (76, 203)], 6.4, closed=True)
    building(BLD, 80, 126, 120, 138, 8.0, wall="cladding")
    door(BLD, 90, 126, 0.8, 5, 6, (0, -1))
    door(BLD, 110, 126, 0.8, 5, 6, (0, -1))

    # ---- RO halls ------------------------------------------------------------
    halls = [(-60, 48, 60, 93), (80, 48, 200, 93), (-60, -40, 60, 5), (80, -40, 200, 5)]
    for (x0, y0, x1, y1) in halls:
        building(BLD, x0, y0, x1, y1, 14.0, wall="cladding", pilaster=7.5)
        for x in (x0 + 25, x1 - 25):
            door(BLD, x, y0, 0.8, 6.0, 7.0, (0, -1))
            door(BLD, x, y1, 0.8, 6.0, 7.0, (0, 1))
        for x in (x0 + 45, x1 - 45):
            door(BLD, x, y0, 0.8, 1.4, 2.5, (0, -1), mat="steel_dark", canopy=True)
        x = x0 + 10
        while x < x1 - 8:
            BLD.box((x, y0 - 0.12, 11.0), (4.5, 0.24, 2.0), "louvre_grey")
            BLD.box((x, y1 + 0.12, 11.0), (4.5, 0.24, 2.0), "louvre_grey")
            x += 15
        for y in (y0 + 12, y1 - 12):
            BLD.box((x0 - 0.12, y, 11.0), (0.24, 4.5, 2.0), "louvre_grey")
            BLD.box((x1 + 0.12, y, 11.0), (0.24, 4.5, 2.0), "louvre_grey")
        yy = y0 + 4
        while yy + 4.2 < y1 - 3:
            xx = x0 + 4
            while xx + 21 < x1 - 3:
                pv_table(PV, xx, yy, 20, 2, 10, 14.35, posts=False)
                xx += 22.5
            yy += 5.4
        for k in range(5):
            DET.cyl((x0 + 12 + k * 24, y1 - 2.2, 14.0), 0.9, 1.3, "steel_grey", seg=14, top="steel_dark")
        DET.box((x1 - 6, y0 + 4, 14.9), (4.0, 2.5, 1.8), "steel")
        DET.box((x1 - 12, y0 + 4, 14.9), (4.0, 2.5, 1.8), "steel")
        DET.box((x0 - 0.2, (y0 + y1) / 2, 7.5), (0.12, 0.6, 14.5), "steel_yellow")
    ROC = Batch("EQ_tw-plc-ro")
    cabinet(ROC, 205, -18)

    # pipe rack between hall rows
    rack_y, x = 33.0, -64.0
    while x <= 212:
        for y in (rack_y - 2.6, rack_y + 2.6):
            PIPE.box((x, y, 4.2), (0.35, 0.35, 8.4), "steel_grey")
        PIPE.box((x, rack_y, 6.0), (0.3, 5.6, 0.35), "steel_grey")
        PIPE.box((x, rack_y, 8.3), (0.3, 5.6, 0.35), "steel_grey")
        x += 8
    for (dy, z, r, m) in ((-1.8, 6.55, 0.55, "steel_green"), (-0.4, 6.55, 0.7, "steel_blue"),
                          (1.2, 6.55, 0.45, "steel"), (-1.2, 8.85, 0.4, "steel_grey"), (1.0, 8.85, 0.5, "steel_blue")):
        PIPE.tube((-66, rack_y + dy, z), (218, rack_y + dy, z), r, m, seg=14)
    # N-S rack to the tank farm (elevated over road Y=-62)
    y = 30.0
    while y >= -98:
        for xx in (213.5, 218.5):
            PIPE.box((xx, y, 3.4), (0.3, 0.3, 6.8), "steel_grey")
        PIPE.box((216, y, 6.4), (5.4, 0.3, 0.3), "steel_grey")
        y -= 8
    for (dx, r, m) in ((-1.4, 0.6, "steel_blue"), (0.2, 0.5, "steel"), (1.6, 0.45, "steel_green")):
        PIPE.tube((216 + dx, 31, 6.9), (216 + dx, -96, 6.9), r, m, seg=14)

    # ---- PV fields -------------------------------------------------------------
    pv_field(PV, 140, 296, 126, 204)
    pv_field(PV, -298, -104, -46, 108)

    # ---- product-water tanks -------------------------------------------------
    for i, (tx, ty) in enumerate(TANKS[:3]):
        tank(PRO, tx, ty, 27.0, 14.0, stair_deg=150 + i * 20)
    T4 = Batch("EQ_tw-tank")
    tank(T4, TANKS[3][0], TANKS[3][1], 27.0, 14.0, stair_deg=150)
    for (tx, ty) in TANKS:
        PIPE.tube((tx, ty + 27.2, 1.4), (tx, -94, 1.4), 0.7, "steel_blue", seg=16)
        PIPE.tube((tx, -94, 1.4), (tx, -94, 5.5), 0.7, "steel_blue", seg=16)
    PIPE.tube((30, -94, 5.5), (296, -94, 5.5), 0.9, "steel_blue", seg=18)       # elevated outlet manifold
    PIPE.tube((296, -94, 5.5), (296, 20, 5.5), 0.9, "steel_blue", seg=18)        # suction main north
    PIPE.tube((296, 20, 5.5), (296, 27, 2.5), 0.9, "steel_blue", seg=18)
    for x in range(36, 296, 8):
        PIPE.box((x, -94, 2.3), (0.4, 0.4, 4.6), "steel_grey")
        PIPE.box((x, -94, 4.6), (0.4, 2.4, 0.3), "steel_grey")
    for y in range(-90, 20, 8):
        PIPE.box((296, y, 2.3), (0.4, 0.4, 4.6), "steel_grey")
        PIPE.box((296, y, 4.6), (2.4, 0.4, 0.3), "steel_grey")

    # ---- pump station (simulation target) ----------------------------------
    PX, PY = 267, 40
    PRO.box((PX, PY, 0.2), (62, 58, 0.4), "concrete")
    for x in (239, 258, 277, 295):
        for y in (13, 40, 67):
            PRO.box((x, y, 4.85), (0.5, 0.5, 9.0), "steel_grey")
    for y in (13, 40, 67):
        PRO.box((PX, y, 9.5), (58, 0.4, 0.8), "steel_grey")
    for x in (239, 258, 277, 295):                                              # open-air portal frames
        PRO.box((x, PY, 9.5), (0.4, 56, 0.6), "steel_grey")
    for y in (24, 56):
        PRO.box((PX, y, 8.2), (56, 0.45, 0.55), "steel_yellow")
    PRO.box((254, PY, 8.6), (1.0, 32, 0.7), "steel_yellow")
    for x in PUMP_XS:
        PRO.plane((x, 37, 0.42), 5.0, 13.0, "line_yellow")
        PRO.plane((x, 37, 0.43), 4.6, 12.6, "concrete")
    PUMP = Batch("EQ_tw-pump-1")
    for x in PUMP_XS:
        pump_set(PUMP, x, 34.0)
        PUMP.tube((x, 34.0, 4.5), (x, 34.0, 5.4), 0.48, "steel_blue", seg=16)
        PUMP.tube((x, 34.0, 5.4), (x, 52.0, 5.4), 0.48, "steel_blue", seg=16)
        valve(PUMP, (x, 44.0, 5.4), "y", 0.48)
        PUMP.tube((x, 31.4, 2.5), (x, 27.0, 2.5), 0.52, "steel_blue", seg=16)
    PIPE.tube((242, 27, 2.5), (296, 27, 2.5), 0.9, "steel_blue", seg=20)        # suction header
    PIPE.tube((242, 52, 5.4), (297, 52, 5.4), 0.85, "steel_blue", seg=20)       # discharge header
    PIPE.tube((297, 52, 5.4), (297, 52, 1.4), 0.85, "steel_blue", seg=20)
    PIPE.tube((297, 52, 1.4), (297, 116, 1.4), 0.85, "steel_blue", seg=20)      # transmission main
    for yy in range(58, 116, 6):
        PIPE.box((297, yy, 0.4), (2.2, 0.8, 0.8), "concrete")
    VAL = Batch("EQ_tw-valve-prod")
    valve(VAL, (291, 52, 5.4), "x", 0.85, wheel="steel_red", stem=1.4)
    FLOW = Batch("EQ_tw-sensor-flow")
    FLOW.tube((297, 87, 1.4), (297, 89.4, 1.4), 1.05, "steel_blue", seg=20)
    FLOW.box((299.2, 88.2, 1.0), (0.12, 0.12, 2.0), "steel_grey")
    FLOW.box((299.2, 88.2, 2.15), (0.7, 0.5, 0.6), "cabinet")
    PLC = Batch("EQ_tw-plc-pump")
    cabinet(PLC, 241, 63)
    building(BLD, 237, 70, 257, 82, 4.8, wall="plaster", parapet=0.6, plinth=0.4)
    for i in range(3):
        DET.box((241 + i * 6, 76, 5.8), (2.2, 1.6, 0.8), "steel")
    door(BLD, 242, 70, 0.4, 1.4, 2.4, (0, -1), mat="steel_dark", canopy=True)

    # ---- post-treatment / chemicals / substation -----------------------------
    for i in range(8):
        x = -36 + i * 12
        PRO.cyl((x, -82, 0), 3.0, 10.5, "hdpe_white", seg=24, top="steel_grey")
        PRO.box((x, -82, 10.9), (3.2, 3.2, 0.12), "grating")
    railing(PRO, [(-40, -78.6), (52, -78.6)], 10.9)
    building(BLD, -42, -111, 2, -97, 7.0, wall="plaster", parapet=0.6)
    PRO.box((-125, -95, 0.5), (52, 32, 1.0), "concrete")
    PRO.box((-125, -95, 1.0), (50, 30, 0.04), "concrete_dark")
    for i in range(3):
        for j in range(2):
            PRO.cyl((-140 + i * 14, -103 + j * 16, 1.0), 2.3, 7.0, "hdpe_white", seg=20, top="hdpe_white")
    PRO.box((-112, -95, 7.6), (24, 30, 0.2), "white_paint")
    for (x, y) in ((-124, -81), (-100, -81), (-124, -109), (-100, -109)):
        PRO.box((x, y, 3.8), (0.3, 0.3, 7.6), "steel_grey")
    building(BLD, -298, -120, -258, -90, 9.0, wall="plaster", parapet=0.8)
    for k in range(4):
        BLD.box((-257.88, -116 + k * 7.5, 5.5), (0.24, 4.0, 4.5), "louvre")
    for i in range(3):
        y = -118 + i * 18
        PRO.box((-239, y, 2.4), (6.0, 4.5, 4.8), "transformer")
        for k in range(5):
            PRO.box((-242.6, y - 1.8 + k * 0.9, 2.2), (1.2, 0.12, 3.6), "steel_grey")
        PRO.tube((-237, y - 2, 6.2), (-237, y + 2, 6.2), 0.55, "steel_grey", seg=12)
        for k in range(3):
            PRO.cyl((-239 + (k - 1) * 1.4, y + 1.2, 4.8), 0.18, 1.6, "porcelain", seg=8)
        PRO.box((-239, y + 9, 4.0), (10, 0.35, 8.0), "concrete")

    # ---- admin, control, workshop, parking ---------------------------------
    BLD.box((-272, -185, 2.0), (56, 30, 4.0), "glass_blue", top="roof")
    BLD.box((-272, -185, 8.0), (57, 31, 8.0), "panel_white", top="roof")
    for z in (6.4, 10.4):
        BLD.box((-272, -200.6, z), (50, 0.4, 1.6), "glass_blue")
        BLD.box((-272, -169.4, z), (50, 0.4, 1.6), "glass_blue")
    BLD.box((-272, -203, 4.3), (16, 6, 0.4), "white_paint")
    for x in (-279, -265):
        BLD.box((x, -205.5, 2.1), (0.4, 0.4, 4.2), "steel")
    for i in range(4):
        DET.box((-292 + i * 8, -178, 12.8), (3.5, 2.4, 1.6), "steel")
    BLD.box((-207, -186, 4.3), (42, 24, 8.6), "panel_white", top="roof")
    BLD.box((-207, -198.2, 5.8), (38, 0.4, 2.2), "glass_blue")
    BLD.box((-207, -173.8, 5.8), (38, 0.4, 2.2), "glass_blue")
    BLD.box((-207, -198.2, 1.8), (12, 0.4, 2.6), "glass_blue")
    DET.box((-192, -178, 14.5), (0.5, 0.5, 12.0), "steel_grey")
    DET.tube((-192, -178, 14.0), (-190.6, -178, 15.4), 1.0, "white_paint", seg=16)
    for k in range(3):
        fx = -258 + k * 4
        DET.tube((fx, -204.5, 0), (fx, -204.5, 11), 0.07, "steel", seg=6, caps=False)
        DET.box((fx + 0.55, -204.5, 10.3), (1.0, 0.03, 1.2), "flag_red")
        DET.box((fx + 2.0, -204.5, 10.7), (1.9, 0.03, 0.4), "flag_green")
        DET.box((fx + 2.0, -204.5, 10.3), (1.9, 0.03, 0.4), "flag_white")
        DET.box((fx + 2.0, -204.5, 9.9), (1.9, 0.03, 0.4), "flag_black")
    BLD.box((-25, -184, 5.0), (90, 32, 10.0), "cladding_grey", top="roof")
    for x in (-55, -35, -15, 5):
        door(BLD, x, -200, 0, 6, 7, (0, -1))
    for k in range(4):
        BLD.box((-25, -193 + k * 6, 10.08), (80, 1.4, 0.15), "glass")
    R.plane((-245, -147, 0.035), 112, 26, "asphalt")
    for i in range(22):
        x = -298 + i * 5.0
        for yl in (-157.0, -137.0):
            R.plane((x, yl, 0.05), 0.15, 5.0, "line_white")
    for row_y, flip in ((-154.5, 0.0), (-139.5, math.pi)):
        for i in range(21):
            x = -295.5 + i * 5.0
            for xs in (x - 1.3, x + 1.3):
                DET.box((xs, row_y + (2.2 if flip else -2.2), 1.4), (0.12, 0.12, 2.8), "steel")
            DET.box((x, row_y, 2.85), (5.0, 6.0, 0.08), "white_paint")
            if RND.random() < 0.78:
                col = RND.choice(["car_white"] * 5 + ["car_silver", "car_silver", "car_black", "car_grey", "car_blue"])
                car(CAR, x, row_y, math.pi / 2 + flip, col)
    G.plane((-272, -204, 0.02), 56, 5, "grass")
    G.plane((-207, -204, 0.02), 42, 5, "grass")
    for i in range(10):
        palm(VEG, -296 + i * 5.6, -204, seed=10 + i)
    for i in range(7):
        palm(VEG, -226 + i * 6.2, -204, seed=40 + i)
    for i in range(8):
        palm(VEG, -150, -196 + i * 9, seed=60 + i)
    for i in range(6):
        car(CAR, -60 + i * 9, -150, 0.25 * RND.uniform(-1, 1), RND.choice(["car_white", "car_white", "car_silver"]))

    # ---- street lights -------------------------------------------------------
    for (y, x0, x1) in ROADS_X:
        off = 6.0 if y == 212 else -6.0
        x = x0 + 20
        while x < x1 - 10:
            street_light(DET, x, y + off, rz=-math.copysign(math.pi / 2, off))
            x += 45
    for (x, y0, y1) in ROADS_Y:
        off = -6.0 if x == -305 else 6.0
        y = y0 + 20
        while y < y1 - 10:
            street_light(DET, x + off, y, rz=0.0 if off < 0 else math.pi)
            y += 45

    # ---- context: neighbouring Taweelah complex north of the channel ------
    for (x, h) in ((-320, 78), (-290, 78), (-260, 78), (-180, 62), (-160, 62)):
        CTX.cyl((x, 334, 0), 3.2, h, "concrete", seg=20, top="steel_dark", r_top=2.6)
        CTX.cyl((x, 334, h - 6), 2.8, 4.0, "steel_red", seg=20, cap=False)
    CTX.box((-280, 318, 14), (90, 26, 28), "cladding_grey", top="roof")
    CTX.box((-150, 316, 11), (70, 22, 22), "cladding", top="roof")
    CTX.box((-40, 322, 8), (60, 30, 16), "cladding_grey", top="roof")
    CTX.box((70, 324, 6), (90, 26, 12), "cladding", top="roof")

    # ---- write objects -----------------------------------------------------
    for b in (G, R, BLD, PRO, PV, PIPE, DET, VEG, CAR, CTX):
        b.build(S)
    for b in (PUMP, T4, VAL, FLOW, PLC, ROC, INT):
        b.build(E)

    # ---- simulation anchors (marker positions) -------------------------------
    anchors = {
        "tw-ws-remote": (-286, -185, 17), "tw-ws-eng": (-262, -185, 17),
        "tw-fw-it": (-224, -186, 13), "tw-hist": (-215, -186, 13), "tw-fw-ot": (-206, -186, 13),
        "tw-scada": (-197, -186, 13), "tw-hmi": (-188, -186, 13),
        "tw-plc-intake": (-92, 225, 8), "tw-plc-ro": (205, -18, 8),
        "tw-plc-pump": (241, 63, 13), "tw-pump-1": (269, 37, 15),
        "tw-valve-prod": (291, 52, 12), "tw-sensor-flow": (299, 88, 7),
        "tw-tank": (250, -128, 24),
    }
    for k, p in anchors.items():
        anchor("ANCHOR_" + k, p, A)
    out = stats()
    if export:
        out["glb"] = export_glb("taweelah.glb")
    return out
