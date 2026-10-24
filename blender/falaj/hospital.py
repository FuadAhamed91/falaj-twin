"""Cleveland Clinic Abu Dhabi — illustrative exterior reconstruction (v2).

Public references: a stack of interlocking glazed volumes (~99.6 m) crowned by a
long inpatient slab wrapped in a white diamond lattice (double-skin) that floats
on a dark recessed storey; a west cantilever carrying a helipad; planted sky
terraces; a glazed waterfront podium with palms, on Al Maryah Island with the
water to the west.

This version models the signature diamond lattice as real 3-D members (round
tube) so it casts shadows and reads correctly in the browser, and refines the
massing. Frame: Blender metres, X east, Y north, Z up. Water is west (−X).
"""
import math
import random

from mathutils import Vector

from .common import Batch, anchor, collection, export_glb, reset_scene, stats

RND = random.Random(7)


# ---------------------------------------------------------------------------
# diamond lattice as real geometry over a vertical rectangular face
# ---------------------------------------------------------------------------
def lattice(B, origin, u_dir, v_dir, W, H, pitch, r, mat, nrail=True):
    """Diagonal diamond lattice on the rect spanned by u_dir(width)×v_dir(height).

    origin: 3-D corner (u=0,v=0). u_dir,v_dir: unit Vectors. Members are round
    tubes of radius r at ±45°, with pitch `pitch` between parallel lines.
    """
    o = Vector(origin)
    U = Vector(u_dir).normalized()
    V = Vector(v_dir).normalized()

    def P(u, v):
        return o + U * u + V * v

    step = pitch * math.sqrt(2.0)
    # family A: v = u - c  (slope +1)
    c = -H
    while c <= W:
        u1, u2 = max(0.0, c), min(W, c + H)
        if u2 - u1 > 0.4:
            B.tube(P(u1, u1 - c), P(u2, u2 - c), r, mat, seg=6, caps=False, smooth=True)
        c += step
    # family B: v = c - u  (slope −1)
    c = 0.0
    while c <= W + H:
        u1, u2 = max(0.0, c - H), min(W, c)
        if u2 - u1 > 0.4:
            B.tube(P(u1, c - u1), P(u2, c - u2), r, mat, seg=6, caps=False, smooth=True)
        c += step
    if nrail:  # perimeter + a couple of horizontal transoms
        for vv in (0.0, H * 0.5, H):
            B.tube(P(0, vv), P(W, vv), r * 0.8, mat, seg=6, caps=False)
        for uu in (0.0, W):
            B.tube(P(uu, 0), P(uu, H), r * 0.8, mat, seg=6, caps=False)


def mullions(B, cx, cy, z0, z1, sx, sy, floor=4.2, mat='steel'):
    """Horizontal floor lines + a few vertical mullions as thin bands on a box."""
    h = z1 - z0
    n = max(1, int(h / floor))
    for i in range(n + 1):
        B.box((cx, cy, z0 + i * h / n), (sx + 0.12, sy + 0.12, 0.14), mat)


def glass_box(B, cx, cy, z0, z1, sx, sy, mat='glass_blue', cap='roof', fascia=True, mull=True):
    h = z1 - z0
    B.box((cx, cy, z0 + h / 2), (sx, sy, h), mat, top=cap)
    if fascia:
        B.box((cx, cy, z1 + 0.3), (sx + 0.5, sy + 0.5, 0.6), 'steel_grey')
    if mull:
        mullions(B, cx, cy, z0 + 0.5, z1 - 0.3, sx, sy)


def palm(B, x, y, h=None, seed=0):
    r = random.Random(seed)
    h = h or r.uniform(8, 12)
    pts = [Vector((x, y, h * (i / 6))) for i in range(7)]
    for i in range(6):
        B.tube(pts[i], pts[i + 1], 0.32 - 0.1 * (i / 6), 'trunk', seg=8, caps=False)
    top = pts[-1]
    B.cyl((top.x, top.y, top.z - 0.4), 0.45, 0.8, 'trunk', seg=8, top='leaf')
    for f in range(16):
        th = 2 * math.pi * f / 16 + r.uniform(-0.15, 0.15)
        dv = Vector((math.cos(th), math.sin(th), 0))
        sv = Vector((-math.sin(th), math.cos(th), 0))
        L, rise, droop = r.uniform(3.6, 5), r.uniform(0.6, 1.4), r.uniform(2.4, 3.6)
        prev = None
        for s in range(7):
            t = s / 6
            c = top + dv * (L * t) + Vector((0, 0, rise * t - droop * t * t))
            w = 0.6 * math.sin(math.pi * min(1, t * 1.15)) + 0.08
            pa, pb = c - sv * w, c + sv * w
            if prev:
                qa, qb, tp = prev
                B.poly([qa, qb, pb, pa], 'leaf', uvs=[(0, tp), (1, tp), (1, t), (0, t)])
            prev = (pa, pb, t)


def car(B, x, y, rz, color):
    ca, sa = math.cos(rz), math.sin(rz)
    L = lambda dx, dy: (x + dx * ca - dy * sa, y + dx * sa + dy * ca)
    px, py = L(0, 0)
    B.box((px, py, 0.72), (4.6, 1.85, 0.72), color, rz=rz)
    cx, cy = L(-0.2, 0)
    B.box((cx, cy, 1.36), (2.6, 1.64, 0.56), 'car_glass', rz=rz)
    B.box((cx, cy, 1.67), (2.4, 1.56, 0.07), color, rz=rz)
    for dx in (-1.5, 1.5):
        for dy in (-0.84, 0.84):
            wx, wy = L(dx, dy)
            B.tube((wx - sa * 0.12, wy + ca * 0.12, 0.34), (wx + sa * 0.12, wy - ca * 0.12, 0.34), 0.34, 'rubber', seg=10)


def build(export=True):
    reset_scene()
    S = collection('Static')
    E = collection('Equipment')
    A = collection('Anchors')
    G, POD, TOW, LAT, GRN, DET, VEG, CAR, CTX = (Batch(n) for n in
        ('Ground', 'Podium', 'Tower', 'Lattice', 'Gardens', 'Details', 'Vegetation', 'Vehicles', 'Context'))

    # ---- island ground: water (west) + stone plaza + corniche -------------
    G.plane((-300, 0, -0.6), 600, 1100, 'water')
    G.box((-96, 0, -0.3), (12, 1100, 1.2), 'concrete')
    G.plane((-89, 0, 0.05), 2, 1100, 'line_white')
    G.plane((150, 0, 0.0), 500, 1100, 'paving')
    G.plane((40, 0, 0.02), 190, 170, 'paving')
    G.plane((330, 0, 0.03), 26, 1100, 'asphalt')
    for y in range(-520, 521, 14):
        G.plane((330, y, 0.05), 0.2, 6, 'line_white')
    G.plane((330, 0, 0.05), 0.5, 1100, 'line_yellow')

    # ---- 1. glazed waterfront podium (long, N-S), floors 0-18 -------------
    glass_box(POD, -46, 0, 0.0, 18, 44, 158, 'glass_blue')
    POD.box((-46, 0, 9), (45, 159, 0.5), 'steel_grey')          # belt
    # entrance: recessed glazed lobby + canopy (east face)
    POD.box((-20, 0, 6.5), (14, 34, 13.0), 'glass', top='roof')
    POD.box((-13, 0, 6.6), (12, 34, 0.5), 'white_paint')        # canopy
    for yy in (-14, -4, 6, 16):
        DET.box((-14, yy, 3.3), (0.6, 0.6, 6.6), 'steel')

    # ---- 2. interlocking mid volumes (glass), floors 18-62 ---------------
    glass_box(TOW, 4, -26, 18, 58, 46, 58, 'glass_blue')        # south-east block
    glass_box(TOW, 10, 34, 18, 52, 44, 60, 'gold', cap='leaf')  # gold block, planted roof
    mullions(TOW, 10, 34, 19, 52, 44, 60, floor=4.2, mat='gold')
    # west cantilever bar reaching the water, floors 48-62
    glass_box(TOW, -34, 30, 48, 62, 78, 36, 'glass_blue')
    TOW.box((-66, 30, 55), (12, 36, 14), 'window_dark')         # recessed underside

    # ---- 3. planted sky terraces (the signature green decks) -------------
    for (gx, gy, gw, gd, gz) in ((26, 56, 40, 14, 52.3), (-20, 8, 30, 40, 62.3), (30, -6, 36, 16, 58.3)):
        GRN.box((gx, gy, gz), (gw, gd, 0.5), 'leaf')
        for _ in range(int(gw * gd / 55)):
            px = gx + RND.uniform(-gw / 2 + 2, gw / 2 - 2)
            py = gy + RND.uniform(-gd / 2 + 2, gd / 2 - 2)
            GRN.cyl((px, py, gz + 0.5), RND.uniform(0.8, 1.6), RND.uniform(2, 4), 'leaf', seg=7, top='leaf')

    # ---- 4. hero inpatient slab: teal glass + white diamond lattice ------
    sx0, sx1, sy0, sy1 = -20, 28, -60, 68      # slab footprint (local)
    z_band0, z_band1, z_top = 62.0, 65.0, 101.0
    cx, cy = (sx0 + sx1) / 2, (sy0 + sy1) / 2
    W, D = sx1 - sx0, sy1 - sy0
    TOW.box((cx, cy, (z_band0 + z_band1) / 2), (W - 1, D - 1, z_band1 - z_band0), 'window_dark')  # float band
    glass_box(TOW, cx, cy, z_band1, z_top, W, D, 'diagrid', cap='roof', mull=False)               # teal glass body
    TOW.box((cx, cy, z_top + 0.6), (W + 1.4, D + 1.4, 1.2), 'steel_grey')                         # crown
    # real diamond lattice, offset 0.6 m outside each face (double skin)
    pitch, rad = 5.2, 0.16
    off = 0.7
    lattice(LAT, (sx0 - off, sy0, z_band1), Vector((0, 1, 0)), Vector((0, 0, 1)), D, z_top - z_band1, pitch, rad, 'steel')  # west
    lattice(LAT, (sx1 + off, sy1, z_band1), Vector((0, -1, 0)), Vector((0, 0, 1)), D, z_top - z_band1, pitch, rad, 'steel')  # east
    lattice(LAT, (sx1, sy0 - off, z_band1), Vector((-1, 0, 0)), Vector((0, 0, 1)), W, z_top - z_band1, pitch, rad, 'steel')  # south
    lattice(LAT, (sx0, sy1 + off, z_band1), Vector((1, 0, 0)), Vector((0, 0, 1)), W, z_top - z_band1, pitch, rad, 'steel')  # north

    # rooftop plant screen
    for k in range(3):
        DET.box((cx - 14 + k * 14, cy - 44, z_top + 2.1), (10, 9, 2.8), 'louvre_grey')

    # ---- 5. helipad on the west cantilever roof --------------------------
    hx, hy, hz = -34, 30, 62.2
    DET.cyl((hx, hy, hz), 12, 0.5, 'asphalt', seg=48, top='asphalt')
    DET.cyl((hx, hy, hz + 0.5), 9, 0.05, 'line_white', seg=40)
    DET.cyl((hx, hy, hz + 0.56), 7.8, 0.06, 'asphalt', seg=40)
    DET.box((hx, hy, hz + 0.7), (1.3, 7, 0.08), 'line_white')
    DET.box((hx, hy, hz + 0.7), (7, 1.3, 0.08), 'line_white')
    for a in range(16):
        ang = 2 * math.pi * a / 16
        DET.box((hx + 11.2 * math.cos(ang), hy + 11.2 * math.sin(ang), hz + 0.4), (0.18, 0.18, 0.8), 'steel_yellow')

    # ---- rooftop OT equipment groups -------------------------------------
    AHU = Batch('EQ_cc-ahu')
    AHU.box((cx + 8, cy - 46, z_top + 1.6), (16, 9, 3.2), 'cabinet')
    for i in range(4):
        AHU.cyl((cx + 2 + i * 4, cy - 46, z_top + 3.2), 1.4, 2.2, 'steel_grey', seg=16, top='grating')
    HVAC = Batch('EQ_cc-plc-hvac')
    HVAC.box((cx - 12, cy - 48, z_top + 1.8), (2.0, 1.2, 2.2), 'cabinet')
    HVAC.box((cx - 12, cy - 48, z_top + 3.0), (2.4, 1.6, 0.1), 'white_paint')
    POWER = Batch('EQ_cc-plc-power')
    POWER.box((10, 56, 53.0), (6, 4, 2.6), 'transformer')
    POWER.cyl((11, 56, 55.3), 0.8, 1.0, 'steel_grey', seg=12)
    SENS = Batch('EQ_cc-sensor')
    SENS.box((-18, 8, 63.0), (0.5, 0.5, 1.4), 'steel_grey')
    SENS.box((-18, 8, 63.9), (0.8, 0.5, 0.5), 'cabinet')

    # ---- plaza life ------------------------------------------------------
    for i in range(16):
        palm(VEG, -72, -250 + i * 32, seed=i)
    for i in range(12):
        palm(VEG, 64, -200 + i * 36, seed=30 + i)
    for i in range(9):
        G.plane((96, -200 + i * 48, 0.05), 11, 32, 'grass')
    G.plane((70, -70, 0.06), 34, 110, 'water')                 # reflecting pool
    for i in range(8):
        car(CAR, 80, -70 + i * 18, math.pi / 2, RND.choice(['car_white', 'car_white', 'car_silver', 'car_black', 'car_grey']))
    for y in range(-460, 461, 50):
        DET.tube((-86, y, 0), (-86, y, 9), 0.1, 'steel_grey', seg=8, caps=False)
        DET.box((-83.5, y, 8.9), (3.2, 0.28, 0.16), 'lamp')

    # ---- context: Al Maryah towers ---------------------------------------
    for (bx, by, w, d, h, m) in (
        (270, -280, 46, 46, 190, 'glass_blue'), (350, -140, 40, 40, 150, 'glass'),
        (300, 180, 50, 38, 220, 'glass_blue'), (380, 70, 42, 42, 120, 'cladding_grey'),
        (260, 330, 44, 44, 165, 'glass'), (165, -360, 40, 40, 140, 'glass_blue'),
        (150, 300, 38, 38, 110, 'glass'),
    ):
        CTX.box((bx, by, h / 2), (w, d, h), m, top='roof')
        CTX.box((bx, by, h + 1), (w + 1, d + 1, 2), 'steel_grey')
    CTX.plane((-460, 0, -0.5), 320, 1400, 'water')

    for b in (G, POD, TOW, LAT, GRN, DET, VEG, CAR, CTX):
        b.build(S)
    for b in (AHU, HVAC, POWER, SENS):
        b.build(E)

    anchors = {
        'cc-ws': (78, 30, 24), 'cc-fw': (64, 10, 20),
        'cc-bms': (10, 44, 56), 'cc-hmi': (0, 40, 54),
        'cc-plc-hvac': (cx - 12, cy - 48, z_top + 6), 'cc-plc-power': (10, 56, 58),
        'cc-ahu': (cx + 8, cy - 46, z_top + 7), 'cc-sensor': (-18, 8, 66),
    }
    for k, p in anchors.items():
        anchor('ANCHOR_' + k, p, A)

    out = stats()
    if export:
        out['glb'] = export_glb('cleveland-clinic.glb')
    return out
