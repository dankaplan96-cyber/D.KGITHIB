# Blender side of the LBA3 Blender bridge (tools/blender-bridge/bridge.mjs). Runs inside the installed Blender:
#   blender --background --factory-startup --python run_job.py -- <job.json>
# The job file (UTF-8 JSON, written by the bridge) carries every path; this script writes its result to job["result"]
# ({ok, op, summary, errors, ...}) and exits non-zero on failure (the bridge passes --python-exit-code).
#
# Axes: the game is three.js (+y up, a prop's front +z, metres); Blender is +z up, front -y, metres.
#   blender (x, y, z) = game (x, -z, y)        game (x, y, z) = blender (x, z, -y)
# so Blender's Front view (looking along +y) shows a prop's game front.
import json
import math
import os
import sys
import traceback

import bpy
from mathutils import Matrix, Vector

SPEC = json.load(open(sys.argv[sys.argv.index('--') + 1], encoding='utf-8'))
RESULT = {'ok': False, 'op': SPEC.get('op'), 'name': SPEC.get('name'), 'errors': [], 'warnings': []}


def g2b(x, y, z):
    return (x, -z, y)


def b2g(v):
    return (v[0], v[2], -v[1])


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_lin(h):
    h = h.lstrip('#')
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


def lin_hex(c):
    def enc(x):
        x = max(0.0, min(1.0, x))
        return round(255 * (x * 12.92 if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055))
    return '#%02x%02x%02x' % tuple(enc(x) for x in c[:3])


def rel(p):
    try:
        return os.path.relpath(p, SPEC['gameRoot']).replace('\\', '/')
    except ValueError:
        return p


def out_dir(p):
    os.makedirs(os.path.dirname(p) if os.path.splitext(p)[1] else p, exist_ok=True)


def fresh_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load_input(p):
    """Open a .blend, or import a .polyprop.json / .glb / .gltf into an empty scene."""
    low = p.lower()
    if low.endswith('.blend'):
        bpy.ops.wm.open_mainfile(filepath=p)
    elif low.endswith('.json'):
        fresh_scene()
        import_polyprop(p)
    elif low.endswith(('.glb', '.gltf')):
        fresh_scene()
        bpy.ops.import_scene.gltf(filepath=p)
    else:
        raise ValueError('unsupported input: ' + p)


# ------------------------------------------------------------------ polyprop <-> Blender
def find_socket(sockets, ident):
    for s in sockets:
        if s.identifier == ident:
            return s
    raise KeyError(ident)


def make_material(name, m, tex_dir):
    mat = bpy.data.materials.new(name)
    if hasattr(mat, 'use_nodes'):
        mat.use_nodes = True
    mat['lba3_material'] = json.dumps(m)   # the game recipe, carried through to export untouched
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = m.get('roughness', 0.8)
    bsdf.inputs['Metallic'].default_value = m.get('metalness', 0.0)
    col = hex_lin(m.get('color', '#ffffff'))
    rgb = nt.nodes.new('ShaderNodeRGB')
    rgb.outputs[0].default_value = (*col, 1)
    last = rgb.outputs[0]
    mat.diffuse_color = (*col, 1)   # (what the Solid / Workbench views show)
    if m.get('map'):
        path = os.path.join(tex_dir, m['map'])
        img = bpy.data.images.load(path, check_existing=True)
        img.colorspace_settings.name = 'sRGB'
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        tex.extension = 'REPEAT'
        last = mix_mul(nt, last, tex.outputs['Color'])
    if m.get('vertexColors'):
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        last = mix_mul(nt, last, vc.outputs['Color'])
    nt.links.new(last, bsdf.inputs['Base Color'])
    return mat


def mix_mul(nt, a, b):
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    find_socket(mix.inputs, 'Factor_Float').default_value = 1.0
    nt.links.new(a, find_socket(mix.inputs, 'A_Color'))
    nt.links.new(b, find_socket(mix.inputs, 'B_Color'))
    return find_socket(mix.outputs, 'Result_Color')


def import_polyprop(p):
    data = json.load(open(p, encoding='utf-8'))
    if data.get('format') != 'lba3-polyprop':
        raise ValueError('not an lba3-polyprop file: ' + p)
    tex_dir = os.path.join(os.path.dirname(p), data.get('textureDir', 'textures'))
    coll = bpy.data.collections.new(data['name'])
    bpy.context.scene.collection.children.link(coll)
    header = {k: v for k, v in data.items() if k != 'parts'}
    bpy.context.scene['lba3_polyprop'] = json.dumps(header)
    for i, part in enumerate(data['parts']):
        m = part['material']
        pos, nrm, idx = part['pos'], part['nrm'], part['idx']
        n = len(pos) // 3
        verts = [g2b(pos[3 * k], pos[3 * k + 1], pos[3 * k + 2]) for k in range(n)]
        faces = [tuple(idx[3 * t:3 * t + 3]) for t in range(len(idx) // 3)]
        me = bpy.data.meshes.new('%s.%02d' % (m.get('key', 'part'), i))
        me.from_pydata(verts, [], faces)
        me.validate(clean_customdata=False)
        uv = part.get('uv')
        if uv:
            layer = me.uv_layers.new(name='UVMap')
            for loop in me.loops:
                v = loop.vertex_index
                layer.data[loop.index].uv = (uv[2 * v], uv[2 * v + 1])
        col = part.get('col')
        if col:
            ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
            for k in range(n):
                ca.data[k].color = (col[3 * k], col[3 * k + 1], col[3 * k + 2], 1)
        me.normals_split_custom_set_from_vertices([g2b(nrm[3 * k], nrm[3 * k + 1], nrm[3 * k + 2]) for k in range(n)])
        me.materials.append(make_material(m.get('key', 'mat%d' % i), m, tex_dir))
        ob = bpy.data.objects.new(me.name, me)
        coll.objects.link(ob)
    return data


def collect_parts(objects):
    """Scene meshes -> game parts, one per material (world transforms applied, triangulated, re-indexed)."""
    dg = bpy.context.evaluated_depsgraph_get()
    parts = {}
    for ob in objects:
        if ob.type != 'MESH' or ob.hide_render:
            continue
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        mw = ob.matrix_world
        nm = mw.to_3x3().inverted_safe().transposed()
        me.calc_loop_triangles()
        cn = me.corner_normals
        uvl = me.uv_layers.active.data if me.uv_layers.active else None
        ca = me.color_attributes.get('Col') or (me.color_attributes[0] if len(me.color_attributes) else None)
        for tri in me.loop_triangles:
            mat = ob.material_slots[tri.material_index].material if ob.material_slots else None
            info = json.loads(mat['lba3_material']) if mat and 'lba3_material' in mat else {'key': mat.name if mat else 'default', 'color': lin_hex(mat.diffuse_color) if mat else '#cccccc'}
            key = info.get('key', 'default')
            P = parts.setdefault(key, {'material': info, 'pos': [], 'nrm': [], 'uv': [], 'col': [], 'idx': [], 'seen': {}})
            for li in tri.loops:
                vi = me.loops[li].vertex_index
                co = b2g(mw @ me.vertices[vi].co)
                no = b2g((nm @ cn[li].vector).normalized())
                u = tuple(uvl[li].uv) if uvl else (0.0, 0.0)
                if ca:
                    c = ca.data[vi if ca.domain == 'POINT' else li].color
                    c = (c[0], c[1], c[2])
                else:
                    c = None
                kk = (tuple(round(x, 5) for x in co), tuple(round(x, 4) for x in no), tuple(round(x, 5) for x in u), c and tuple(round(x, 4) for x in c))
                j = P['seen'].get(kk)
                if j is None:
                    j = len(P['pos']) // 3
                    P['seen'][kk] = j
                    P['pos'] += [round(x, 5) for x in co]
                    P['nrm'] += [round(x, 4) for x in no]
                    P['uv'] += [round(x, 5) for x in u]
                    if c:
                        P['col'] += [round(x, 4) for x in c]
                P['idx'].append(j)
        ev.to_mesh_clear()
    out = []
    for P in parts.values():
        del P['seen']
        if not P['col'] or not P['material'].get('vertexColors'):
            P.pop('col')
        out.append(P)
    return out


def bbox_game(parts):
    lo, hi = [1e9] * 3, [-1e9] * 3
    for P in parts:
        p = P['pos']
        for k in range(0, len(p), 3):
            for a in range(3):
                lo[a] = min(lo[a], p[k + a]); hi[a] = max(hi[a], p[k + a])
    return {'min': [round(x, 4) for x in lo], 'max': [round(x, 4) for x in hi], 'size': [round(h - l, 4) for l, h in zip(lo, hi)]}


# ------------------------------------------------------------------ ops
def op_import():
    load_input(SPEC['input'])
    out_dir(SPEC['blend'])
    bpy.ops.wm.save_as_mainfile(filepath=SPEC['blend'], compress=True, relative_remap=True)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    RESULT['blend'] = rel(SPEC['blend'])
    RESULT['summary'] = '%d mesh objects -> %s' % (len(meshes), rel(SPEC['blend']))


def inspect_scene():
    rep = {'file': rel(bpy.data.filepath) if bpy.data.filepath else rel(SPEC['input']), 'blender': bpy.app.version_string, 'objects': [], 'materials': [], 'images': [], 'armatures': [], 'actions': []}
    dg = bpy.context.evaluated_depsgraph_get()
    tris = 0
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for ob in bpy.data.objects:
        o = {'name': ob.name, 'type': ob.type, 'parent': ob.parent.name if ob.parent else None, 'location': [round(x, 4) for x in ob.location],
             'rotation_euler': [round(x, 4) for x in ob.rotation_euler], 'scale': [round(x, 4) for x in ob.scale], 'dimensions': [round(x, 4) for x in ob.dimensions]}
        if ob.type == 'MESH':
            me = ob.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            o['mesh'] = {'vertices': len(me.vertices), 'faces': len(me.polygons), 'triangles': len(me.loop_triangles), 'uv_layers': [u.name for u in me.uv_layers],
                         'color_attributes': [c.name for c in me.color_attributes], 'materials': [s.material.name if s.material else None for s in ob.material_slots],
                         'vertex_groups': len(ob.vertex_groups), 'modifiers': [m.type for m in ob.modifiers]}
            tris += len(me.loop_triangles)
            for v in me.vertices:
                w = ob.matrix_world @ v.co
                lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
            ob.evaluated_get(dg).to_mesh_clear()
        rep['objects'].append(o)
    for m in bpy.data.materials:
        imgs = [n.image.name for n in (m.node_tree.nodes if m.node_tree else []) if n.type == 'TEX_IMAGE' and n.image]
        rep['materials'].append({'name': m.name, 'users': m.users, 'images': imgs, 'game': json.loads(m['lba3_material']) if 'lba3_material' in m else None})
    texmem = 0
    for im in bpy.data.images:
        w, h = im.size[:]
        mem = int(w * h * 4 * 4 / 3)   # RGBA8 with a full mip chain, as the game's WebGL upload
        texmem += mem
        rep['images'].append({'name': im.name, 'path': rel(bpy.path.abspath(im.filepath)) if im.filepath else None, 'size': [w, h], 'packed': bool(im.packed_file), 'estMemoryBytes': mem})
    for a in bpy.data.armatures:
        rep['armatures'].append({'name': a.name, 'bones': len(a.bones), 'roots': [b.name for b in a.bones if not b.parent], 'bone_names': [b.name for b in a.bones]})
    for act in bpy.data.actions:
        fr = act.frame_range
        rep['actions'].append({'name': act.name, 'frames': [round(fr[0], 2), round(fr[1], 2)], 'users': act.users})
    bb = None
    if tris:
        glo, ghi = b2g(lo), b2g(hi)
        gmin = [min(a, b) for a, b in zip(glo, ghi)]; gmax = [max(a, b) for a, b in zip(glo, ghi)]
        bb = {'min': [round(x, 4) for x in gmin], 'max': [round(x, 4) for x in gmax], 'size': [round(b - a, 4) for a, b in zip(gmin, gmax)]}
    rep['totals'] = {'objects': len(bpy.data.objects), 'meshes': sum(1 for o in bpy.data.objects if o.type == 'MESH'), 'triangles': tris,
                     'materials': len(bpy.data.materials), 'images': len(bpy.data.images), 'estTextureMemoryBytes': texmem,
                     'armatures': len(bpy.data.armatures), 'actions': len(bpy.data.actions), 'bboxGame': bb}
    hdr = bpy.context.scene.get('lba3_polyprop')
    if hdr:
        rep['polyprop'] = json.loads(hdr)
    return rep


def op_inspect():
    load_input(SPEC['input'])
    rep = inspect_scene()
    out_dir(SPEC['output'])
    json.dump(rep, open(SPEC['output'], 'w', encoding='utf-8'), indent=2)
    t = rep['totals']
    RESULT['report'] = rel(SPEC['output'])
    RESULT['totals'] = t
    RESULT['summary'] = '%d meshes, %d tris, %d materials, %d images, bbox %s m' % (t['meshes'], t['triangles'], t['materials'], t['images'], t['bboxGame'] and t['bboxGame']['size'])


def op_validate():
    load_input(SPEC['input'])
    o = SPEC['options']
    checks = []

    def add(name, status, detail=''):
        checks.append({'check': name, 'status': status, 'detail': detail})
    # textures
    missing = [im.name for im in bpy.data.images if im.source == 'FILE' and not im.packed_file and not os.path.exists(bpy.path.abspath(im.filepath))]
    add('textures present', 'fail' if missing else 'pass', ', '.join(missing))
    big = [f'{im.name} {im.size[0]}x{im.size[1]}' for im in bpy.data.images if max(im.size[:]) > o.get('maxTexture', 1024)]
    add('texture size <= %d' % o.get('maxTexture', 1024), 'warn' if big else 'pass', ', '.join(big))
    # scale
    rep = inspect_scene()
    bb = rep['totals']['bboxGame']
    lo_s, hi_s = o.get('minSize', 0.02), o.get('maxSize', 30)
    if not bb:
        add('has geometry', 'fail', 'no mesh triangles')
    else:
        sz = bb['size']
        bad = max(sz) > hi_s or max(sz) < lo_s
        add('plausible scale (metres)', 'fail' if bad else 'pass', 'size %s, allowed largest side %s..%s m' % (sz, lo_s, hi_s))
        if o.get('expectSize'):
            d = max(abs(a - b) for a, b in zip(sz, o['expectSize']))
            add('size matches expected', 'pass' if d <= o.get('sizeTolerance', 0.005) else 'fail', 'size %s vs %s (max diff %.4f)' % (sz, o['expectSize'], d))
        if o.get('groundedAtZero', True):
            add('origin on the floor (min y = 0)', 'pass' if abs(bb['min'][1]) <= 0.01 else 'warn', 'min y %.4f' % bb['min'][1])
    # geometry
    dg = bpy.context.evaluated_depsgraph_get()
    zero, nan, loose = 0, 0, 0
    for ob in bpy.data.objects:
        if ob.type != 'MESH':
            continue
        me = ob.evaluated_get(dg).to_mesh()
        used = set()
        for p in me.polygons:
            used.update(p.vertices)
            if p.area < 1e-10:
                zero += 1
        loose += len(me.vertices) - len(used)
        nan += sum(1 for v in me.vertices if any(math.isnan(c) or math.isinf(c) for c in v.co))
        ob.evaluated_get(dg).to_mesh_clear()
    add('no NaN/inf vertices', 'fail' if nan else 'pass', str(nan))
    add('no zero-area faces', 'warn' if zero else 'pass', str(zero))
    add('no loose vertices', 'warn' if loose else 'pass', str(loose))
    # transforms
    unapplied = [ob.name for ob in bpy.data.objects if ob.type == 'MESH' and (any(abs(s - 1) > 1e-4 for s in ob.scale) or any(abs(r) > 1e-4 for r in ob.rotation_euler))]
    add('transforms applied (export bakes them for props)', 'warn' if unapplied else 'pass', ', '.join(unapplied[:12]))
    arm_scaled = [ob.name for ob in bpy.data.objects if ob.type == 'ARMATURE' and any(abs(s - 1) > 1e-4 for s in ob.scale)]
    add('armatures unscaled', 'fail' if arm_scaled else 'pass', ', '.join(arm_scaled))
    # materials
    no_mat = [ob.name for ob in bpy.data.objects if ob.type == 'MESH' and not any(s.material for s in ob.material_slots)]
    add('every mesh has a material', 'fail' if no_mat else 'pass', ', '.join(no_mat))
    mats = {s.material.name for ob in bpy.data.objects if ob.type == 'MESH' for s in ob.material_slots if s.material}
    if o.get('target', 'polyprop') == 'polyprop':   # (a character's colours are baked into its vertex colours: one draw for the body whatever the slots)
        lim = o.get('maxMaterials', 4)
        add('material slots <= %d (one draw call each in the game)' % lim, 'warn' if len(mats) > lim else 'pass', '%d: %s' % (len(mats), ', '.join(sorted(mats))))
    if o.get('target', 'polyprop') == 'polyprop':
        nogame = sorted(m for m in mats if 'lba3_material' not in bpy.data.materials[m])
        add('materials carry a game recipe (lba3_material)', 'warn' if nogame else 'pass', ', '.join(nogame) + (' (exported as flat colours)' if nogame else ''))
        tl = o.get('maxTriangles')
        if tl:
            add('triangles <= %d' % tl, 'fail' if rep['totals']['triangles'] > tl else 'pass', str(rep['totals']['triangles']))
    # rigs and clips
    for ob in bpy.data.objects:
        if ob.type != 'MESH' or not ob.vertex_groups:
            continue
        arms = [m.object for m in ob.modifiers if m.type == 'ARMATURE']
        if not arms or not arms[0]:
            add('rig reference: %s' % ob.name, 'fail', 'vertex groups but no armature modifier target')
            continue
        bones = {b.name for b in arms[0].data.bones}
        stray = [g.name for g in ob.vertex_groups if g.name not in bones]
        add('rig reference: %s -> %s' % (ob.name, arms[0].name), 'fail' if stray else 'pass', 'groups without a bone: ' + ', '.join(stray[:10]) if stray else '%d groups' % len(ob.vertex_groups))
        me = ob.data
        over = sum(1 for v in me.vertices if sum(1 for g in v.groups if g.weight > 1e-4) > 4)
        add('<= 4 bone weights per vertex: %s' % ob.name, 'fail' if over else 'pass', str(over))
    if o.get('skeleton'):
        sk = json.load(open(os.path.join(SPEC['gameRoot'], o['skeleton']), encoding='utf-8'))
        ent = sk.get(o.get('skeletonKey', ''), sk) if isinstance(sk, dict) else sk
        ent = ent.get('bones', ent) if isinstance(ent, dict) else ent   # (skeletons.json: {look: {bones: {name: ...}, height, ...}})
        want = set(ent.keys()) if isinstance(ent, dict) else set(ent)
        for a in bpy.data.armatures:
            miss = sorted(want - {b.name for b in a.bones})
            add('armature %s has the game skeleton\'s bones' % a.name, 'fail' if miss else 'pass', ', '.join(miss[:12]))
    if o.get('expectedClips'):
        have = {a.name for a in bpy.data.actions}
        miss = [c for c in o['expectedClips'] if c not in have]
        add('animation clips named as the game expects', 'fail' if miss else 'pass', 'missing: ' + ', '.join(miss) if miss else ', '.join(o['expectedClips']))
    fails = [c for c in checks if c['status'] == 'fail']
    rep_out = {'file': rep['file'], 'blender': bpy.app.version_string, 'checks': checks, 'totals': rep['totals'], 'passed': not fails}
    out_dir(SPEC['output'])
    json.dump(rep_out, open(SPEC['output'], 'w', encoding='utf-8'), indent=2)
    RESULT['report'] = rel(SPEC['output'])
    RESULT['checks'] = checks
    RESULT['summary'] = '%d pass, %d warn, %d fail' % tuple(sum(1 for c in checks if c['status'] == s) for s in ('pass', 'warn', 'fail'))
    if fails and not o.get('reportOnly'):
        RESULT['errors'] = ['%s: %s' % (c['check'], c['detail']) for c in fails]


def op_export():
    load_input(SPEC['input'])
    fmt = SPEC['options'].get('format', 'polyprop')
    out_dir(SPEC['output'])
    if fmt == 'glb':
        bpy.ops.export_scene.gltf(filepath=SPEC['output'], export_format='GLB', export_apply=True, export_yup=True)
        RESULT['summary'] = 'glb -> %s (%d bytes; the game has no glTF loader: interchange only)' % (rel(SPEC['output']), os.path.getsize(SPEC['output']))
        return
    hdr = json.loads(bpy.context.scene.get('lba3_polyprop', '{}'))
    parts = collect_parts([o for o in bpy.data.objects])
    data = {'format': 'lba3-polyprop', 'version': 1, 'name': SPEC['options'].get('name', hdr.get('name', 'prop')),
            'units': hdr.get('units', 'metres; +y up; front +z; origin on the floor at the footprint centre'),
            'source': {**hdr.get('source', {}), 'exportedBy': 'tools/blender-bridge (Blender %s)' % bpy.app.version_string, 'from': rel(SPEC['input'])},
            'footprint': hdr.get('footprint'), 'textureDir': texture_dir_for(SPEC['output']),
            'bbox': bbox_game(parts), 'triangles': sum(len(P['idx']) // 3 for P in parts), 'parts': parts}
    json.dump(data, open(SPEC['output'], 'w', encoding='utf-8'), separators=(',', ':'))
    RESULT['summary'] = 'polyprop: %d parts, %d tris, bbox %s -> %s' % (len(parts), data['triangles'], data['bbox']['size'], rel(SPEC['output']))
    RESULT['bbox'] = data['bbox']
    RESULT['triangles'] = data['triangles']


def texture_dir_for(out):
    """Where the images the materials use live, relative to the exported file (textures are referenced, never copied)."""
    dirs = {os.path.dirname(os.path.abspath(bpy.path.abspath(im.filepath))) for im in bpy.data.images if im.source == 'FILE' and im.filepath}
    if not dirs:
        return 'textures'
    if len(dirs) > 1:
        RESULT['warnings'].append('textures in several folders: %s' % sorted(dirs))
    return os.path.relpath(sorted(dirs)[0], os.path.dirname(out)).replace('\\', '/')


VIEWS = {   # name: (azimuth from the game front, elevation) in degrees; azimuth 90 = the game's +x side
    'front': (0, 12), 'side': (90, 12), 'back': (180, 12), 'threequarter': (45, 30),
}


def op_preview():
    load_input(SPEC['input'])
    o = SPEC['options']
    res = o.get('resolution', 512)
    sc = bpy.context.scene
    meshes = [ob for ob in sc.objects if ob.type == 'MESH']
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for ob in meshes:
        for c in ob.bound_box:
            w = ob.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    ctr, ext = (lo + hi) / 2, max((hi - lo).length, 0.1)
    # a neutral floor with a 0.25 m checker (the scale reference in every view)
    bpy.ops.mesh.primitive_plane_add(size=max(4.0, ext * 3), location=(ctr.x, ctr.y, lo.z - 0.0005))
    floor = bpy.context.active_object
    floor.name = '_preview_floor'
    fm = bpy.data.materials.new('_preview_floor')
    if hasattr(fm, 'use_nodes'):
        fm.use_nodes = True
    nt = fm.node_tree
    chk = nt.nodes.new('ShaderNodeTexChecker')
    chk.inputs['Scale'].default_value = max(4.0, ext * 3) / 0.25 / 2 * 2
    chk.inputs['Color1'].default_value = (0.42, 0.42, 0.42, 1); chk.inputs['Color2'].default_value = (0.36, 0.36, 0.36, 1)
    nt.links.new(chk.outputs['Color'], next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'])
    fm.diffuse_color = (0.38, 0.38, 0.38, 1)
    floor.data.materials.append(fm)
    floor.color = (0.32, 0.32, 0.32, 1)
    for ob in meshes:
        ob.color = (0.8, 0.8, 0.78, 1)
    cam_d = bpy.data.cameras.new('_preview_cam')
    cam_d.type = 'ORTHO'
    cam_d.ortho_scale = o.get('orthoScale', ext * 1.15)
    cam = bpy.data.objects.new('_preview_cam', cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sun_d = bpy.data.lights.new('_preview_sun', 'SUN')
    sun_d.energy = 3.0
    sun = bpy.data.objects.new('_preview_sun', sun_d)
    sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))   # fixed key light from the front-left, above
    world = bpy.data.worlds.new('_preview_world')
    if hasattr(world, 'use_nodes'):
        world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.55, 0.57, 0.6, 1); bg.inputs['Strength'].default_value = 0.9
    sc.world = world
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'   # (the game shows sRGB colours as they are, no filmic curve)
    os.makedirs(SPEC['output'], exist_ok=True)
    shots = []
    for mode in o.get('modes', ['neutral', 'textured']):
        if mode == 'neutral':
            sc.render.engine = 'BLENDER_WORKBENCH'
            sh = sc.display.shading
            sh.light = 'STUDIO'; sh.color_type = 'OBJECT'; sh.show_cavity = True; sh.cavity_type = 'WORLD'; sh.show_object_outline = True
        else:
            sc.render.engine = 'BLENDER_EEVEE'
            for m in bpy.data.materials:   # (the cast scripts colour by vertex or by viewport colour: drive Base Color from them)
                if m.name.startswith('_preview') or not m.node_tree:
                    continue
                bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                if bs and not bs.inputs['Base Color'].is_linked:
                    users = [o for o in meshes if any(sl.material == m for sl in o.material_slots)]
                    ca = next((o.data.color_attributes[0].name for o in users if len(o.data.color_attributes)), None)
                    if ca:
                        vc = m.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name = ca
                        m.node_tree.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
                    else:
                        bs.inputs['Base Color'].default_value = m.diffuse_color
            try:
                sc.eevee.taa_render_samples = o.get('samples', 32)
            except AttributeError:
                pass
        for v, (az, el) in VIEWS.items():
            a, e = math.radians(az), math.radians(el)
            gdir = (math.sin(a) * math.cos(e), math.sin(e), math.cos(a) * math.cos(e))   # from the prop toward the camera, game axes
            bdir = Vector(g2b(*gdir))
            cam.location = ctr + bdir * (ext * 4 + 2)
            cam.rotation_euler = (-bdir).to_track_quat('-Z', 'Y').to_euler()
            p = os.path.join(SPEC['output'], '%s-%s.png' % (mode, v))
            sc.render.filepath = p
            bpy.ops.render.render(write_still=True)
            shots.append(rel(p))
    sheet = contact_sheet(shots, res, os.path.join(SPEC['output'], 'sheet.png'))
    RESULT['images'] = shots + ([rel(sheet)] if sheet else [])
    RESULT['summary'] = '%d views -> %s' % (len(shots), rel(SPEC['output']))


def contact_sheet(shots, res, out):
    try:
        import numpy as np
    except ImportError:
        return None
    imgs = []
    for p in shots:
        im = bpy.data.images.load(os.path.join(SPEC['gameRoot'], p))
        a = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
        imgs.append(a)
        bpy.data.images.remove(im)
    cols = len(VIEWS)
    rows = (len(imgs) + cols - 1) // cols
    sheet = np.ones((rows * res, cols * res, 4), dtype=np.float32)
    for i, a in enumerate(imgs):
        r, c = divmod(i, cols)
        sheet[(rows - 1 - r) * res:(rows - r) * res, c * res:(c + 1) * res] = a   # (Blender's pixels start at the bottom row)
    im = bpy.data.images.new('_sheet', cols * res, rows * res, alpha=True)
    im.pixels.foreach_set(sheet.ravel())
    im.filepath_raw = out
    im.file_format = 'PNG'
    im.save()
    return out


def op_script():
    import runpy
    script = SPEC['script']
    if SPEC.get('input'):
        load_input(SPEC['input'])
    sys.argv = [script] + [str(a) for a in SPEC.get('args', [])]
    sys.path.insert(0, os.path.dirname(script))
    runpy.run_path(script, run_name='__main__')
    if SPEC.get('blend'):
        out_dir(SPEC['blend'])
        bpy.ops.wm.save_as_mainfile(filepath=SPEC['blend'], compress=True)
    RESULT['summary'] = 'ran %s' % rel(script)


try:
    {'import': op_import, 'inspect': op_inspect, 'validate': op_validate, 'export': op_export, 'preview': op_preview, 'script': op_script}[SPEC['op']]()
    RESULT['ok'] = not RESULT['errors']
except Exception as e:   # noqa: BLE001 (report every failure to the bridge)
    RESULT['errors'].append('%s: %s' % (type(e).__name__, e))
    RESULT['traceback'] = traceback.format_exc()
    print('BRIDGE-FAIL', RESULT['errors'][-1])
json.dump(RESULT, open(SPEC['result'], 'w', encoding='utf-8'), indent=2)
sys.exit(0 if RESULT['ok'] else 3)
