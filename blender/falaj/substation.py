"""DEWA Nad Hessa 132/11 kV digital substation — fully illustrative.

The exact site is not public, so this is a generic indoor GIS substation in
DEWA's current architectural style: a stepped cream block with tan checkerboard
facade panels and red fire-main pipes, a cream boundary wall, and a small
outdoor transformer bay. Labelled district-level and representative.

Frame: Blender metres, X east, Y north, Z up.
"""
import math
import random

from .common import Batch, anchor, collection, export_glb, reset_scene, stats

RND = random.Random(11)


def palm(B, x, y, h, seed):
    import mathutils
    r = random.Random(seed)
    pts = [mathutils.Vector((x, y, h * (i / 6))) for i in range(7)]
    for i in range(6):
        B.tube(pts[i], pts[i + 1], 0.3 - 0.09 * (i / 6), 'trunk', seg=8, caps=False)
    top = pts[-1]
    B.cyl((top.x, top.y, top.z - 0.4), 0.42, 0.8, 'trunk', seg=8, top='leaf')
    for f in range(14):
        th = 2 * math.pi * f / 14 + r.uniform(-0.15, 0.15)
        dv = mathutils.Vector((math.cos(th), math.sin(th), 0))
        sv = mathutils.Vector((-math.sin(th), math.cos(th), 0))
        prev = None
        for s in range(7):
            t = s / 6
            c = top + dv * (4.2 * t) + mathutils.Vector((0, 0, 1.0 * t - 3.0 * t * t))
            w = 0.55 * math.sin(math.pi * min(1, t * 1.15)) + 0.08
            pa, pb = c - sv * w, c + sv * w
            if prev:
                qa, qb, tp = prev
                B.poly([qa, qb, pb, pa], 'leaf', uvs=[(0, tp), (1, tp), (1, t), (0, t)])
            prev = (pa, pb, t)


def transformer(B, x, y, label_batch=None):
    bt = label_batch or B
    bt.box((x, y, 0.3), (9, 7, 0.6), 'concrete')
    bt.box((x, y, 2.6), (5.0, 5.6, 4.4), 'transformer')               # tank
    bt.box((x, y, 5.1), (5.4, 6.0, 0.6), 'steel_grey')               # lid
    for k in range(7):                                               # radiator bank
        bt.box((x - 3.1, y - 2.4 + k * 0.8, 2.6), (1.6, 0.18, 4.0), 'steel_grey')
    bt.box((x + 3.2, y, 2.6), (0.8, 2.4, 3.0), 'cabinet')           # conservator side
    bt.cyl((x + 3.2, y, 5.0), 0.5, 2.6, 'steel_grey', seg=14)        # conservator drum (horizontal-ish)
    for k in range(3):                                              # 132 kV porcelain bushings
        bt.cyl((x - 1.6 + k * 1.6, y - 2.0, 5.1), 0.22, 2.6, 'porcelain', seg=10, top='steel_grey')
        bt.box((x - 1.6 + k * 1.6, y - 2.0, 7.6), (0.5, 0.5, 0.3), 'steel_grey')
    for k in range(3):                                              # 11 kV bushings (smaller)
        bt.cyl((x - 1.4 + k * 1.4, y + 2.4, 5.1), 0.16, 1.5, 'porcelain', seg=8)
    bt.box((x, y + 4.2, 2.0), (7, 0.35, 5.0), 'cream')             # fire wall behind
    # red fire-main ring
    bt.tube((x - 4, y - 3.5, 0.6), (x + 4, y - 3.5, 0.6), 0.14, 'steel_red', seg=10)
    bt.tube((x + 4, y - 3.5, 0.6), (x + 4, y - 3.5, 4.5), 0.14, 'steel_red', seg=10)
    bt.box((x + 4, y - 3.5, 4.6), (0.5, 0.5, 0.4), 'steel_red')


def build(export=True):
    reset_scene()
    S = collection('Static')
    E = collection('Equipment')
    A = collection('Anchors')
    G, BLD, YARD, DET, VEG, CAR = (Batch(n) for n in
        ('Ground', 'Building', 'Yard', 'Details', 'Vegetation', 'Vehicles'))

    # ---- plot: desert pad + perimeter wall + internal road ------------------
    G.plane((0, 0, -0.02), 320, 320, 'sand')
    G.plane((0, 0, 0.0), 150, 120, 'gravel')
    G.plane((-30, 0, 0.03), 10, 110, 'asphalt')                  # spine road
    G.plane((0, -45, 0.03), 150, 10, 'asphalt')                  # entry road
    for y in range(-48, 49, 12):
        G.plane((-30, y, 0.05), 0.15, 4, 'line_white')
    # cream boundary wall with piers
    for (a, b) in [((-74, -58), (74, -58)), ((-74, 58), (74, 58)), ((-74, -58), (-74, 58)), ((74, -58), (74, 58))]:
        ax, ay = a; bx, by = b
        L = math.hypot(bx - ax, by - ay); rz = math.atan2(by - ay, bx - ax)
        BLD.box(((ax + bx) / 2, (ay + by) / 2, 1.5), (L, 0.4, 3.0), 'cream', rz=rz)
        BLD.box(((ax + bx) / 2, (ay + by) / 2, 3.1), (L, 0.6, 0.25), 'cream_dark', rz=rz)
        n = int(L / 8)
        for i in range(n + 1):
            px, py = ax + (bx - ax) * i / n, ay + (by - ay) * i / n
            BLD.box((px, py, 1.7), (0.7, 0.7, 3.4), 'cream_dark')
    # gate
    BLD.box((-30, -58, 1.9), (10, 0.5, 3.8), 'steel_grey')
    DET.box((-20, -57, 1.0), (0.4, 0.4, 2.0), 'steel_grey')
    DET.box((-18.5, -57, 2.1), (3.5, 0.15, 0.15), 'steel_red')   # barrier

    # ---- GIS building: stepped cream block with checkerboard panels ---------
    # main hall
    BLD.box((10, 6, 9.0), (46, 30, 18.0), 'cream', top='roof')
    # checkerboard facade panels inset on the long faces
    BLD.box((10, -9.2, 9.5), (42, 0.4, 15.0), 'checker')
    BLD.box((10, 21.2, 9.5), (42, 0.4, 15.0), 'checker')
    BLD.box((-13.2, 6, 9.5), (0.4, 26, 15.0), 'checker')
    BLD.box((33.2, 6, 9.5), (0.4, 26, 15.0), 'checker')
    # stepped lower wing (control/annex)
    BLD.box((-22, 6, 5.5), (18, 24, 11.0), 'cream', top='roof')
    BLD.box((-22, -6.2, 6.0), (16, 0.4, 9.0), 'checker')
    # entrance portal with DEWA-style frame
    BLD.box((-31.2, 6, 3.6), (0.6, 10, 7.2), 'cream_dark')
    BLD.box((-31.6, 6, 3.4), (0.3, 7, 6.2), 'glass_blue')
    BLD.box((-33, 6, 7.3), (4, 12, 0.4), 'cream_dark')           # canopy
    # roof plant + parapet
    BLD.box((10, 6, 18.2), (47, 31, 0.6), 'cream_dark')
    for k in range(4):
        DET.box((-2 + k * 9, 6, 19.4), (5, 8, 2.2), 'louvre_grey')
    DET.box((28, 18, 19.6), (6, 5, 2.6), 'steel_grey')           # chiller
    # cable-entry / GIS hall vent louvres
    for k in range(6):
        BLD.box((-4 + k * 8, -9.4, 5.0), (5, 0.2, 5), 'louvre_grey')

    # ---- outdoor transformer bays (east side) -------------------------------
    TX = Batch('EQ_dw-tx')
    transformer(YARD, 52, -14, TX)
    transformer(YARD, 52, 14, TX)
    # gantry + overhead takeoff to the east
    for x in (46, 62):
        YARD.box((x, 30, 7), (0.5, 0.5, 14), 'steel_grey')
    YARD.box((54, 30, 14), (18, 0.5, 0.5), 'steel_grey')
    BRK = Batch('EQ_dw-breaker')
    for k in range(3):
        BRK.cyl((48 + k * 6, 30, 7.2), 0.3, 5.5, 'porcelain', seg=10, top='steel_grey')
        BRK.box((48 + k * 6, 30, 3.0), (1.2, 1.0, 1.4), 'cabinet')

    # ---- simulation equipment anchors inside the hall ----------------------
    GW = Batch('EQ_dw-gw')
    GW.box((2, 14, 1.4), (1.6, 0.8, 2.6), 'cabinet')
    GW.box((2, 14, 2.85), (1.8, 1.0, 0.1), 'white_paint')
    IED = Batch('EQ_dw-ied-prot')
    for k in range(3):
        IED.box((6 + k * 1.3, 14, 1.3), (1.0, 0.7, 2.4), 'cabinet')
    HMI = Batch('EQ_dw-hmi')
    HMI.box((-20, 10, 1.3), (1.4, 0.5, 2.0), 'cabinet')
    HMI.box((-20, 10, 1.9), (1.2, 0.08, 0.7), 'window_dark')

    # ---- site dressing ------------------------------------------------------
    for i in range(10):
        palm(VEG, -70 + i * 15.5, -52, 8 + (i % 3), seed=i)
    for i in range(5):
        car(y=-50, B=CAR, x=-55 + i * 7, rz=math.pi / 2, color=RND.choice(['car_white', 'car_silver', 'car_grey']))
    for y in (-50, 50):
        for x in (-60, 60):
            DET.tube((x, y, 0), (x, y, 9), 0.1, 'steel_grey', seg=8, caps=False)
            DET.box((x, y, 8.9), (0.5, 0.25, 0.14), 'lamp')

    for b in (G, BLD, YARD, DET, VEG, CAR):
        b.build(S)
    for b in (TX, BRK, GW, IED, HMI):
        b.build(E)

    anchors = {
        'dw-ws': (-22, 6, 13), 'dw-fw': (-16, 12, 10), 'dw-gw': (2, 14, 5),
        'dw-hmi': (-20, 10, 5), 'dw-ied-prot': (7, 14, 5), 'dw-ied-bus': (12, 14, 5),
        'dw-breaker': (54, 30, 14), 'dw-tx': (52, 0, 9),
    }
    for k, p in anchors.items():
        anchor('ANCHOR_' + k, p, A)
    out = stats()
    if export:
        out['glb'] = export_glb('dewa-nad-hessa.glb')
    return out


def car(B, x, y, rz, color):
    ca, sa = math.cos(rz), math.sin(rz)
    Lf = lambda dx, dy: (x + dx * ca - dy * sa, y + dx * sa + dy * ca)
    px, py = Lf(0, 0)
    B.box((px, py, 0.72), (4.5, 1.82, 0.72), color, rz=rz)
    cx, cy = Lf(-0.2, 0)
    B.box((cx, cy, 1.34), (2.5, 1.6, 0.54), 'car_glass', rz=rz)
    for dx in (-1.45, 1.45):
        for dy in (-0.82, 0.82):
            wx, wy = Lf(dx, dy)
            B.tube((wx - sa * 0.12, wy + ca * 0.12, 0.34), (wx + sa * 0.12, wy - ca * 0.12, 0.34), 0.33, 'rubber', seg=9)
