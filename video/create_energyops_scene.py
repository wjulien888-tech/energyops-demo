"""Create a low-poly EnergyOps campus scene and keyframe it from timeline.csv.

Run with Blender's Python, for example:
  blender --background --python video/create_energyops_scene.py
"""

from __future__ import annotations

import csv
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
TIMELINE = ROOT / "outputs/video/timeline.csv"
BLEND_OUT = ROOT / "outputs/video/energyops_campus.blend"


def material(name: str, color: tuple[float, float, float, float], emission: float = 0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = 0.7
        if emission:
            bsdf.inputs["Emission Color"].default_value = color
            bsdf.inputs["Emission Strength"].default_value = emission
    return mat


GROUND = BUILDING = ROOF = PV = BATTERY = GRID = None
FLOW_PV = FLOW_BATTERY = FLOW_DISCHARGE = FLOW_GRID = WHITE = None


def init_materials():
    global GROUND, BUILDING, ROOF, PV, BATTERY, GRID
    global FLOW_PV, FLOW_BATTERY, FLOW_DISCHARGE, FLOW_GRID, WHITE
    GROUND = material("Ground", (0.08, 0.12, 0.10, 1))
    BUILDING = material("Building", (0.22, 0.28, 0.34, 1))
    ROOF = material("Roof", (0.28, 0.32, 0.38, 1))
    PV = material("PV", (0.03, 0.23, 0.55, 1), 0.2)
    BATTERY = material("Battery", (0.04, 0.32, 0.35, 1), 0.3)
    GRID = material("Grid", (0.75, 0.08, 0.06, 1), 0.4)
    FLOW_PV = material("FlowPV", (1.0, 0.65, 0.05, 1), 2.0)
    FLOW_BATTERY = material("FlowBattery", (0.1, 0.75, 0.95, 1), 2.0)
    FLOW_DISCHARGE = material("FlowDischarge", (0.15, 0.9, 0.35, 1), 2.0)
    FLOW_GRID = material("FlowGrid", (1.0, 0.08, 0.04, 1), 2.0)
    WHITE = material("White", (0.95, 0.98, 1.0, 1), 0.2)


def cube(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], mat, bevel: float = 0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("SoftEdges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def text(name: str, body: str, location: tuple[float, float, float], size: float = 0.35):
    bpy.ops.object.text_add(location=location, rotation=(math.radians(70), 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.01
    obj.data.materials.append(WHITE)
    return obj


def cylinder_flow(name: str, start: Vector, end: Vector, mat, radius: float = 0.06):
    direction = end - start
    mid = (start + end) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=direction.length, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return obj


def load_rows():
    with TIMELINE.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main():
    rows = load_rows()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    init_materials()
    scene = bpy.context.scene
    # Workbench is intentionally used for the first reproducible preview: it is
    # CPU-safe on headless machines and keeps the low-poly materials readable.
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 50
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = len(rows) * 30
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(ROOT / "outputs/video/frames/frame_")

    cube("CampusGround", (0, 0, -0.25), (14, 9, 0.25), GROUND)
    positions = [(-9, -4, 1.2), (-3, -4, 1.5), (4, -4, 1.0), (-8, 2, 1.7), (-1, 2, 1.1), (6, 2, 1.4), (0, 6, 0.9)]
    for idx, (x, y, h) in enumerate(positions, 1):
        cube(f"Building_{idx}", (x, y, h), (1.8, 1.5, h), BUILDING, 0.08)
        cube(f"Roof_{idx}", (x, y, h * 2 + 0.08), (1.85, 1.55, 0.08), ROOF)
        for px in (-1.0, 0.0, 1.0):
            panel = cube(f"PV_{idx}_{px}", (x + px, y, h * 2 + 0.22), (0.42, 0.85, 0.03), PV)
            panel.rotation_euler[2] = math.radians(8)

    battery = cube("BatteryStorage", (10, -1, 1.4), (1.0, 1.2, 1.4), BATTERY, 0.12)
    soc_bar = cube("BatterySOC", (10, -2.25, 1.4), (0.22, 0.08, 1.2), FLOW_BATTERY)
    substation = cube("Substation", (10, 5, 1.2), (1.1, 1.1, 1.2), GRID, 0.12)
    grid_point = Vector((13, 5, 1.2))
    battery_point = Vector((10, -1, 1.4))
    substation_point = Vector((10, 5, 1.2))
    load_point = Vector((0, 0, 0.5))
    pv_point = Vector((0, 2, 3.0))
    cylinder_flow("GridCable", substation_point, grid_point, FLOW_GRID, 0.10)
    cylinder_flow("PVTrunk", pv_point, load_point, FLOW_PV, 0.08)
    cylinder_flow("BatteryCable", battery_point, load_point, FLOW_BATTERY, 0.08)
    text("Disclaimer", "SIMPLIFIED CAMPUS MODEL | SIMULATION ONLY | NOT DEVICE CONTROL", (0, -8.2, 0.1), 0.32)
    title = text("Title", "EnergyOps Campus Dispatch", (0, 8.1, 0.1), 0.6)

    for hour, row in enumerate(rows):
        frame = hour * 30 + 1
        pv = float(row["pv_available_kw"])
        load = float(row["load_kw"])
        charge = float(row["battery_charge_kw"])
        discharge = float(row["battery_discharge_kw"])
        grid_import = float(row["grid_import_kw"])
        soc = max(0.0, min(100.0, float(row["battery_soc_pct"])))
        # Scale visual intensity only; displayed values remain real.
        for obj in bpy.data.objects:
            if obj.name.startswith("PV_"):
                obj.scale.z = 1.0 + min(pv / 5500.0, 1.0) * 0.25
        soc_bar.scale.z = max(0.05, soc / 100.0 * 1.2)
        soc_bar.keyframe_insert(data_path="scale", frame=frame)
        label = text(
            f"DispatchLabel_{hour:02d}",
            f"{row['timestamp'][:13]} | Load {load:,.0f} kW | PV {pv:,.0f} kW | SOC {soc:,.0f}% | Grid {grid_import:,.0f} kW",
            (0, -7.6, 0.1),
            0.38,
        )
        label.hide_render = True
        label.keyframe_insert(data_path="hide_render", frame=1)
        label.hide_render = False
        label.keyframe_insert(data_path="hide_render", frame=frame)
        label.hide_render = True
        label.keyframe_insert(data_path="hide_render", frame=min(frame + 29, scene.frame_end))
        # Emphasize the active flow by scaling the cable rather than creating particles.
        for name, value in (("PVTrunk", pv), ("BatteryCable", max(charge, discharge)), ("GridCable", grid_import)):
            obj = bpy.data.objects.get(name)
            if obj:
                obj.scale.x = obj.scale.y = 0.7 + min(value / 3000.0, 1.0) * 1.3
                obj.keyframe_insert(data_path="scale", frame=frame)

    bpy.ops.object.camera_add(location=(22, -24, 22))
    camera = bpy.context.object
    camera.data.lens = 48
    scene.camera = camera
    target = Vector((0, 0, 1.0))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.keyframe_insert(data_path="location", frame=1)
    camera.keyframe_insert(data_path="rotation_euler", frame=1)
    camera.location = (20, 18, 18)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.keyframe_insert(data_path="location", frame=scene.frame_end)
    camera.keyframe_insert(data_path="rotation_euler", frame=scene.frame_end)

    bpy.ops.object.light_add(type="AREA", location=(0, 0, 24))
    light = bpy.context.object
    light.data.energy = 2500
    light.data.shape = "DISK"
    light.data.size = 20
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 12))
    sun = bpy.context.object
    sun.data.energy = 2.0
    os.makedirs(BLEND_OUT.parent, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))
    print(f"Saved {BLEND_OUT}")


if __name__ == "__main__":
    main()
