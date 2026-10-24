"""FALAJ Twin — Blender model authoring (Blender 5.2 LTS).

Builds the three facility exteriors and exports GLB to frontend/public/models/.
Run inside Blender (Scripting console) or via the Blender MCP `execute_blender_code`.
All geometry is an illustrative reconstruction of the public exterior — not a claim
about internal engineering.
"""
import bpy, math, mathutils, os

OUT = os.path.join(os.path.dirname(bpy.data.filepath) or ".", "..", "frontend", "public", "models")
# When run via MCP, override OUT with the absolute frontend/public/models path.


def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def getM(name, rgb, rough=0.7, metal=0.0, emis=None, es=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emis is not None:
        b.inputs['Emission Color'].default_value = (*emis, 1)
        b.inputs['Emission Strength'].default_value = es
    return m


def cube(name, loc, size, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object; o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.clear(); o.data.materials.append(m); return o


def cyl(name, loc, r, h, m, verts=32, rot=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc)
    o = bpy.context.active_object; o.name = name
    if rot: o.rotation_euler = rot
    o.data.materials.clear(); o.data.materials.append(m); return o


def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    ms = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True,
                              export_cameras=False, export_lights=False)


# --- Water plant (hero). Authored with Blender_Y = -(scene_z). ---
def build_taweelah(out):
    reset()
    M = {'ground': getM('tw_ground', (0.10, 0.12, 0.15), 0.95),
         'sea': getM('tw_sea', (0.03, 0.10, 0.17), 0.25, 0.3),
         'tank': getM('tw_tank', (0.74, 0.78, 0.82), 0.45, 0.25),
         'tanktop': getM('tw_tanktop', (0.58, 0.63, 0.69), 0.55, 0.2),
         'concrete': getM('tw_concrete', (0.28, 0.33, 0.39), 0.9),
         'building': getM('tw_building', (0.20, 0.26, 0.34), 0.8),
         'roof': getM('tw_roof', (0.14, 0.18, 0.24), 0.85),
         'pipe': getM('tw_pipe', (0.48, 0.53, 0.59), 0.4, 0.6),
         'vault': getM('tw_vault', (0.34, 0.41, 0.50), 0.6, 0.15),
         'pump': getM('tw_pump', (0.14, 0.30, 0.55), 0.4, 0.6),
         'glass': getM('tw_glass', (0.09, 0.22, 0.33), 0.15, 0.6, (0.11, 0.36, 0.52), 0.6),
         'pv': getM('tw_pv', (0.04, 0.08, 0.17), 0.3, 0.6),
         'basin': getM('tw_basin', (0.07, 0.22, 0.30), 0.3, 0.3),
         'road': getM('tw_road', (0.08, 0.10, 0.13), 0.9)}

    def c(name, rx, rz, zh, size, mk):  # rx east, rz south(+), zh up
        return cube(name, (rx, -rz, zh), size, M[mk])

    c('Ground', 5, 0, -0.2, (170, 150, 0.4), 'ground')
    c('Road', 5, 0, 0.03, (150, 130, 0.1), 'road')
    c('Sea', 0, -70, -0.12, (175, 46, 0.3), 'sea')
    for i, x in enumerate((-30, -18, -6)): c(f'Basin_{i}', x, -40, 0.4, (10, 16, 0.9), 'basin')
    c('ControlRoom', -54, -28, 2.5, (12, 10, 5), 'building')
    c('CR_Glass', -54, -23.1, 2.6, (9, 0.2, 2.4), 'glass')
    c('Admin', -54, -14, 2, (10, 8, 4), 'building')
    c('RO_Hall', 8, 2, 3.5, (26, 14, 7), 'building')
    c('RO_RoofSlab', 8, 2, 7.2, (27, 15, 0.4), 'roof')
    c('RO_SideBlock', 8, -8, 4, (26, 3, 8), 'building')
    for i in range(6):
        cyl(f'Vault_{i}', (-2 + i * 4, -2, 7.4), 1.5, 13, M['vault'], 16, (math.radians(90), 0, 0))

    def tank(nm, rx, rz, r, h):
        cyl(nm + '_body', (rx, -rz, h / 2), r, h, M['tank'])
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(rx, -rz, h))
        d = bpy.context.active_object; d.name = nm + '_dome'
        d.scale = (1, 1, 0.45); bpy.ops.object.transform_apply(scale=True)
        d.data.materials.clear(); d.data.materials.append(M['tanktop'])
    for nm, rx, rz, r, h in [('TankA', 52, 20, 5, 7), ('TankB', 64, 40, 6, 8), ('TankC', 44, 42, 4, 6)]:
        tank(nm, rx, rz, r, h)

    c('PumpPad', 40, 20, 0.3, (10, 7, 0.6), 'concrete')
    for i, x in enumerate((-3, 0, 3)):
        cyl(f'Pump_{i}', (40 + x, -20, 1.3), 1.0, 1.8, M['pump'])
        c(f'PumpMotor_{i}', 40 + x, 20, 2.4, (1.2, 1.2, 0.6), 'pipe')

    def pipe(name, a, b, r=0.4):
        av = mathutils.Vector((a[0], -a[1], a[2])); bv = mathutils.Vector((b[0], -b[1], b[2]))
        d = bv - av; L = d.length; mid = (av + bv) / 2
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=r, depth=L, location=(mid.x, mid.y, mid.z))
        o = bpy.context.active_object; o.name = name
        z = mathutils.Vector((0, 0, 1)); ax = z.cross(d.normalized()); ang = z.angle(d.normalized())
        if ax.length > 1e-6: o.rotation_euler = mathutils.Quaternion(ax.normalized(), ang).to_euler()
        o.data.materials.clear(); o.data.materials.append(M['pipe'])
    pipe('Pipe_intake', (-6, -40, 1), (-6, -6, 1)); pipe('Pipe_cross', (-6, -6, 1), (8, -6, 1))
    pipe('Pipe_ro_pump', (21, 2, 1), (40, 20, 1), 0.35)
    pipe('Pipe_pump_tank', (40, 20, 1.4), (52, 20, 1.4), 0.35)
    pipe('Pipe_tank_res', (52, 20, 1.4), (62, 40, 1.4), 0.3)
    for i in range(10):
        o = c(f'PV_{i}', -48 + (i % 5) * 2.4, 8 + (i // 5) * 3, 0.8, (1.8, 2.4, 0.1), 'pv')
        o.rotation_euler = (math.radians(-25), 0, 0)
    export(os.path.join(out, 'taweelah.glb'))


def build_hospital(out):
    reset()
    podium = getM('cc_podium', (0.20, 0.24, 0.30), 0.8)
    tower = getM('cc_tower', (0.26, 0.32, 0.42), 0.55, 0.1)
    glass = getM('cc_glass', (0.10, 0.24, 0.36), 0.15, 0.6, (0.12, 0.38, 0.54), 0.5)
    garden = getM('cc_garden', (0.12, 0.40, 0.30), 0.7, (0.10, 0.34, 0.24), 0.3)
    ground = getM('cc_ground', (0.09, 0.11, 0.14), 0.95)
    cube('CC_Ground', (0, 0, -0.2), (120, 120, 0.4), ground)
    cube('CC_Podium', (0, 0, 2), (42, 32, 4), podium)
    cube('CC_PodiumGlass', (0, -16.1, 2), (40, 0.3, 3), glass)
    for i, (x, y, h) in enumerate([(-12, 6, 22), (0, 8, 30), (12, 6, 24), (-5, -8, 18), (8, -6, 20)]):
        cube(f'CC_Tower_{i}', (x, y, 4 + h / 2), (9, 9, h), tower)
        cube(f'CC_TowerGlass_{i}', (x, y - 4.6, 4 + h / 2), (6, 0.2, h * 0.85), glass)
        cube(f'CC_Garden_{i}', (x, y, 4 + h + 0.6), (9.6, 9.6, 1.0), garden)
    export(os.path.join(out, 'cleveland-clinic.glb'))


def build_substation(out):
    reset()
    ground = getM('dw_ground', (0.09, 0.11, 0.14), 0.95)
    bld = getM('dw_bld', (0.24, 0.29, 0.36), 0.75)
    steel = getM('dw_steel', (0.42, 0.47, 0.54), 0.4, 0.6)
    tx = getM('dw_tx', (0.34, 0.39, 0.46), 0.5, 0.4)
    porc = getM('dw_porc', (0.78, 0.82, 0.86), 0.4)
    cube('DW_Ground', (0, 0, -0.2), (120, 120, 0.4), ground)
    cube('DW_GIS', (-20, 0, 4), (22, 14, 8), bld)
    cube('DW_GIS2', (-20, 10, 3), (10, 6, 6), bld)
    for i, x in enumerate((6, 16, 26)):
        cube(f'DW_TX_{i}', (x, -6, 2), (4, 5, 4), tx)
        for b in (-1, 0, 1):
            cyl(f'DW_Bush_{i}_{b}', (x + b * 1.2, -6, 5.2), 0.22, 2.2, porc, 10)
        cube(f'DW_Rad_{i}', (x - 2.3, -6, 2), (0.5, 4, 3.5), steel)
    for i, x in enumerate((0, 10, 20)):
        cube(f'DW_GantryL_{i}', (x - 3, 10, 5), (0.4, 0.4, 10), steel)
        cube(f'DW_GantryR_{i}', (x + 3, 10, 5), (0.4, 0.4, 10), steel)
        cube(f'DW_GantryT_{i}', (x, 10, 10), (7, 0.4, 0.4), steel)
        for b in (-2, 0, 2):
            cyl(f'DW_Ins_{i}_{b}', (x + b, 10, 8.5), 0.12, 1.6, porc, 8)
    export(os.path.join(out, 'dewa-nad-hessa.glb'))


if __name__ == '__main__':
    build_taweelah(OUT)
    build_hospital(OUT)
    build_substation(OUT)
    print('Exported GLBs to', OUT)
