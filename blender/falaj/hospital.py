"""Cleveland Clinic Abu Dhabi — illustrative exterior reconstruction.

Public references: a stack of separate glazed boxes (~99.6 m), a long N-S
inpatient slab in double-skin diamond-lattice teal glass floating on a recessed
dark band, mid-level cantilevering glass bars (north one carries a helipad), a
gold-patterned block, and a long low glass waterfront podium with palms, on
Al Maryah Island with the water to the west. Grid rotated ~7°.

Frame: Blender metres, X east, Y north, Z up. Water is to the west (−X).
"""
import math
import random

from mathutils import Vector

from .common import Batch, anchor, collection, export_glb, reset_scene, stats

RND = random.Random(7)
ROT = math.radians(-7)  # site grid, clockwise


def R(x, y):
    """Rotate a local (east,north) point into world by the site grid angle."""
    ca, sa = math.cos(ROT), math.sin(ROT)
    return (x * ca - y * sa, x * sa + y * ca)


def rbox(B, cx, cy, cz, sx, sy, sz, mat, **kw):
    wx, wy = R(cx, cy)
    B.box((wx, wy, cz), (sx, sy, sz), mat, rz=ROT, **kw)


def glass_volume(B, cx, cy, z0, z1, sx, sy, mat='glass_blue', band=True, crown='roof'):
    """A glazed block with a slim roof cap and an optional recessed dark base band."""
    h = z1 - z0
    rbox(B, cx, cy, z0 + h / 2, sx, sy, h, mat, top=crown)
    rbox(B, cx, cy, z1 + 0.35, sx + 0.6, sy + 0.6, 0.7, 'steel_grey')  # roof fascia
    if band:
        rbox(B, cx, cy, z0 + 1.0, sx + 1.2, sy + 1.2, 2.0, 'window_dark')  # shadow gap


def mullion_frame(B, cx, cy, z0, z1, sx, sy, step=6.0, mat='steel_grey'):
    h = z1 - z0
    n = max(1, int(h / 4.0))
    for i in range(n + 1):
        rbox(B, cx, cy, z0 + i * h / n, sx + 0.1, sy + 0.1, 0.18, mat)


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
    G, PODIUM, TOWER, DET, VEG, CAR, CTX = (Batch(n) for n in
        ('Ground', 'Podium', 'Tower', 'Details', 'Vegetation', 'Vehicles', 'Context'))

    # ---- island ground: water (west) + stone plaza + corniche ---------------
    G.plane((-260, 0, -0.6), 520, 900, 'water')
    G.box((-96, 0, -0.3), (12, 900, 1.2), 'concrete')          # quay wall
    G.plane((-96 + 6, 0, 0.04), 2, 900, 'line_white')
    G.plane((130, 0, 0.0), 460, 900, 'paving')                 # plaza + roads east
    G.plane((40, 0, 0.02), 170, 150, 'paving')                 # building plaza
    # boulevard east
    G.plane((300, 0, 0.03), 26, 900, 'asphalt')
    for y in range(-440, 441, 14):
        G.plane((300, y, 0.05), 0.2, 6, 'line_white')
    G.plane((300, 0, 0.05), 0.5, 900, 'line_yellow')

    # ---- the stacked-box tower (local coords; +Y north, water at −X) --------
    # Podium: long low glazed waterfront block (N-S), floors 0-17.
    glass_volume(PODIUM, -40, 0, 0.0, 17, 46, 150, 'glass_blue', band=False)
    mullion_frame(PODIUM, -40, 0, 0.5, 17, 46, 150, mat='steel')
    rbox(PODIUM, -40, 0, 8.5, 46, 150, 0.4, 'steel_grey')       # mid belt
    # entrance canopy (east face)
    rbox(PODIUM, -14, 0, 7.0, 10, 30, 0.6, 'white_paint')
    for yy in (-12, 0, 12):
        rbox(DET, -15, yy, 3.5, 0.6, 0.6, 7.0, 'steel')
    # green terrace roof over part of podium
    rbox(PODIUM, -52, 48, 17.3, 28, 48, 0.5, 'leaf')

    # Lower massing block (stone/steel), 17-50
    glass_volume(TOWER, 6, -18, 17, 50, 44, 62, 'glass_blue')
    # Gold-patterned block with planted roof, 17-54, offset north-east
    glass_volume(TOWER, 20, 40, 17, 54, 40, 54, 'gold', crown='leaf')
    mullion_frame(TOWER, 20, 40, 18, 54, 40, 54, step=5, mat='gold')

    # Mid-level cantilevering glass bars (E-W). North bar reaches west (water).
    glass_volume(TOWER, -26, 36, 50, 64, 70, 34, 'glass_blue')   # cantilever west
    rbox(TOWER, -58, 36, 57, 10, 34, 14, 'window_dark')          # recessed underside
    glass_volume(TOWER, 40, -30, 44, 58, 30, 70, 'glass_blue')   # south bar east

    # Signature inpatient slab on top: long N-S, diamond-lattice teal glass,
    # floating on a recessed dark band. Floors 64-100.
    rbox(TOWER, 4, 4, 63.0, 50, 128, 2.6, 'window_dark')         # recessed band (float)
    glass_volume(TOWER, 4, 4, 64.0, 100, 46, 126, 'diagrid', band=False)
    # double-skin outer lattice offset slightly on the long (west/east) faces
    for sx in (-24.4, 24.4):
        rbox(TOWER, 4 + sx, 4, 82, 0.5, 126, 36, 'diagrid')
    rbox(TOWER, 4, 4, 100.4, 48, 128, 0.9, 'steel_grey')         # crown fascia
    # rooftop plant screens
    for k in range(3):
        rbox(DET, -14 + k * 14, -40, 101.8, 10, 10, 2.4, 'louvre_grey')

    # Helipad on the north cantilever roof
    hx, hy = R(-26, 36)
    DET.cyl((hx, hy, 64.2), 11, 0.4, 'asphalt', seg=48, top='asphalt')
    DET.cyl((hx, hy, 64.6), 8.5, 0.05, 'line_white', seg=40, cap=True)
    DET.cyl((hx, hy, 64.66), 7.4, 0.06, 'asphalt', seg=40, cap=True)
    DET.box((hx, hy, 64.8), (1.2, 6.5, 0.08), 'line_white', rz=ROT)
    DET.box((hx, hy, 64.8), (6.5, 1.2, 0.08), 'line_white', rz=ROT)
    for a in range(12):
        ang = 2 * math.pi * a / 12
        DET.box((hx + 10.4 * math.cos(ang), hy + 10.4 * math.sin(ang), 65.0), (0.2, 0.2, 0.9), 'steel_yellow')

    # ---- rooftop plant = the simulated OT assets (equipment groups) ---------
    AHU = Batch('EQ_cc-ahu')
    ax, ay = R(14, -36)
    AHU.box((ax, ay, 102.6), (16, 9, 3.2), 'cabinet', rz=ROT)
    for i in range(4):
        px, py = R(8 + i * 4, -36)
        AHU.cyl((px, py, 105.8), 1.4, 1.2, 'steel_grey', seg=16, top='grating')
    AHU.box((ax - 0.0, ay, 101.2), (16, 9, 0.6), 'concrete', rz=ROT)
    HVAC = Batch('EQ_cc-plc-hvac')
    hvx, hvy = R(-6, -40)
    HVAC.box((hvx, hvy, 103.0), (2.0, 1.2, 2.2), 'cabinet', rz=ROT)
    HVAC.box((hvx, hvy, 104.3), (2.4, 1.6, 0.1), 'white_paint', rz=ROT)
    POWER = Batch('EQ_cc-plc-power')
    pwx, pwy = R(22, 44)
    POWER.box((pwx, pwy, 55.2), (6, 4, 2.6), 'transformer', rz=ROT)
    POWER.cyl((pwx + 1, pwy, 57.5), 0.8, 1.0, 'steel_grey', seg=12)
    SENS = Batch('EQ_cc-sensor')
    sx, sy = R(-18, 20)
    SENS.box((sx, sy, 64.6), (0.5, 0.5, 1.2), 'steel_grey', rz=ROT)
    SENS.box((sx, sy, 65.3), (0.8, 0.5, 0.5), 'cabinet', rz=ROT)

    # ---- plaza life ---------------------------------------------------------
    for i in range(14):
        gx, gy = R(-70, -220 + i * 34)
        palm(VEG, gx, gy, seed=i)
    for i in range(10):
        gx, gy = R(60, -160 + i * 36)
        palm(VEG, gx, gy, seed=30 + i)
    # reflecting pool + landscaped bands on plaza
    G.plane(R(70, -60)[0:2] + (0.06,) if False else (R(70, -60)[0], R(70, -60)[1], 0.06), 30, 90, 'water')
    for i in range(8):
        bx, by = R(95, -180 + i * 48)
        G.plane((bx, by, 0.05), 10, 30, 'grass')
    # drop-off cars on the east approach
    for i in range(7):
        cx, cy = R(78, -60 + i * 18)
        car(CAR, cx, cy, ROT + math.pi / 2, RND.choice(['car_white', 'car_white', 'car_silver', 'car_black', 'car_grey']))

    # street lights along the corniche + boulevard
    for y in range(-400, 401, 48):
        DET.tube((-86, y, 0), (-86, y, 9), 0.1, 'steel_grey', seg=8, caps=False)
        DET.box((-83.5, y, 8.9), (3.2, 0.28, 0.16), 'lamp')
        DET.tube((286, y, 0), (286, y, 10), 0.1, 'steel_grey', seg=8, caps=False)
        DET.box((288.5, y, 9.9), (3.2, 0.28, 0.16), 'lamp')

    # ---- context: Al Maryah financial-district towers ----------------------
    for (cx, cy, w, d, h, m) in (
        (250, -250, 46, 46, 180, 'glass_blue'), (330, -120, 40, 40, 150, 'glass'),
        (280, 160, 50, 38, 210, 'glass_blue'), (360, 60, 42, 42, 120, 'cladding_grey'),
        (240, 300, 44, 44, 160, 'glass'), (150, -320, 40, 40, 135, 'glass_blue'),
    ):
        CTX.box((cx, cy, h / 2), (w, d, h), m, top='roof')
        CTX.box((cx, cy, h + 1), (w + 1, d + 1, 2), 'steel_grey')
    CTX.plane((-400, 0, -0.5), 260, 1200, 'water')

    for b in (G, PODIUM, TOWER, DET, VEG, CAR, CTX):
        b.build(S)
    for b in (AHU, HVAC, POWER, SENS):
        b.build(E)

    anchors = {
        'cc-ws': R(74, 30) + (24,), 'cc-fw': R(60, 10) + (20,),
        'cc-bms': R(20, 44) + (58,), 'cc-hmi': R(10, 40) + (56,),
        'cc-plc-hvac': R(-6, -40) + (106,), 'cc-plc-power': R(22, 44) + (60,),
        'cc-ahu': R(14, -36) + (108,), 'cc-sensor': R(-18, 20) + (68,),
    }
    for k, p in anchors.items():
        anchor('ANCHOR_' + k, (p[0], p[1], p[2]), A)

    out = stats()
    if export:
        out['glb'] = export_glb('cleveland-clinic.glb')
    return out
