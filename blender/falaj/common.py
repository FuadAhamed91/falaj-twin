"""Shared Blender modelling toolkit for the FALAJ facility twins.

* Authoring frame: Blender metres, X = east, Y = north, Z = up. The glTF
  exporter converts to three.js (x, y, z) = (X, Z, -Y) automatically.
* Geometry is accumulated in `Batch` buffers and written with `from_pydata`,
  which is orders of magnitude faster than bpy.ops for thousands of parts.
* UVs are world-scale (metres / material tile) so textures tile at real size
  and stay continuous across neighbouring parts.
"""
import math
import os

import bpy
from mathutils import Vector

BLENDER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX_DIR = os.path.join(BLENDER_DIR, "textures")
REPO = os.path.dirname(BLENDER_DIR)
MODELS_OUT = os.path.join(REPO, "frontend", "public", "models")


def srgb(c):
    """sRGB 0..1 -> linear (Blender colour sockets are linear)."""
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


# ---------------------------------------------------------------------------
# Material registry. tex -> <tex>_albedo/_normal/_rough/_metal.jpg in TEX_DIR.
# tile = metres covered by one texture repeat (None = custom UVs).
# ---------------------------------------------------------------------------
MATS = {
    "concrete": dict(tex="concrete", tile=4, nstr=0.8),
    "concrete_dark": dict(tex="concrete_dark", tile=4, nstr=0.8),
    "cladding": dict(tex="cladding", tile=4, nstr=0.9),
    "cladding_grey": dict(tex="cladding_grey", tile=4, nstr=0.9),
    "roof": dict(tex="roof", tile=8, nstr=0.6),
    "solar": dict(tex="solar", tile=None, nstr=0.5),
    "glass": dict(tex="glass", tile=8, nstr=0.4),
    "glass_blue": dict(tex="glass_blue", tile=8, nstr=0.4),
    "diagrid": dict(tex="diagrid", tile=12, nstr=0.5),
    "plaster": dict(tex="plaster", tile=6, nstr=0.6),
    "louvre": dict(tex="louvre", tile=1, nstr=1.0),
    "louvre_grey": dict(tex="louvre_grey", tile=2.4, nstr=1.0),
    "tank": dict(tex="tank", tile=8, nstr=0.6),
    "asphalt": dict(tex="asphalt", tile=6, nstr=0.6),
    "sand": dict(tex="sand", tile=10, nstr=0.8),
    "yard": dict(tex="yard", tile=22, nstr=0.5),
    "paving": dict(tex="paving", tile=2, nstr=0.7),
    "gravel": dict(tex="gravel", tile=2, nstr=0.8),
    "grass": dict(tex="grass", tile=3, nstr=0.6),
    "steel": dict(tex="steel", tile=2, metal=0.35, nstr=0.3),
    "steel_grey": dict(tex="steel_grey", tile=2, metal=0.45, nstr=0.3),
    "steel_dark": dict(tex="steel_dark", tile=2, metal=0.4, nstr=0.3),
    "steel_blue": dict(tex="steel_blue", tile=2, metal=0.25, nstr=0.3),
    "steel_green": dict(tex="steel_green", tile=2, metal=0.25, nstr=0.3),
    "steel_yellow": dict(tex="steel_yellow", tile=2, metal=0.2, nstr=0.3),
    "steel_red": dict(tex="steel_red", tile=2, metal=0.2, nstr=0.3),
    "grating": dict(tex="grating", tile=1, metal=0.6, nstr=0.7),
    "leaf": dict(tex="leaf", tile=None, nstr=0.5, double=True),
    "trunk": dict(tex="trunk", tile=None, nstr=0.8),
    "panel_white": dict(tex="panel_white", tile=6, nstr=0.5),
    "checker": dict(tex="checker", tile=9, nstr=0.6),
    "cream": dict(color=(0.90, 0.84, 0.68), rough=0.7),
    "cream_dark": dict(color=(0.74, 0.62, 0.44), rough=0.72),
    # untextured
    "water": dict(color=(0.04, 0.36, 0.42), rough=0.04, metal=0.0, double=True),
    "water_foam": dict(color=(0.62, 0.72, 0.70), rough=0.35),
    "line_white": dict(color=(0.93, 0.93, 0.90), rough=0.55, double=True),
    "line_yellow": dict(color=(0.95, 0.74, 0.16), rough=0.55, double=True),
    "rubber": dict(color=(0.04, 0.04, 0.045), rough=0.85),
    "car_white": dict(color=(0.93, 0.94, 0.95), rough=0.22, metal=0.15),
    "car_silver": dict(color=(0.66, 0.68, 0.70), rough=0.25, metal=0.75),
    "car_black": dict(color=(0.06, 0.065, 0.07), rough=0.2, metal=0.4),
    "car_grey": dict(color=(0.36, 0.38, 0.40), rough=0.25, metal=0.5),
    "car_blue": dict(color=(0.12, 0.22, 0.42), rough=0.22, metal=0.45),
    "car_glass": dict(color=(0.03, 0.045, 0.06), rough=0.04, metal=0.9),
    "window_dark": dict(color=(0.05, 0.08, 0.10), rough=0.05, metal=0.85),
    "window_lit": dict(color=(0.10, 0.14, 0.18), rough=0.08, metal=0.6, emit=(1.0, 0.82, 0.55), emit_str=0.0),
    "lamp": dict(color=(0.9, 0.9, 0.85), rough=0.4, emit=(1.0, 0.86, 0.62), emit_str=0.0),
    "gold": dict(color=(0.86, 0.58, 0.22), rough=0.28, metal=0.9),
    "porcelain": dict(color=(0.55, 0.30, 0.20), rough=0.3),
    "rock": dict(tex="concrete_dark", tile=3, nstr=1.4),
    "dark": dict(color=(0.08, 0.09, 0.10), rough=0.7),
    "white_paint": dict(color=(0.90, 0.91, 0.90), rough=0.45),
    "beige_paint": dict(color=(0.85, 0.80, 0.68), rough=0.6),
    "hdpe_white": dict(color=(0.86, 0.87, 0.86), rough=0.5),
    "cabinet": dict(color=(0.74, 0.76, 0.77), rough=0.4, metal=0.3),
    "transformer": dict(tex="steel_grey", tile=2, metal=0.4, nstr=0.3),
    "flag_red": dict(color=(0.75, 0.10, 0.12), rough=0.7, double=True),
    "flag_green": dict(color=(0.05, 0.45, 0.22), rough=0.7, double=True),
    "flag_white": dict(color=(0.94, 0.94, 0.94), rough=0.7, double=True),
    "flag_black": dict(color=(0.04, 0.04, 0.04), rough=0.7, double=True),
}


def tile(mat):
    return MATS.get(mat, {}).get("tile") or 4.0


def _img(name, color=True):
    path = os.path.join(TEX_DIR, name)
    if not os.path.exists(path):
        return None
    img = bpy.data.images.get(name) or bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = "sRGB" if color else "Non-Color"
    return img


def get_mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    spec = MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = not spec.get("double", False)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    if "tex" in spec:
        t = spec["tex"]
        a = N.new("ShaderNodeTexImage")
        a.image = _img(t + "_albedo.jpg", True)
        a.location = (-700, 300)
        L.new(a.outputs["Color"], b.inputs["Base Color"])
        r = _img(t + "_rough.jpg", False)
        if r:
            rn = N.new("ShaderNodeTexImage"); rn.image = r; rn.location = (-700, 0)
            L.new(rn.outputs["Color"], b.inputs["Roughness"])
        else:
            b.inputs["Roughness"].default_value = spec.get("rough", 0.8)
        mt = _img(t + "_metal.jpg", False)
        if mt:
            mn = N.new("ShaderNodeTexImage"); mn.image = mt; mn.location = (-700, -250)
            L.new(mn.outputs["Color"], b.inputs["Metallic"])
        else:
            b.inputs["Metallic"].default_value = spec.get("metal", 0.0)
        nimg = _img(t + "_normal.jpg", False)
        if nimg:
            nn = N.new("ShaderNodeTexImage"); nn.image = nimg; nn.location = (-700, -500)
            nm = N.new("ShaderNodeNormalMap"); nm.location = (-350, -500)
            nm.inputs["Strength"].default_value = spec.get("nstr", 1.0)
            L.new(nn.outputs["Color"], nm.inputs["Color"])
            L.new(nm.outputs["Normal"], b.inputs["Normal"])
    else:
        b.inputs["Base Color"].default_value = (*srgb(spec["color"]), 1.0)
        b.inputs["Roughness"].default_value = spec.get("rough", 0.8)
        b.inputs["Metallic"].default_value = spec.get("metal", 0.0)
    if "emit" in spec:
        b.inputs["Emission Color"].default_value = (*srgb(spec["emit"]), 1.0)
        b.inputs["Emission Strength"].default_value = spec.get("emit_str", 1.0)
    return m


# ---------------------------------------------------------------------------
# Batch mesh builder
# ---------------------------------------------------------------------------
class Batch:
    def __init__(self, name):
        self.name = name
        self.V, self.F, self.FM, self.UV, self.SM = [], [], [], [], []
        self.mats = []

    # -- low level ---------------------------------------------------------
    def _slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def v(self, co):
        self.V.append((float(co[0]), float(co[1]), float(co[2])))
        return len(self.V) - 1

    def face(self, idx, mat, uvs, smooth=False):
        self.F.append(tuple(idx))
        self.FM.append(self._slot(mat))
        self.UV.append([tuple(u) for u in uvs])
        self.SM.append(bool(smooth))

    def poly(self, pts, mat, uvs=None, smooth=False):
        pts = [Vector(p) for p in pts]
        if uvs is None:
            uvs = planar_uv(pts, tile(mat))
        self.face([self.v(p) for p in pts], mat, uvs, smooth)

    # -- primitives --------------------------------------------------------
    def box(self, c, s, mat, rz=0.0, top=None, side=None, bottom=False, uv_off=(0.0, 0.0)):
        """Axis box (optionally rotated about Z). c = centre, s = full size."""
        cx, cy, cz = c
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        ca, sa = math.cos(rz), math.sin(rz)
        ex, ey = Vector((ca, sa, 0)), Vector((-sa, ca, 0))
        C = Vector((cx, cy, cz))

        def P(sx, sy, sz):
            return C + ex * (sx * hx) + ey * (sy * hy) + Vector((0, 0, sz * hz))

        p = [P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1),
             P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)]
        topm, sidem = top or mat, side or mat

        def uv_side(q, axis):
            t = tile(sidem)
            return [((pt.dot(axis)) / t + uv_off[0], pt.z / t + uv_off[1]) for pt in q]

        def uv_top(q, m):
            t = tile(m)
            return [(pt.dot(ex) / t, pt.dot(ey) / t) for pt in q]

        faces = [
            ([p[4], p[5], p[6], p[7]], topm, "top"),
            ([p[0], p[1], p[5], p[4]], sidem, ex),
            ([p[2], p[3], p[7], p[6]], sidem, -ex),
            ([p[3], p[0], p[4], p[7]], sidem, -ey),
            ([p[1], p[2], p[6], p[5]], sidem, ey),
        ]
        if bottom:
            faces.append(([p[0], p[3], p[2], p[1]], topm, "top"))
        for q, m, ax in faces:
            uvs = uv_top(q, m) if isinstance(ax, str) else uv_side(q, ax)
            self.face([self.v(x) for x in q], m, uvs)

    def cyl(self, c, r, h, mat, seg=24, top=None, bottom=False, r_top=None, smooth=True, cap=True):
        """Vertical (tapered) cylinder from z=c.z to z=c.z+h."""
        rt = r if r_top is None else r_top
        cx, cy, cz = c
        t = tile(mat)
        bot = [self.v((cx + r * math.cos(2 * math.pi * i / seg), cy + r * math.sin(2 * math.pi * i / seg), cz)) for i in range(seg)]
        tp = [self.v((cx + rt * math.cos(2 * math.pi * i / seg), cy + rt * math.sin(2 * math.pi * i / seg), cz + h)) for i in range(seg)]
        circ = 2 * math.pi * r
        for i in range(seg):
            j = (i + 1) % seg
            u0, u1 = circ * i / seg / t, circ * (i + 1) / seg / t
            self.face([bot[i], bot[j], tp[j], tp[i]], mat,
                      [(u0, cz / t), (u1, cz / t), (u1, (cz + h) / t), (u0, (cz + h) / t)], smooth)
        if cap:
            m2 = top or mat
            pts = [Vector((cx + rt * math.cos(2 * math.pi * i / seg), cy + rt * math.sin(2 * math.pi * i / seg), cz + h)) for i in range(seg)]
            self.poly(pts, m2)
        if bottom:
            pts = [Vector((cx + r * math.cos(2 * math.pi * i / seg), cy + r * math.sin(2 * math.pi * i / seg), cz)) for i in reversed(range(seg))]
            self.poly(pts, mat)

    def dome(self, c, r, rise, mat, seg=48, rings=4):
        """Shallow dome/cone roof sitting on z=c.z."""
        cx, cy, cz = c
        prev = None
        for k in range(rings + 1):
            f = k / rings
            rr = r * math.cos(f * math.pi / 2) if rings > 1 else r * (1 - f)
            zz = cz + rise * math.sin(f * math.pi / 2)
            ring = [Vector((cx + rr * math.cos(2 * math.pi * i / seg), cy + rr * math.sin(2 * math.pi * i / seg), zz)) for i in range(seg)]
            if prev is not None:
                if rr < 1e-3:
                    for i in range(seg):
                        j = (i + 1) % seg
                        self.poly([prev[i], prev[j], ring[0]], mat, smooth=True)
                else:
                    for i in range(seg):
                        j = (i + 1) % seg
                        self.poly([prev[i], prev[j], ring[j], ring[i]], mat, smooth=True)
            prev = ring
            if rr < 1e-3:
                break
        if prev is not None and rings and (r * math.cos(math.pi / 2) > 1e-3):
            self.poly(prev, mat)

    def tube(self, p0, p1, r, mat, seg=12, caps=True, smooth=True):
        """Cylinder between two points (pipes, rails, posts)."""
        a, b = Vector(p0), Vector(p1)
        w = b - a
        L = w.length
        if L < 1e-6:
            return
        w.normalize()
        up = Vector((0, 0, 1)) if abs(w.z) < 0.9 else Vector((1, 0, 0))
        u = w.cross(up).normalized()
        v = w.cross(u).normalized()
        u, v = v, u  # right-handed (u, v, w)
        if u.cross(v).dot(w) < 0:
            u, v = v, u
        t = tile(mat)
        ra, rb = [], []
        for i in range(seg):
            ang = 2 * math.pi * i / seg
            d = u * math.cos(ang) + v * math.sin(ang)
            ra.append(self.v(a + d * r))
            rb.append(self.v(b + d * r))
        circ = 2 * math.pi * r
        for i in range(seg):
            j = (i + 1) % seg
            u0, u1 = circ * i / seg / t, circ * (i + 1) / seg / t
            self.face([ra[i], ra[j], rb[j], rb[i]], mat, [(u0, 0), (u1, 0), (u1, L / t), (u0, L / t)], smooth)
        if caps:
            pa = [a + (u * math.cos(2 * math.pi * i / seg) + v * math.sin(2 * math.pi * i / seg)) * r for i in reversed(range(seg))]
            pb = [b + (u * math.cos(2 * math.pi * i / seg) + v * math.sin(2 * math.pi * i / seg)) * r for i in range(seg)]
            self.poly(pa, mat)
            self.poly(pb, mat)

    def plane(self, c, sx, sy, mat, rz=0.0, z=None, uvs=None):
        """Flat horizontal quad (markings, water, ground patches)."""
        cx, cy, cz = c
        ca, sa = math.cos(rz), math.sin(rz)
        ex, ey = Vector((ca, sa, 0)), Vector((-sa, ca, 0))
        C = Vector((cx, cy, cz if z is None else z))
        q = [C - ex * sx / 2 - ey * sy / 2, C + ex * sx / 2 - ey * sy / 2,
             C + ex * sx / 2 + ey * sy / 2, C - ex * sx / 2 + ey * sy / 2]
        if uvs is None:
            t = tile(mat)
            uvs = [(p.dot(ex) / t, p.dot(ey) / t) for p in q]
        self.face([self.v(p) for p in q], mat, uvs)

    # -- output ------------------------------------------------------------
    def build(self, coll=None):
        if not self.F:
            return None
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.V, [], self.F)
        for mn in self.mats:
            me.materials.append(get_mat(mn))
        me.polygons.foreach_set("material_index", self.FM)
        me.polygons.foreach_set("use_smooth", self.SM)
        uvl = me.uv_layers.new(name="UVMap")
        flat = [c for f in self.UV for uv in f for c in uv]
        uvl.data.foreach_set("uv", flat)
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        (coll or bpy.context.scene.collection).objects.link(ob)
        return ob


def planar_uv(pts, t):
    n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
    if n.length < 1e-9 and len(pts) > 3:
        n = (pts[2] - pts[0]).cross(pts[3] - pts[0])
    ax = (abs(n.x), abs(n.y), abs(n.z))
    if ax[2] >= ax[0] and ax[2] >= ax[1]:
        return [(p.x / t, p.y / t) for p in pts]
    if ax[0] >= ax[1]:
        return [(p.y / t, p.z / t) for p in pts]
    return [(p.x / t, p.z / t) for p in pts]


# ---------------------------------------------------------------------------
# scene helpers
# ---------------------------------------------------------------------------
def reset_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for b in list(coll):
            if b.users == 0:
                coll.remove(b)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def collection(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c


def anchor(name, pos, coll=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "SPHERE"
    e.empty_display_size = 2.0
    e.location = pos
    (coll or bpy.context.scene.collection).objects.link(e)
    return e


def export_glb(filename):
    os.makedirs(MODELS_OUT, exist_ok=True)
    path = os.path.join(MODELS_OUT, filename)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in bpy.context.scene.objects:
        if ob.type in ("MESH", "EMPTY"):
            ob.select_set(True)
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
              export_yup=True, export_cameras=False, export_lights=False,
              export_extras=True, export_image_format="JPEG",
              export_draco_mesh_compression_enable=True,
              export_draco_mesh_compression_level=6,
              export_draco_position_quantization=14,
              export_draco_normal_quantization=10,
              export_draco_texcoord_quantization=12)
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        kw.pop("export_image_format", None)
        bpy.ops.export_scene.gltf(**kw)
    return path, os.path.getsize(path)


def stats():
    tris = 0
    for ob in bpy.context.scene.objects:
        if ob.type == "MESH":
            for p in ob.data.polygons:
                tris += len(p.vertices) - 2
    return {"objects": len(bpy.context.scene.objects), "tris": tris, "materials": len(bpy.data.materials)}
