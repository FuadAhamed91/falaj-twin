"""Seamless procedural PBR texture library for the FALAJ facility models.

Every texture is synthesised here (spectral noise, Worley cells, analytic
patterns) so the repo ships no third-party imagery. Arrays are row 0 = bottom
(Blender's pixel order), so +row == +V == "up" and normal maps are OpenGL /
glTF convention.

Run inside Blender:  exec(open(<this file>).read())  or import and call build_all().
"""
import os
import numpy as np

try:
    import bpy
except ImportError:  # allows syntax checks outside Blender
    bpy = None

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else ""
OUT = os.path.join(os.path.dirname(HERE), "textures")


# ----------------------------------------------------------------------------
# noise primitives (all periodic → seamless when tiled)
# ----------------------------------------------------------------------------
def spec(n, beta=2.0, seed=0, lo=0.0, hi=0.5, aniso=(1.0, 1.0), m=None):
    """Spectral-synthesis noise with power ~ 1/f^beta. Zero mean, unit std."""
    m = m or n
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(m)[:, None] * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * aniso[0]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    amp = f ** (-beta / 2.0)
    if lo > 0:
        amp[f < lo] = 0
    if hi < 0.5:
        amp[f > hi] = 0
    amp[0, 0] = 0
    ph = rng.uniform(0, 2 * np.pi, (m, n))
    img = np.fft.ifft2(amp * np.exp(1j * ph)).real
    img -= img.mean()
    img /= img.std() or 1.0
    return img.astype(np.float32)


def white(n, seed, m=None):
    return np.random.default_rng(seed).random((m or n, n)).astype(np.float32)


def sm(x, e0, e1):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def grid(n, m=None):
    m = m or n
    y = (np.arange(m, dtype=np.float32) + 0.5) / m
    x = (np.arange(n, dtype=np.float32) + 0.5) / n
    return np.meshgrid(x, y)  # X, Y in [0,1)


def worley(n, cells, seed, m=None):
    """Periodic Worley: returns (F1 distance, F2-F1 edge, cell id)."""
    m = m or n
    rng = np.random.default_rng(seed)
    pts = rng.random((cells, cells, 2)).astype(np.float32)
    X, Y = grid(n, m)
    gx, gy = X * cells, Y * cells
    ix, iy = np.floor(gx).astype(int), np.floor(gy).astype(int)
    d1 = np.full(X.shape, 9.0, np.float32)
    d2 = np.full(X.shape, 9.0, np.float32)
    cid = np.zeros(X.shape, np.int32)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            cx, cy = ix + ox, iy + oy
            p = pts[cy % cells, cx % cells]
            dx = cx + p[..., 0] - gx
            dy = cy + p[..., 1] - gy
            d = np.sqrt(dx * dx + dy * dy)
            closer = d < d1
            d2 = np.where(closer, d1, np.minimum(d2, d))
            cid = np.where(closer, (cy % cells) * cells + (cx % cells), cid)
            d1 = np.where(closer, d, d1)
    return d1, d2 - d1, cid


def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    nrm = np.dstack([-dx, -dy, np.ones_like(h)])
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    return nrm * 0.5 + 0.5


def rgb(c):
    return np.array(c, np.float32)[None, None, :]


def shade(base, lum):
    return np.clip(rgb(base) * lum[..., None], 0, 1)


# ----------------------------------------------------------------------------
# saving
# ----------------------------------------------------------------------------
def save(name, arr, quality=88):
    os.makedirs(OUT, exist_ok=True)
    if arr.ndim == 2:
        arr = np.dstack([arr, arr, arr])
    h, w = arr.shape[:2]
    rgba = np.dstack([np.clip(arr, 0, 1), np.ones((h, w), np.float32)]).astype(np.float32)
    path = os.path.join(OUT, name + ".jpg")
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path
    img.file_format = "JPEG"
    try:
        img.save(quality=quality)
    except TypeError:
        img.save()
    bpy.data.images.remove(img)
    return path


def downsample(a, f):
    h, w = a.shape[:2]
    return a.reshape(h // f, f, w // f, f, *a.shape[2:]).mean(axis=(1, 3))


def save_set(name, albedo, height=None, rough=None, nstrength=1.0, nsize=512, rsize=512, metal=None):
    save(name + "_albedo", albedo, 86)
    if height is not None:
        n = normal_from_height(height, nstrength)
        f = max(1, n.shape[0] // nsize)
        save(name + "_normal", downsample(n, f) if f > 1 else n, 90)
    if rough is not None:
        f = max(1, rough.shape[0] // rsize)
        save(name + "_rough", downsample(rough, f) if f > 1 else rough, 85)
    if metal is not None:
        f = max(1, metal.shape[0] // rsize)
        save(name + "_metal", downsample(metal, f) if f > 1 else metal, 85)


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------
def tex_concrete(name="concrete", base=(0.66, 0.65, 0.62), seed=1, n=1024, dark=0.0):
    low = spec(n, 3.4, seed)
    mid = spec(n, 2.0, seed + 1, lo=0.004)
    fine = spec(n, 0.6, seed + 2, lo=0.10)
    pores = (white(n, seed + 3) > 0.9965).astype(np.float32)
    pores = np.maximum(pores, np.roll(pores, 1, 1) * 0.6)
    stains = sm(low, 0.5, 1.9)
    lum = 1 + 0.05 * low + 0.035 * mid + 0.03 * fine - 0.12 * stains - 0.35 * pores - dark
    alb = shade(base, lum)
    alb[..., 2] *= 1 - 0.03 * stains  # stains slightly warmer
    height = 0.6 * fine + 0.4 * mid - 2.5 * pores
    rough = np.clip(0.86 + 0.04 * mid - 0.08 * stains, 0, 1)
    save_set(name, alb, height, rough, nstrength=1.6)


def tex_cladding(name="cladding", base=(0.80, 0.82, 0.83), ribs=16, seed=11, n=1024):
    X, Y = grid(n)
    p = (X * ribs) % 1.0
    # trapezoidal profile: crest .28, slope .18, valley .36, slope .18
    prof = np.where(p < 0.28, 1.0,
           np.where(p < 0.46, 1.0 - (p - 0.28) / 0.18,
           np.where(p < 0.82, 0.0, (p - 0.82) / 0.18)))
    streak = spec(n, 2.6, seed, aniso=(1.0, 7.0))
    blot = spec(n, 3.0, seed + 1)
    fine = spec(n, 0.8, seed + 2, lo=0.12)
    lum = 1 + 0.025 * streak + 0.02 * blot + 0.012 * fine - 0.07 * (1 - prof) * 0.6
    alb = shade(base, lum)
    height = prof * 1.0 + 0.004 * fine
    rough = np.clip(0.40 + 0.06 * streak + 0.03 * blot, 0, 1)
    save_set(name, alb, height, rough, nstrength=22.0)


def tex_roof(name="roof", base=(0.72, 0.73, 0.73), seed=21, n=1024):
    X, Y = grid(n)
    seam = np.exp(-(((X * 4) % 1.0 - 0.5) ** 2) / 0.00004) * 0  # placeholder for clarity
    s = np.abs(((X * 4) % 1.0) - 0.5)
    seam = sm(0.5 - s, 0.494, 0.5)  # thin seam lines every 2m on an 8m tile
    blot = spec(n, 3.2, seed)
    mid = spec(n, 2.0, seed + 1, lo=0.01)
    pond = sm(blot, 0.8, 2.0)
    lum = 1 + 0.03 * blot + 0.02 * mid - 0.10 * pond - 0.10 * seam
    alb = shade(base, lum)
    height = 0.2 * mid + 1.0 * seam
    rough = np.clip(0.78 + 0.05 * mid - 0.15 * pond, 0, 1)
    save_set(name, alb, height, rough, nstrength=3.0)


def tex_solar(name="solar"):
    W, H, cols, rows = 1024, 512, 12, 6
    X, Y = grid(W, H)
    fr = 0.010
    inside = (X > fr) & (X < 1 - fr) & (Y > fr * 2) & (Y < 1 - fr * 2)
    cx = (X - fr) / (1 - 2 * fr) * cols
    cy = (Y - 2 * fr) / (1 - 4 * fr) * rows
    fx, fy = cx % 1.0, cy % 1.0
    gap = (fx < 0.035) | (fx > 0.965) | (fy < 0.035) | (fy > 0.965)
    corner = (np.minimum(fx, 1 - fx) + np.minimum(fy, 1 - fy)) < 0.13
    bus = np.abs(((fx * 4.0) % 1.0) - 0.5) < 0.025
    cell_id = np.floor(cx).astype(int) * 31 + np.floor(cy).astype(int) * 17
    var = (np.sin(cell_id * 12.9898) * 43758.5453) % 1.0
    sheen = 1 - 0.18 * ((fx - 0.5) ** 2 + (fy - 0.5) ** 2)
    cell = rgb((0.055, 0.085, 0.20)) * (0.92 + 0.12 * var[..., None]) * sheen[..., None]
    alb = np.where(inside[..., None], cell, rgb((0.74, 0.76, 0.78)))
    back = inside & (gap | corner)
    alb = np.where(back[..., None], rgb((0.80, 0.82, 0.84)), alb)
    alb = np.where((inside & bus & ~back)[..., None], rgb((0.36, 0.40, 0.48)), alb)
    rough = np.where(inside, 0.10, 0.35).astype(np.float32)
    rough = np.where(back, 0.55, rough)
    metal = np.where(inside & ~back, 0.35, 0.6).astype(np.float32)
    height = (~inside).astype(np.float32) * 1.0 + back.astype(np.float32) * -0.3
    save(name + "_albedo", alb, 88)
    save(name + "_normal", normal_from_height(height, 2.0), 90)
    save(name + "_rough", rough, 85)
    save(name + "_metal", metal, 85)


def tex_glass(name, tile_floors=2, mullions=5, glass=(0.30, 0.45, 0.47), spandrel=(0.21, 0.26, 0.28),
              frame=(0.30, 0.32, 0.34), seed=31, n=1024, spandrel_h=0.11):
    X, Y = grid(n)
    fy = (Y * tile_floors) % 1.0
    fx = (X * mullions) % 1.0
    mull = (fx < 0.012) | (fx > 0.988)
    trans = (fy < 0.010) | (fy > 0.990)
    span = fy < spandrel_h
    pane_id = np.floor(X * mullions).astype(int) * 7 + np.floor(Y * tile_floors * 2).astype(int) * 13
    var = (np.sin(pane_id * 78.233) * 43758.5453) % 1.0
    g = rgb(glass) * (0.90 + 0.18 * var[..., None])
    alb = np.where(span[..., None], rgb(spandrel), g)
    frame_mask = mull | trans | (np.abs(fy - spandrel_h) < 0.008)
    alb = np.where(frame_mask[..., None], rgb(frame), alb)
    rough = np.where(span, 0.38, 0.03 + 0.06 * var).astype(np.float32)
    rough = np.where(frame_mask, 0.32, rough)
    metal = np.where(span, 0.35, 0.92).astype(np.float32)
    metal = np.where(frame_mask, 0.85, metal)
    height = frame_mask.astype(np.float32)
    save(name + "_albedo", alb, 88)
    save(name + "_normal", downsample(normal_from_height(height, 3.0), 2), 90)
    save(name + "_rough", downsample(rough, 2), 85)
    save(name + "_metal", downsample(metal, 2), 85)


def tex_diagrid(name="diagrid", n=1024):
    X, Y = grid(n)
    # two diamonds across, two up a 12 m tile; members ~0.35 m wide
    a = ((X + Y) * 2.0) % 1.0
    b = ((X - Y) * 2.0) % 1.0
    w = 0.022
    lattice = (np.abs(a - 0.5) > 0.5 - w) | (np.abs(b - 0.5) > 0.5 - w)
    floors = np.abs(((Y * 3.0) % 1.0) - 0.5) > 0.494
    mull = np.abs(((X * 8.0) % 1.0) - 0.5) > 0.493
    pane_id = np.floor(X * 8).astype(int) * 7 + np.floor(Y * 3).astype(int) * 13
    var = (np.sin(pane_id * 78.233) * 43758.5453) % 1.0
    glass = rgb((0.24, 0.42, 0.44)) * (0.9 + 0.2 * var[..., None])
    alb = np.where((floors | mull)[..., None], rgb((0.20, 0.28, 0.29)), glass)
    alb = np.where(lattice[..., None], rgb((0.86, 0.88, 0.88)), alb)
    rough = np.where(lattice, 0.42, np.where(floors | mull, 0.3, 0.03 + 0.05 * var)).astype(np.float32)
    metal = np.where(lattice, 0.15, 0.9).astype(np.float32)
    height = lattice.astype(np.float32) * 1.0 + (floors | mull).astype(np.float32) * 0.3
    save(name + "_albedo", alb, 88)
    save(name + "_normal", downsample(normal_from_height(height, 4.0), 2), 90)
    save(name + "_rough", downsample(rough, 2), 85)
    save(name + "_metal", downsample(metal, 2), 85)


def tex_plaster(name="plaster", base=(0.85, 0.79, 0.67), seed=41, n=1024):
    X, Y = grid(n)
    jh = np.abs(((Y * 4) % 1.0) - 0.5) > 0.496   # horizontal joints every 1.5 m (6 m tile)
    jv = np.abs(((X * 2) % 1.0) - 0.5) > 0.4975  # vertical joints every 3 m
    joint = (jh | jv).astype(np.float32)
    low = spec(n, 3.3, seed)
    streak = spec(n, 2.4, seed + 1, aniso=(1.0, 6.0))
    fine = spec(n, 0.7, seed + 2, lo=0.12)
    lum = 1 + 0.03 * low + 0.025 * streak + 0.02 * fine - 0.22 * joint - 0.05 * sm(low, 0.8, 2.0)
    alb = shade(base, lum)
    height = 0.25 * fine - 1.0 * joint
    rough = np.clip(0.84 + 0.04 * low, 0, 1)
    save_set(name, alb, height, rough, nstrength=4.0)


def tex_louvre(name="louvre", base=(0.80, 0.76, 0.66), blades=10, n=512):
    X, Y = grid(n)
    p = (Y * blades) % 1.0
    blade = np.clip(p / 0.78, 0, 1)            # sloped blade face
    gap = p > 0.78                              # dark slot between blades
    frame = (X < 0.02) | (X > 0.98)
    lum = 0.82 + 0.25 * blade
    lum = np.where(gap, 0.18, lum)
    alb = shade(base, lum)
    alb = np.where(frame[..., None], rgb(base) * 0.9, alb)
    height = np.where(gap, 0.0, blade)
    height = np.where(frame, 1.2, height)
    rough = np.where(gap, 0.9, 0.55).astype(np.float32)
    save_set(name, alb, height, rough, nstrength=10.0, nsize=512)


def tex_tank(name="tank", base=(0.88, 0.84, 0.74), seed=51, n=1024):
    X, Y = grid(n)
    seam_h = np.abs(((Y * 4) % 1.0) - 0.5) > 0.4965
    seam_v = np.abs(X - 0.5) > 0.4975
    streak = spec(n, 2.4, seed, aniso=(1.0, 9.0))
    blot = spec(n, 3.0, seed + 1)
    fine = spec(n, 0.8, seed + 2, lo=0.12)
    lum = 1 + 0.035 * streak + 0.02 * blot + 0.01 * fine - 0.06 * (seam_h | seam_v)
    alb = shade(base, lum)
    height = (seam_h | seam_v).astype(np.float32) * 0.6 + 0.01 * fine
    rough = np.clip(0.52 + 0.06 * streak, 0, 1)
    save_set(name, alb, height, rough, nstrength=3.0)


def tex_asphalt(name="asphalt", seed=61, n=1024):
    agg = white(n, seed)
    stones = sm(agg, 0.975, 0.995)
    low = spec(n, 3.2, seed + 1)
    mid = spec(n, 1.8, seed + 2, lo=0.01)
    fine = spec(n, 0.5, seed + 3, lo=0.15)
    wear = sm(low, 0.4, 1.8)
    oil = sm(-low, 1.2, 2.4)
    lum = 1 + 0.05 * mid + 0.06 * fine + 0.9 * stones + 0.20 * wear - 0.25 * oil
    alb = shade((0.20, 0.205, 0.215), lum)
    height = 0.6 * fine + 1.6 * stones
    rough = np.clip(0.9 - 0.08 * wear + 0.04 * mid, 0, 1)
    save_set(name, alb, height, rough, nstrength=2.0)


def tex_sand(name="sand", seed=71, n=1024, base=(0.87, 0.77, 0.59), ripple=1.0):
    X, Y = grid(n)
    warp = spec(n, 3.0, seed) * 0.35
    phi = 2 * np.pi * (15 * X + 7 * Y) + warp * 2 * np.pi
    rip = (np.sin(phi) + 0.28 * np.sin(2 * phi)) * ripple
    rmask = 0.55 + 0.45 * sm(spec(n, 3.2, seed + 1), -0.8, 0.8)
    low = spec(n, 3.4, seed + 2)
    mid = spec(n, 2.0, seed + 3, lo=0.01)
    grain = spec(n, 0.3, seed + 4, lo=0.2)
    dark = sm(white(n, seed + 5), 0.985, 1.0)
    lum = 1 + 0.035 * rip * rmask + 0.045 * low + 0.025 * mid + 0.03 * grain - 0.25 * dark
    alb = shade(base, lum)
    # darker patches drift warmer/browner (never olive): more red, less blue
    alb[..., 0] *= 1 - 0.018 * low
    alb[..., 2] *= 1 + 0.03 * low
    height = 0.9 * rip * rmask + 0.3 * mid + 0.15 * grain
    rough = np.clip(0.94 + 0.02 * mid, 0, 1)
    save_set(name, np.clip(alb, 0, 1), height, rough, nstrength=3.0)


def tex_paving(name="paving", seed=81, n=512):
    X, Y = grid(n)
    rows = 10
    ry = np.floor(Y * rows).astype(int)
    xx = X * 5 + 0.5 * (ry % 2)
    fx, fy = xx % 1.0, (Y * rows) % 1.0
    joint = (fx < 0.03) | (fx > 0.97) | (fy < 0.05) | (fy > 0.95)
    pid = np.floor(xx).astype(int) * 37 + ry * 11
    var = (np.sin(pid * 12.9898) * 43758.5453) % 1.0
    fine = spec(n, 0.7, seed, lo=0.12)
    lum = 0.95 + 0.10 * var + 0.03 * fine
    alb = shade((0.78, 0.76, 0.71), lum)
    alb = np.where(joint[..., None], rgb((0.55, 0.52, 0.46)), alb)
    height = np.where(joint, 0.0, 1.0) + 0.05 * fine
    rough = np.where(joint, 0.95, 0.8).astype(np.float32)
    save_set(name, alb, height, rough, nstrength=6.0)


def tex_gravel(name="gravel", seed=91, n=512):
    d1, edge, cid = worley(n, 42, seed)
    var = (np.sin(cid * 12.9898) * 43758.5453) % 1.0
    dome = 1 - np.clip(d1 * 1.6, 0, 1)
    crev = sm(edge, 0.0, 0.12)
    lum = (0.80 + 0.17 * var) * (0.55 + 0.45 * crev)
    alb = shade((0.93, 0.92, 0.89), lum)
    height = dome * crev
    rough = np.clip(0.75 + 0.15 * (1 - crev), 0, 1)
    save_set(name, alb, height, rough, nstrength=8.0)


def tex_grass(name="grass", seed=101, n=512):
    low = spec(n, 3.2, seed)
    mid = spec(n, 1.6, seed + 1, lo=0.02)
    blades = spec(n, 0.6, seed + 2, lo=0.18, aniso=(1.0, 0.35))
    lum = 1 + 0.10 * low + 0.06 * mid + 0.10 * blades
    alb = shade((0.27, 0.44, 0.17), lum)
    alb[..., 0] += 0.04 * sm(low, 0.8, 2.0)  # dry yellowish patches
    height = blades + 0.3 * mid
    rough = np.clip(0.93 + 0.03 * mid, 0, 1)
    save_set(name, alb, height, rough, nstrength=2.5)


def tex_steel(name, base, seed=111, n=512):
    brush = spec(n, 1.0, seed, aniso=(0.15, 1.0))
    blot = spec(n, 3.0, seed + 1)
    grime = sm(blot, 1.0, 2.2)
    lum = 1 + 0.015 * brush + 0.02 * blot - 0.12 * grime
    alb = shade(base, lum)
    rough = np.clip(0.45 + 0.05 * brush + 0.15 * grime, 0, 1)
    save_set(name, alb, 0.2 * brush, rough, nstrength=1.0, nsize=256, rsize=256)


def tex_grating(name="grating", n=512):
    X, Y = grid(n)
    bars = np.abs(((X * 30) % 1.0) - 0.5) > 0.36
    cross = np.abs(((Y * 10) % 1.0) - 0.5) > 0.46
    solid = bars | cross
    alb = np.where(solid[..., None], rgb((0.56, 0.58, 0.60)), rgb((0.05, 0.05, 0.06)))
    height = solid.astype(np.float32)
    rough = np.where(solid, 0.5, 0.95).astype(np.float32)
    save_set(name, alb, height, rough, nstrength=6.0)


def tex_water_normal(name="water", seed=121, n=512):
    X, Y = grid(n)
    h = np.zeros_like(X)
    rng = np.random.default_rng(seed)
    for _ in range(14):
        kx, ky = rng.integers(-9, 10), rng.integers(-9, 10)
        if kx == 0 and ky == 0:
            continue
        amp = 1.0 / np.hypot(kx, ky)
        h += amp * np.sin(2 * np.pi * (kx * X + ky * Y) + rng.uniform(0, 6.28))
    h += 0.25 * spec(n, 1.6, seed + 1, lo=0.02)
    save(name + "_normal", normal_from_height(h, 9.0), 92)


def tex_leaf(name="leaf", n=256):
    X, Y = grid(n)
    vein = np.exp(-((X - 0.5) ** 2) / 0.0015)
    ribs = 0.5 + 0.5 * np.sin(2 * np.pi * (Y * 18 + np.abs(X - 0.5) * 6))
    lum = 0.85 + 0.25 * vein + 0.10 * ribs + 0.05 * spec(n, 1.5, 3)
    alb = shade((0.20, 0.34, 0.12), lum)
    save_set(name, alb, ribs * 0.3 + vein, np.full((n, n), 0.62, np.float32), nstrength=2.0, nsize=256, rsize=256)


def tex_trunk(name="trunk", n=256):
    X, Y = grid(n)
    scar = np.sin(2 * np.pi * (X * 6 + Y * 8)) * np.sin(2 * np.pi * (X * 6 - Y * 8))
    fine = spec(n, 0.9, 7, lo=0.1)
    lum = 0.85 + 0.15 * scar + 0.05 * fine
    alb = shade((0.47, 0.40, 0.31), lum)
    save_set(name, alb, scar + 0.2 * fine, np.full((n, n), 0.9, np.float32), nstrength=3.0, nsize=256, rsize=256)


def tex_panel_white(name="panel_white", seed=131, n=1024):
    """Aluminium composite facade panels, white, 1.2 m x 3 m modules on a 6 m tile."""
    X, Y = grid(n)
    jv = np.abs(((X * 5) % 1.0) - 0.5) > 0.4975
    jh = np.abs(((Y * 2) % 1.0) - 0.5) > 0.4975
    joint = (jv | jh).astype(np.float32)
    pid = np.floor(X * 5).astype(int) * 7 + np.floor(Y * 2).astype(int) * 13
    var = (np.sin(pid * 12.9898) * 43758.5453) % 1.0
    blot = spec(n, 3.0, seed)
    lum = 0.985 + 0.02 * var + 0.01 * blot - 0.35 * joint
    alb = shade((0.93, 0.94, 0.94), lum)
    rough = np.clip(0.30 + 0.05 * var, 0, 1)
    save_set(name, alb, -joint, rough, nstrength=6.0)


def tex_checker(name="checker", a=(0.90, 0.84, 0.68), b=(0.74, 0.60, 0.40), cells=6, n=1024):
    """DEWA-style decorative facade: tan/cream checkerboard with recessed joints."""
    X, Y = grid(n)
    cx, cy = np.floor(X * cells).astype(int), np.floor(Y * cells).astype(int)
    chk = ((cx + cy) % 2).astype(np.float32)
    fx, fy = (X * cells) % 1.0, (Y * cells) % 1.0
    joint = (np.minimum(fx, 1 - fx) < 0.035) | (np.minimum(fy, 1 - fy) < 0.035)
    fine = spec(n, 0.8, 5, lo=0.12)
    lum = 1 + 0.02 * fine - 0.22 * joint
    base = chk[..., None] * rgb(b) + (1 - chk[..., None]) * rgb(a)
    alb = np.clip(base * lum[..., None], 0, 1)
    height = chk * 0.5 - joint.astype(np.float32)
    rough = np.clip(0.6 + 0.08 * fine, 0, 1)
    save_set(name, alb, height, rough, nstrength=4.0)


def build_all():
    tex_checker()
    tex_concrete("concrete", (0.66, 0.65, 0.62), 1)
    tex_concrete("concrete_dark", (0.47, 0.47, 0.45), 5)
    tex_cladding("cladding", (0.80, 0.82, 0.83))
    tex_cladding("cladding_grey", (0.55, 0.58, 0.60), ribs=16, seed=13)
    tex_roof()
    tex_solar()
    tex_glass("glass", glass=(0.30, 0.45, 0.47))
    tex_glass("glass_blue", glass=(0.26, 0.38, 0.48), spandrel=(0.85, 0.86, 0.86), frame=(0.75, 0.77, 0.78), seed=33)
    tex_diagrid()
    tex_plaster()
    tex_louvre()
    tex_louvre("louvre_grey", base=(0.62, 0.64, 0.66), blades=24)
    tex_tank()
    tex_asphalt()
    tex_sand()
    tex_sand("yard", seed=75, base=(0.76, 0.72, 0.64), ripple=0.25)
    tex_paving()
    tex_gravel()
    tex_grass()
    tex_steel("steel", (0.86, 0.87, 0.88))
    tex_steel("steel_grey", (0.55, 0.57, 0.59), seed=112)
    tex_steel("steel_dark", (0.24, 0.26, 0.28), seed=113)
    tex_steel("steel_blue", (0.22, 0.40, 0.62), seed=114)
    tex_steel("steel_green", (0.36, 0.55, 0.45), seed=115)
    tex_steel("steel_yellow", (0.93, 0.72, 0.16), seed=116)
    tex_steel("steel_red", (0.72, 0.13, 0.12), seed=117)
    tex_grating()
    tex_water_normal()
    tex_leaf()
    tex_trunk()
    tex_panel_white()
    return sorted(os.listdir(OUT))
