"""Convert downloaded USD visual assets to bounded web GLBs in background Blender."""
import bpy
import sys
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/simready-web'
OUT.mkdir(exist_ok=True)
records = []
for asset in sys.argv[sys.argv.index('--')+1:]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = ROOT / f'outputs/simready-source/{asset}/simready_usd/sm_{asset}_01.usd'
    bpy.ops.wm.usd_import(filepath=str(source), import_cameras=False, import_lights=False)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    assert meshes, f'No geometry in {asset}'
    bpy.context.view_layer.update()
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    low = Vector([min(p[i] for p in points) for i in range(3)])
    high = Vector([max(p[i] for p in points) for i in range(3)])
    assert .1 < max(high-low) < 5, f'Unexpected units: {high-low}'
    offset = Vector((-(low.x+high.x)/2, -(low.y+high.y)/2, -low.z))
    for ob in list(bpy.data.objects):
        if not ob.parent:
            ob.location += offset
    bpy.context.view_layer.update()
    # USD imports collection instances plus a hidden prototype. Export exactly
    # one visual mesh, not both the instance and its prototype at the same place.
    for ob in meshes:
        matrix = ob.matrix_world.copy()
        ob.parent = None
        for collection in list(ob.users_collection):
            collection.objects.unlink(ob)
        bpy.context.scene.collection.objects.link(ob)
        ob.matrix_world = matrix
        ob.hide_render = False
        ob.hide_viewport = False
        ob.hide_set(False)
    for ob in list(bpy.data.objects):
        if ob.type != 'MESH':
            bpy.data.objects.remove(ob, do_unlink=True)
    for image in bpy.data.images:
        if image.type == 'IMAGE' and max(image.size) > 1024:
            factor = 1024/max(image.size)
            image.scale(max(1,round(image.size[0]*factor)), max(1,round(image.size[1]*factor)))
    tris = 0
    for ob in meshes:
        bpy.context.view_layer.objects.active = ob
        if len(ob.data.polygons) > 18000:
            modifier = ob.modifiers.new('Web LOD', 'DECIMATE')
            modifier.ratio = 18000/len(ob.data.polygons)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        ob.data.calc_loop_triangles()
        tris += len(ob.data.loop_triangles)
    target = OUT / (asset + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_animations=False, export_apply=True, export_image_format='JPEG', export_jpeg_quality=85)
    for image in bpy.data.images:
        if image.type == 'IMAGE' and not image.packed_file:
            image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / (asset+'.blend')))
    records.append({'asset':asset,'dimensions_m':list(high-low),'triangles':tris,'bytes':target.stat().st_size,'materials':len(bpy.data.materials),'textures':len([i for i in bpy.data.images if i.type=='IMAGE'])})
    (OUT/'manifest.json').write_text(json.dumps(records,indent=2))
    print('CONVERTED', records[-1], flush=True)
