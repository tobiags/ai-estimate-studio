"""Refine existing Mobup CAD assets and author three collision-free Blender settings.

Run with Blender 5.2: blender -b --factory-startup -t 2 -P this.py -- --out PATH.
Original browser assets are read-only; candidate GLBs and editable BLENDs go to out.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'apps/web/public/assets'
VARIANTS = {'p1-m1': 1.25, 'p2-m7': 2.5, 'p3-m8': 3.75, 'p4-m1-m8': 5.0}


def material(name, color, roughness=.65):
    mat = bpy.data.materials.new(name)
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat


def texture(mat, image, socket, data=False):
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = bpy.data.images.load(str(image), check_existing=True)
    node.image.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    if socket == 'Normal':
        normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
        mat.node_tree.links.new(node.outputs['Color'], normal.inputs['Color'])
        normal.inputs['Strength'].default_value = .4
        mat.node_tree.links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    else:
        mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs[socket])


def box(name, size, pos, mat, bevel=.008):
    x, y, z = (v / 2 for v in size)
    verts = [(a*x,b*y,c*z) for a,b,c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.location = pos
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new('Soft manufactured edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    uv_project(ob)
    return ob


def uv_project(ob):
    """Metric box projection, preserving vertical wood grain on each face."""
    mesh = ob.data
    layer = mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        normal = face.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        axes = (1,2) if axis == 0 else (0,2) if axis == 1 else (0,1)
        for li in face.loop_indices:
            v = mesh.vertices[mesh.loops[li].vertex_index].co
            layer.data[li].uv = (v[axes[0]], v[axes[1]])


def import_prop(name, width, pos):
    folder = ASSETS / 'models/polyhaven' / name
    source = next(folder.glob('*.gltf'))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = list(set(bpy.data.objects) - before)
    bpy.context.view_layer.update()
    meshes = [o for o in imported if o.type == 'MESH']
    if name == 'grass_medium_01':
        keep = next((o for o in meshes if 'small_a_LOD0' in o.name), meshes[0])
        imported = [o for o in imported if o == keep or o.type != 'MESH']
        for ob in meshes:
            if ob != keep:
                bpy.data.objects.remove(ob, do_unlink=True)
        meshes = [keep]
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    low = Vector(tuple(min(v[i] for v in points) for i in range(3)))
    high = Vector(tuple(max(v[i] for v in points) for i in range(3)))
    factor = width / max(high.x-low.x, high.y-low.y)
    pivot = bpy.data.objects.new('Asset_' + name, None)
    bpy.context.collection.objects.link(pivot)
    # Root nodes retain glTF axis conversion and all local child transforms.
    for ob in imported:
        if ob.parent not in imported:
            ob.parent = pivot
    pivot.scale = (factor,)*3
    pivot.location = Vector(pos) - Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z))*factor
    return meshes


def refine_studio():
    for ob in [o for o in bpy.data.objects if o.type == 'MESH']:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
        uv_project(ob)
        if 'glass' not in ob.name:
            bevel = ob.modifiers.new('Architectural edge highlights', 'BEVEL')
            bevel.width = .003
            bevel.segments = 2
            bevel.limit_method = 'ANGLE'
    for mat in bpy.data.materials:
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        if 'glass' in mat.name:
            for link in list(mat.node_tree.links):
                if link.to_node == bsdf:
                    mat.node_tree.links.remove(link)
            bsdf.inputs['Base Color'].default_value = (.8,.9,.94,1)
            bsdf.inputs['Alpha'].default_value = .32
            bsdf.inputs['Transmission Weight'].default_value = .85
            mat.surface_render_method = 'BLENDED'
            bsdf.inputs['IOR'].default_value = 1.45
            bsdf.inputs['Roughness'].default_value = .08
        elif 'cedar' in mat.name:
            bsdf.inputs['Roughness'].default_value = .68
        elif 'graphite' in mat.name:
            for link in list(mat.node_tree.links):
                if link.to_node == bsdf and link.to_socket.name in ('Base Color','Metallic','Roughness'):
                    mat.node_tree.links.remove(link)
            bsdf.inputs['Base Color'].default_value = (.028,.033,.038,1)
            bsdf.inputs['Metallic'].default_value = 0
            bsdf.inputs['Roughness'].default_value = .38


def rebuild_studio(variant, w):
    """Rebuild clean display surfaces at the source CAD envelope dimensions."""
    mats={k:next((m for m in bpy.data.materials if m.name=='mobup-'+k),None) for k in ['cedar','graphite','mineral','glass','floor']}
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob,do_unlink=True)
    def part(name,size,at,kind='cedar',bevel=.002):
        return box(name,size,at,mats[kind],bevel)
    # Same exterior silhouette and overall bounds as the CAD source. The roof
    # and walls now meet at their real surfaces instead of interpenetrating.
    part('foundation-edge',(w+.06,3.06,.12),(0,0,.02),'graphite',.01)
    part('foundation-slab',(w,3,.1),(0,0,.13),'mineral',.005)
    part('interior-floor',(w-.12,2.74,.035),(0,0,.218),'floor',.003)
    part('flat-roof',(w+.16,3.16,.18),(0,0,2.89),'graphite',.012)
    part('roof-fascia',(w+.22,3.22,.055),(0,0,2.7725),'cedar',.003)
    bottom=.18;top=2.745;h=top-bottom;z=(top+bottom)/2
    part('Rear_wall',(w-.12,.10,h),(0,1.45,z))
    part('Left_wall',(.12,3,h),(-w/2,0,z))
    part('Right_wall',(.12,3,h),(w/2,0,z))
    count=36
    for i in range(count):
        y=-1.46+i*2.92/(count-1)
        for sign in [-1,1]:
            part(f'Slat_side_{sign}_{i}',(.016,.035,h-.1),(sign*(w/2+.068),y,z),'cedar',.001)
    n=max(2,math.floor((w-.12)/.085))
    for i in range(n):
        x=-(w-.16)/2+(i+.5)*(w-.16)/n
        part(f'Slat_rear_{i}',(.035,.016,h-.1),(x,1.508,z),'cedar',.001)
    if variant in ['p1-m1','p4-m1-m8']:
        panel_w=1.19 if w>1.3 else w-.12
        x=-w/2+.06+panel_w/2
        part('front-m1',(panel_w,.10,h),(x,-1.45,z))
        n=max(2,int(panel_w/.085))
        for i in range(n):
            part(f'Slat_front_{i}',(.035,.016,h-.1),(x-panel_w/2+(i+.5)*panel_w/n,-1.508,z),'cedar',.001)
    if w>1.3:
        start=-w/2+(1.25 if variant=='p4-m1-m8' else 0)
        end=w/2-.06
        if variant!='p4-m1-m8': start+=.06
        fw=end-start;cx=(start+end)/2
        part('Frame_sill',(fw,.15,.075),(cx,-1.45,bottom+.0375),'graphite')
        part('Frame_head',(fw,.15,.075),(cx,-1.45,top-.0375),'graphite')
        inner_h=h-.15
        panel_count=3 if fw>3 else 2
        for i in range(panel_count+1):
            x=start+.035+(fw-.07)*i/panel_count
            part(f'Frame_mullion_{i}',(.07,.15,inner_h),(x,-1.45,z),'graphite')
        for i in range(panel_count):
            left=start+.07+(fw-.07)*i/panel_count
            right=start+(fw-.07)*(i+1)/panel_count
            part(f'Glass_pane_{i}',(right-left,.025,inner_h),((left+right)/2,-1.45,z),'glass',.001)
    # Footer gap between floor and panel is covered by the sill, not duplicate
    # faces. No objects from the user's open Blender session are touched.
    for kind,mat in mats.items():
        objects=[o for o in bpy.data.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
        for ob in objects:
            bpy.context.view_layer.objects.active=ob
            for mod in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
        if objects:
            bpy.ops.object.select_all(action='DESELECT')
            for ob in objects: ob.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.join()
            bpy.context.object.name='Mobup_'+kind


def lighting(width):
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    world = bpy.data.worlds.new('Daylight HDRI')
    world.use_nodes = True
    scene.world = world
    env = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(str(ASSETS / 'environments/polyhaven-lapa-1k.hdr'))
    background = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    world.node_tree.links.new(env.outputs['Color'], background.inputs['Color'])
    background.inputs['Strength'].default_value = .45
    # HDRI illuminates and reflects in glass; camera sees a quiet neutral sky.
    lightpath = world.node_tree.nodes.new('ShaderNodeLightPath')
    camera_bg = world.node_tree.nodes.new('ShaderNodeBackground')
    camera_bg.inputs['Color'].default_value = (.56,.61,.65,1)
    mix = world.node_tree.nodes.new('ShaderNodeMixShader')
    output = next(n for n in world.node_tree.nodes if n.type == 'OUTPUT_WORLD')
    world.node_tree.links.new(lightpath.outputs['Is Camera Ray'], mix.inputs[0])
    world.node_tree.links.new(background.outputs[0], mix.inputs[1])
    world.node_tree.links.new(camera_bg.outputs[0], mix.inputs[2])
    world.node_tree.links.new(mix.outputs[0], output.inputs['Surface'])
    sun = bpy.data.lights.new('Late morning sun', 'SUN')
    sun.energy = 2.2
    sun.angle = .08
    ob = bpy.data.objects.new(sun.name, sun)
    scene.collection.objects.link(ob)
    ob.rotation_euler = (.55,-.5,-.6)
    fill = bpy.data.lights.new('Window fill', 'AREA')
    fill.energy = 350
    fill.shape = 'DISK'
    fill.size = 5
    light = bpy.data.objects.new(fill.name, fill)
    scene.collection.objects.link(light)
    light.location = (0,-5,5)
    light.rotation_euler = (Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    camera = bpy.data.cameras.new('Architectural camera')
    cam = bpy.data.objects.new(camera.name, camera)
    scene.collection.objects.link(cam)
    cam.location = (width*.95+3,-10,6)
    target = Vector((width*.12,-.7,1.0))
    cam.rotation_euler = (target-cam.location).to_track_quat('-Z','Y').to_euler()
    camera.lens = 40
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = .08
    scene.cycles.max_bounces = 8
    scene.cycles.transmission_bounces = 6
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'OPTIX'
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == 'OPTIX'
        if any(d.use for d in prefs.devices):
            scene.cycles.device = 'GPU'
    except (TypeError, RuntimeError):
        scene.cycles.device = 'CPU'
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'


def environment(kind, width):
    stone = material('M_Limestone', (.47,.44,.37))
    texture(stone, ASSETS / 'materials/polyhaven/cobblestone_floor_01/cobblestone_floor_01_diff_1k.jpg', 'Base Color')
    texture(stone, ASSETS / 'materials/polyhaven/cobblestone_floor_01/cobblestone_floor_01_nor_gl_1k.jpg', 'Normal', True)
    wood = material('M_Deck_wood', (.32,.21,.12))
    texture(wood, ASSETS / 'materials/polyhaven/japanese_cedar_planks_diff_1k.jpg', 'Base Color')
    lawn = material('M_Lawn', (.105,.18,.055), .95)
    grass_texture = ASSETS / 'materials/polyhaven/grass_ground_diff_1k.jpg'
    if grass_texture.exists():
        texture(lawn, grass_texture, 'Base Color')
    box('Site', (width+7,10,.18), (0,0,-.2), lawn if kind == 'garden' else stone)
    # Front of imported glTF is Blender -Y. Everything stays outside its 3m footprint.
    for i in range(18):
        box('Deck_%02d' % i, (width+1,.095,.18), (0,-1.8-i*.1,-.015), wood, .004)
    if kind == 'poolside':
        pool_x = width/2+2.1
        water = material('M_Water', (.035,.25,.29), .12)
        bsdf = next(n for n in water.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['IOR'].default_value = 1.333
        bsdf.inputs['Transmission Weight'].default_value = .65
        box('Pool_basin', (2.8,5,.25), (pool_x,-.5,-.05), stone)
        box('Pool_water', (2.45,4.65,.04), (pool_x,-.5,.105), water, 0)
        for x in (pool_x-1.35,pool_x+1.35):
            box('Pool_long_coping', (.24,5,.12), (x,-.5,.15), stone)
        for y in (-2.9,1.9):
            box('Pool_end_coping', (2.5,.24,.12), (pool_x,y,.15), stone)
    # Real scanned assets, placed with explicit clearance from studio and pool.
    import_prop('outdoor_table_chair_set_01', 1.35, (-width/2-1.2,-2.3,-.09))
    for x,y in [(-width/2-.9,.9),(width/2+.1,2.6),(-width/2-1.1,-3.8)]:
        import_prop('potted_plant_01', .7, (x,y,-.10))
    import_prop('Lantern_01', .24, (width/2+.2,-3.3,.06))
    if kind == 'garden':
        for i in range(7):
            import_prop('grass_medium_01', .55, (-width/2-1.9+i*.7,2.2,-.1))
    elif kind == 'terrace':
        import_prop('painted_wooden_bench_1k', 1.4, (width/2+1.5,.1,-.1))


def optimize_environment():
    """Keep scanned props within the review scene's web triangle budget."""
    images = {}
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and ob.parent and ob.parent.name.startswith('Asset_') and len(ob.data.polygons) > 5000:
            mod = ob.modifiers.new('Web LOD', 'DECIMATE')
            mod.ratio = .35
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                key = bpy.path.abspath(node.image.filepath)
                if key in images:
                    node.image = images[key]
                else:
                    images[key] = node.image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--variants', nargs='+', default=list(VARIANTS))
    parser.add_argument('--environments', nargs='+', default=['garden','poolside','terrace'])
    parser.add_argument('--no-render', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    args.out.mkdir(parents=True, exist_ok=True)
    records = []
    for variant in args.variants:
        for kind in args.environments:
            bpy.ops.wm.read_factory_settings(use_empty=True)
            source = ASSETS / ('models/studio/mobup-studio-' + variant + '.glb')
            bpy.ops.import_scene.gltf(filepath=str(source))
            refine_studio()
            rebuild_studio(variant, VARIANTS[variant])
            if kind == args.environments[0]:
                studio_path = args.out / ('mobup-studio-' + variant + '.glb')
                bpy.ops.export_scene.gltf(filepath=str(studio_path), export_format='GLB', export_animations=False, export_apply=True)
            width = VARIANTS[variant]
            environment(kind, width)
            optimize_environment()
            bpy.ops.export_scene.gltf(filepath=str(args.out / ('mobup-' + variant + '-' + kind + '.glb')), export_format='GLB', export_animations=False, export_apply=True)
            lighting(width)
            stem = 'mobup-' + variant + '-' + kind
            bpy.context.view_layer.update()
            scene_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
            tris = sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene_meshes)
            for image in bpy.data.images:
                if image.users and image.source == 'FILE' and not image.packed_file:
                    image.pack()
            bpy.ops.wm.save_as_mainfile(filepath=str(args.out / (stem+'.blend')))
            if not args.no_render:
                bpy.context.scene.render.filepath = str(args.out / (stem+'.png'))
                bpy.ops.render.render(write_still=True)
            records.append({'scene':stem,'meshes':len(scene_meshes),'triangles':tris,'materials':len(bpy.data.materials),'width_m':width,'source':str(source),'blend':str(args.out/(stem+'.blend'))})
            (args.out / 'manifest.json').write_text(json.dumps(records, indent=2))
            print('SCENE_COMPLETE', stem, flush=True)


if __name__ == '__main__':
    main()
