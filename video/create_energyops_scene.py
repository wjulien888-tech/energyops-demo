"""Create a low-poly EnergyOps campus scene and keyframe it from timeline.csv.

Run with Blender's Python, for example:
  blender --background --python video/create_energyops_scene.py
"""

from __future__ import annotations

import csv
import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
TIMELINE = ROOT / "outputs/video/timeline.csv"
SAMPLE_TIMELINE = ROOT / "video/fixtures/timeline_sample.csv"
SITE_CONFIG = ROOT / "config/hkust_gz_site.json"
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
FLOW_PV = FLOW_BATTERY = FLOW_DISCHARGE = FLOW_GRID = WHITE = HUD_BG = None
WINDOW = CURTAIL = SUN = GRASS = WATER = BRICK = CREAM = CLOUD = CHART = LOAD_LINE = AXIS = None


def init_materials():
    global GROUND, BUILDING, ROOF, PV, BATTERY, GRID
    global FLOW_PV, FLOW_BATTERY, FLOW_DISCHARGE, FLOW_GRID, WHITE
    global HUD_BG, WINDOW, CURTAIL, SUN, GRASS, WATER, BRICK, CREAM, CLOUD, CHART, LOAD_LINE, AXIS
    GROUND = material("Ground", (0.08, 0.12, 0.10, 1))
    BUILDING = material("Building", (0.22, 0.28, 0.34, 1))
    ROOF = material("Roof", (0.28, 0.32, 0.38, 1))
    PV = material("PV", (0.03, 0.23, 0.55, 1), 0.2)
    BATTERY = material("Battery", (0.04, 0.32, 0.35, 1), 0.3)
    GRID = material("Grid", (0.75, 0.08, 0.06, 1), 0.4)
    FLOW_PV = material("FlowPV", (1.0, 0.65, 0.05, 1), 2.0)
    FLOW_BATTERY = material("FlowBattery", (0.1, 0.75, 0.95, 1), 2.0)
    FLOW_DISCHARGE = material("FlowDischarge", (0.15, 0.9, 0.35, 1), 2.0)
    FLOW_GRID = material("FlowGrid", (1.0, 0.22, 0.12, 1), 2.0)
    WHITE = material("White", (1.0, 0.94, 0.35, 1), 1.4)
    HUD_BG = material("HudBg", (0.05, 0.12, 0.09, 1), 0.15)
    WINDOW = material("Window", (0.93, 0.86, 0.55, 1), 0.8)
    CURTAIL = material("Curtail", (0.93, 0.45, 0.12, 1), 1.2)
    SUN = material("Sun", (0.98, 0.90, 0.62, 1), 1.4)
    GRASS = material("Grass", (0.45, 0.62, 0.34, 1))
    WATER = material("Water", (0.22, 0.48, 0.62, 1), 0.3)
    BRICK = material("Brick", (0.62, 0.40, 0.28, 1))
    CREAM = material("Cream", (0.90, 0.86, 0.78, 1))
    CLOUD = material("Cloud", (0.93, 0.95, 0.98, 1), 0.4)
    CHART = material("Chart", (0.95, 0.78, 0.18, 1), 0.8)
    LOAD_LINE = material("LoadLine", (0.93, 0.96, 0.93, 1), 0.7)
    AXIS = material("Axis", (0.55, 0.66, 0.58, 1), 0.15)


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
    obj.data.extrude = 0.0
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


REQUIRED_FIELDS = (
    "timestamp",
    "hour",
    "load_kw",
    "pv_available_kw",
    "pv_used_kw",
    "pv_curtailment_kw",
    "battery_charge_kw",
    "battery_discharge_kw",
    "battery_energy_kwh",
    "battery_soc_pct",
    "grid_import_kw",
    "grid_export_kw",
    "buy_price_cny_per_kwh",
)
NUMERIC_FIELDS = REQUIRED_FIELDS[1:]


def require_number(row: dict, field: str, timeline_path: Path, row_number: int) -> float:
    if field not in row or row[field] is None or str(row[field]).strip() == "":
        raise SystemExit(
            f"Refusing to fill missing {field} with 0 at data row {row_number} in {timeline_path}"
        )
    try:
        return float(row[field])
    except ValueError as exc:
        raise SystemExit(
            f"Non-numeric {field}={row[field]!r} at data row {row_number} in {timeline_path}"
        ) from exc


def load_rows():
    using_fixture = not TIMELINE.exists()
    timeline_path = SAMPLE_TIMELINE if using_fixture else TIMELINE
    if not timeline_path.exists():
        raise SystemExit(f"Missing timeline: checked {TIMELINE} then {SAMPLE_TIMELINE}")
    with timeline_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        missing = [field for field in REQUIRED_FIELDS if field not in fieldnames]
        if missing:
            raise SystemExit(
                f"{timeline_path} is missing required fields: {', '.join(missing)}. "
                "Refusing to fill them with 0."
            )
        rows = list(reader)
    if len(rows) != 24:
        raise SystemExit(f"Expected 24 hourly rows in {timeline_path}, got {len(rows)}")
    hours = []
    for index, row in enumerate(rows):
        row_number = index + 1
        timestamp = row.get("timestamp")
        if timestamp is None or str(timestamp).strip() == "":
            raise SystemExit(f"Empty timestamp at data row {row_number} in {timeline_path}")
        hour = require_number(row, "hour", timeline_path, row_number)
        if hour != index or not hour.is_integer():
            raise SystemExit(
                f"Expected hour {index} at data row {row_number} in {timeline_path}, got {row['hour']!r}"
            )
        for field in NUMERIC_FIELDS:
            if field == "hour":
                continue
            require_number(row, field, timeline_path, row_number)
        soc = float(row["battery_soc_pct"])
        if soc < 0.0 or soc > 100.0:
            raise SystemExit(
                f"battery_soc_pct out of range at hour {index} in {timeline_path}: {soc}"
            )
        hours.append(int(hour))
    if hours != list(range(24)):
        raise SystemExit(f"hour must run from 0 through 23 in {timeline_path}, got {hours}")
    print(f"timeline_source={timeline_path}")
    print("simulation_only=true")
    print("executable=false")
    if using_fixture:
        print("fixture_type=synthetic_demo")
    else:
        print("fixture_type=not_used")
        print("result_kind=dispatch_simulation")
        print("not_device_measurement=true")
        print("not_executable_control=true")
    log_path = BLEND_OUT.parent / "scene_source.log"
    os.makedirs(log_path.parent, exist_ok=True)
    log_path.write_text(
        "\n".join(
            [
                f"timeline_source={timeline_path}",
                "simulation_only=true",
                "executable=false",
                "fixture_type=synthetic_demo" if using_fixture else "fixture_type=not_used",
                "network_stability=not_connected",
                "displayed=power_balance_soc_dispatch_only",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return rows, using_fixture


def load_site_config():
    if not SITE_CONFIG.exists():
        return {"site_name": "港科广", "zones": []}
    with SITE_CONFIG.open(encoding="utf-8") as handle:
        return json.load(handle)


def insert_interp(obj, data_path: str, frame: int, mode: str):
    obj.keyframe_insert(data_path=data_path, frame=frame)
    action = obj.animation_data.action if obj.animation_data else None
    fcurves = getattr(action, "fcurves", None) if action else None
    if not fcurves:
        return
    for fcurve in fcurves:
        if fcurve.data_path == data_path and fcurve.keyframe_points:
            fcurve.keyframe_points[-1].interpolation = mode


def insert_constant(obj, data_path: str, frame: int):
    insert_interp(obj, data_path, frame, "CONSTANT")


def sphere(name: str, mat, radius: float = 0.16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=radius, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def sky_color(hour: int) -> tuple[float, float, float]:
    if hour <= 5 or hour >= 20:
        return (0.012, 0.02, 0.045)
    if hour <= 7:
        return (0.18, 0.08, 0.06)
    if hour <= 16:
        return (0.22, 0.38, 0.58)
    return (0.28, 0.09, 0.05)


def move_beads(beads, start: Vector, end: Vector, power: float, phase: float, frame: int):
    active = power > 1.0
    amp = 0.25 + min(power / 3200.0, 1.0) * 1.15
    for index, bead in enumerate(beads):
        sample = (phase + index / len(beads)) % 1.0
        bead.location = start.lerp(end, sample)
        size = amp if active else 0.02
        bead.scale = (size, size, size)
        bead.hide_render = not active
        insert_interp(bead, "location", frame, "LINEAR")
        insert_interp(bead, "scale", frame, "LINEAR")
        insert_constant(bead, "hide_render", frame)


def main():
    rows, using_fixture = load_rows()
    site = load_site_config()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    init_materials()
    scene = bpy.context.scene
    # Workbench is intentionally used for the first reproducible preview: it is
    # CPU-safe on headless machines and keeps the low-poly materials readable.
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    shading = scene.display.shading
    shading.show_shadows = False
    if hasattr(shading, "show_cavity"):
        shading.show_cavity = True
    world = bpy.data.worlds.new("Sky")
    scene.world = world
    world.color = sky_color(0)
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = len(rows) * 30
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(ROOT / "outputs/video/frames/frame_")
    scene.render.threads_mode = "FIXED"
    scene.render.threads = int(os.environ.get("OMP_NUM_THREADS", "8"))

    cube("CampusGround", (0, 0, -0.35), (18, 13, 0.18), GRASS)
    cube("Canal", (0, 0.2, -0.12), (12.2, 0.62, 0.08), WATER)
    cube("Walkway", (0, 0.2, -0.18), (12.6, 0.16, 0.02), CREAM)
    cube("SouthPath", (0, -8.4, -0.18), (8.5, 0.18, 0.02), CREAM)
    cube("EntryPlaza", (0, -6.2, -0.14), (4.2, 1.6, 0.05), CREAM)
    wings = [(-6.2, 2.4), (-2.1, 2.4), (2.1, 2.4), (6.2, 2.4)]
    for idx, (x, y) in enumerate(wings, 1):
        cube(f"Wing_{idx}", (x, y, 1.15), (1.55, 3.3, 1.15), BRICK)
        cube(f"Roof_{idx}", (x, y, 2.38), (1.7, 3.45, 0.08), CREAM)
        cube(f"Window_{idx}_a", (x, y - 3.36, 0.85), (1.15, 0.04, 0.16), WINDOW)
        cube(f"Window_{idx}_b", (x, y - 3.36, 1.55), (1.15, 0.04, 0.16), WINDOW)
        for step, py in enumerate((-1.6, -0.4, 0.8, 2.0)):
            cube(f"PV_Wing{idx}_{step}", (x, y + py, 2.52), (1.15, 0.42, 0.025), PV)
    cube("Hub", (0, 2.4, 0.55), (8.4, 0.7, 0.55), CREAM)
    cube("Library", (0, 5.8, 0.85), (3.4, 1.15, 0.85), CREAM)
    for step, px in enumerate((-1.1, 0.0, 1.1)):
        cube(f"PV_Library_{step}", (px, 5.8, 1.78), (0.85, 0.85, 0.025), PV)
    cube("Admin", (0, -6.2, 1.35), (2.4, 1.15, 1.35), BRICK)
    cube("AdminRoof", (0, -6.2, 2.78), (2.6, 1.3, 0.08), CREAM)
    cube("PV_Admin_0", (-0.55, -6.2, 2.92), (0.7, 0.85, 0.025), PV)
    cube("PV_Admin_1", (0.55, -6.2, 2.92), (0.7, 0.85, 0.025), PV)
    # Replace generic demo blocks with named HKUST(GZ) zones from the user map.
    for obj in bpy.data.objects:
        if obj.name.startswith(("Wing_", "Roof_", "Window_", "PV_Wing", "Hub", "Library", "PV_Library", "Admin", "PV_Admin")):
            obj.hide_render = True
    boundary = site.get("campus_boundary", {"width": 36.0, "depth": 30.0})
    bpy.data.objects["CampusGround"].scale.x = float(boundary["width"]) / 36.0
    bpy.data.objects["CampusGround"].scale.y = float(boundary["depth"]) / 26.0
    for zone in site.get("zones", []):
        if zone.get("type") == "public_realm":
            continue
        x, y = float(zone["x"]), float(zone["y"])
        width, depth = float(zone["width"]), float(zone["depth"])
        total_height = max(0.35, float(zone["height"]))
        half_height = total_height / 2.0
        building = cube(f"Zone_{zone['id']}", (x, y, half_height), (width / 2, depth / 2, half_height), BUILDING, 0.12)
        building["zone_id"] = zone["id"]
        building["source_confidence"] = zone.get("confidence", "unknown")
        roof = cube(f"Roof_{zone['id']}", (x, y, total_height + 0.08), (width / 2 + 0.08, depth / 2 + 0.08, 0.08), ROOF)
        roof["zone_id"] = zone["id"]
        panel_count = max(2, min(6, int(width // 1.6)))
        for panel_index in range(panel_count):
            px = x - width / 2 + (panel_index + 0.5) * width / panel_count
            panel = cube(f"PV_{zone['id']}_{panel_index}", (px, y, total_height + 0.24), (width / panel_count * 0.36, depth * 0.34, 0.03), PV)
            panel.rotation_euler[2] = math.radians(8)
        label = text(f"ZoneLabel_{zone['id']}", zone["name_zh"], (x, y, total_height + 0.55), 0.25)
        label["zone_id"] = zone["id"]
    high_street = next((z for z in site.get("zones", []) if z.get("id") == "high_street"), None)
    if high_street:
        cube("HighStreet", (float(high_street["x"]), float(high_street["y"]), 0.02), (float(high_street["width"]) / 2, float(high_street["depth"]) / 2, 0.02), FLOW_BATTERY)
    cube("FirebirdMark", (0, -8.0, 0.45), (0.18, 0.18, 0.45), CURTAIL)
    for idx, (x, y) in enumerate(((-4.5, -1.6), (4.5, -1.6), (-7.5, -3.5), (7.5, 6.5)), 1):
        cube(f"TreeTrunk_{idx}", (x, y, 0.45), (0.08, 0.08, 0.45), BRICK)
        sphere(f"TreeCrown_{idx}", GRASS, 0.55).location = (x, y, 1.25)
    carport_parts = []
    for idx, x in enumerate((-5.2, 0.0, 5.2)):
        for side in (-0.85, 0.85):
            carport_parts.append(
                cube(f"CarportPost_{idx}_{side}", (x + side, -8.5, 0.62), (0.07, 0.07, 0.62), CREAM)
            )
        carport_parts.append(cube(f"PV_Carport_{idx}", (x, -8.5, 1.32), (1.7, 1.25, 0.04), PV))
    arcade_parts = []
    for idx, x in enumerate((-8.0, -4.15, 0.0, 4.15, 8.0)):
        arcade_parts.append(cube(f"ArcadePost_{idx}", (x, 0.2, 1.45), (0.08, 0.08, 1.45), CREAM))
    arcade_parts.append(cube("PV_Arcade_Span", (0, 0.2, 2.98), (8.6, 0.72, 0.045), PV))
    energy_zone = next((z for z in site.get("zones", []) if z.get("id") == "energy_center"), {"x": 10.2, "y": 4.8})
    energy_x, energy_y = float(energy_zone["x"]), float(energy_zone["y"])
    battery = cube("BatteryStorage", (energy_x, energy_y, 0.85), (0.7, 0.45, 0.85), BATTERY, 0.04)
    soc_bar = cube("BatterySOC", (energy_x, energy_y - 0.65, 0.15), (0.12, 0.05, 0.15), FLOW_BATTERY)
    curtail_tower = cube("CurtailTower", (energy_x - 1.8, energy_y, 0.12), (0.28, 0.28, 0.12), CURTAIL)
    substation = cube("EnergyCenter", (energy_x, energy_y, 0.7), (0.85, 0.7, 0.7), GRID, 0.04)
    grid_point = Vector((energy_x + 2.6, energy_y, 1.3))
    battery_point = Vector((energy_x, energy_y, 0.9))
    substation_point = Vector((energy_x, energy_y, 0.8))
    load_point = Vector((0, 2.2, 1.1))
    pv_point = Vector((0, 2.4, 2.7))
    cube("GridConnection", (12.8, 4.8, 1.5), (0.1, 0.1, 1.5), GRID)
    cube("GridArm", (12.8, 4.8, 2.85), (0.7, 0.05, 0.05), FLOW_GRID)
    sun_orb = sphere("SunOrb", SUN, 0.85)
    moon = sphere("Moon", CLOUD, 0.72)
    moon.location = (-9.2, 5.2, 8.2)
    moon_cut = sphere("MoonCut", HUD_BG, 0.58)
    moon_cut.location = (-8.65, 5.45, 8.45)
    crescent = moon.modifiers.new("Crescent", "BOOLEAN")
    crescent.operation = "DIFFERENCE"
    crescent.object = moon_cut
    crescent.solver = "EXACT"
    bpy.context.view_layer.objects.active = moon
    bpy.ops.object.modifier_apply(modifier=crescent.name)
    bpy.data.objects.remove(moon_cut, do_unlink=True)
    for idx, (x, y, z) in enumerate(((-7.2, 2.4, 7.4), (1.5, 6.6, 8.0), (8.4, 3.2, 7.1))):
        for puff, (dx, dy, dz, radius) in enumerate(
            ((0.0, 0.0, 0.0, 0.72), (0.75, 0.15, 0.08, 0.52), (-0.62, 0.22, -0.04, 0.46))
        ):
            cloud = sphere(f"Cloud_{idx}_{puff}", CLOUD, radius)
            cloud.location = (x + dx, y + dy, z + dz)
    cylinder_flow("GridCable", substation_point, grid_point, FLOW_GRID, 0.10)
    cylinder_flow("PVTrunk", pv_point, load_point, FLOW_PV, 0.08)
    cylinder_flow("BatteryCable", battery_point, load_point, FLOW_BATTERY, 0.08)
    if using_fixture:
        disclaimer = (
            "SIMULATION ONLY | executable=false | fixture_type=synthetic_demo | NOT DEVICE CONTROL"
        )
    else:
        disclaimer = (
            "SIMULATION ONLY | executable=false | DISPATCH RESULT ONLY | NOT DEVICE CONTROL"
        )
    bpy.ops.object.camera_add(location=(26, -26, 18))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 34
    scene.camera = camera
    target = Vector((-1.2, 0.0, 1.4))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.keyframe_insert(data_path="location", frame=1)
    camera.keyframe_insert(data_path="rotation_euler", frame=1)

    def hud_bar(name: str, location: tuple[float, float, float], scale: tuple[float, float, float]):
        bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
        obj = bpy.context.object
        obj.name = name
        obj.parent = camera
        obj.location = location
        obj.scale = scale
        obj.data.materials.append(HUD_BG)
        return obj

    def overlay(name: str, body: str, location: tuple[float, float, float], size: float):
        obj = text(name, body, (0, 0, 0), size)
        obj.parent = camera
        obj.location = location
        obj.rotation_euler = (0.0, 0.0, 0.0)
        return obj

    hud_bar("TitleBar", (0.0, 7.6, -12), (6.2, 0.55, 0.04))
    hud_bar("StatusBar", (-2.2, -7.15, -12), (8.4, 1.15, 0.04))
    hud_bar("DayChart", (9.2, 0.6, -12), (3.3, 3.4, 0.04))
    overlay("Title", f"{site.get('site_name', '港科广')} · 三版光伏布局", (0.0, 7.55, -11.2), 0.42)
    overlay("Disclaimer", disclaimer, (-2.2, -7.85, -11.2), 0.22)
    max_signal = max(
        max(float(r["pv_available_kw"]) for r in rows),
        max(float(r["load_kw"]) for r in rows),
        1.0,
    )
    overlay("ChartNote", "同一演示时间轴    白线负荷    黄虚线光伏可用", (9.15, 3.05, -11.05), 0.2)

    def chart_point(hour: int, value: float) -> tuple[float, float]:
        return (6.55 + hour * 0.23, -0.95 + 2.7 * value / max_signal)

    def ribbon(name: str, segments: list[tuple[tuple[float, float], tuple[float, float]]], mat, width: float, z: float):
        verts = []
        faces = []
        for (x0, y0), (x1, y1) in segments:
            dx, dy = x1 - x0, y1 - y0
            length = math.hypot(dx, dy) or 1.0
            nx, ny = -dy / length * width, dx / length * width
            base = len(verts)
            verts.extend(
                (
                    (x0 + nx, y0 + ny, 0.0),
                    (x0 - nx, y0 - ny, 0.0),
                    (x1 - nx, y1 - ny, 0.0),
                    (x1 + nx, y1 + ny, 0.0),
                )
            )
            faces.append((base, base + 1, base + 2, base + 3))
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(mat)
        obj.parent = camera
        obj.location = (0.0, 0.0, z)
        return obj

    def solid_segments(values: list[float]):
        points = [chart_point(hour, value) for hour, value in enumerate(values)]
        return [(points[index], points[index + 1]) for index in range(len(points) - 1)]

    def dashed_segments(values: list[float]):
        points = [chart_point(hour, value) for hour, value in enumerate(values)]
        segments = []
        for index in range(len(points) - 1):
            x0, y0 = points[index]
            x1, y1 = points[index + 1]
            segments.append(((x0, y0), (x0 + (x1 - x0) * 0.62, y0 + (y1 - y0) * 0.62)))
        return segments

    ribbon("AxisBaseline", [((6.55, -0.95), (11.84, -0.95))], AXIS, 0.012, -11.2)
    for tick_hour in (0, 6, 12, 18, 23):
        tick_x, _tick_y = chart_point(tick_hour, 0.0)
        ribbon(f"Grid_{tick_hour}", [((tick_x, -0.95), (tick_x, -0.78))], AXIS, 0.01, -11.2)
        overlay(f"Tick_{tick_hour:02d}", f"{tick_hour:02d}", (tick_x, -1.28, -11.05), 0.16)
    ribbon("LoadLine", solid_segments([float(r["load_kw"]) for r in rows]), LOAD_LINE, 0.028, -11.12)
    ribbon("PvLine", dashed_segments([float(r["pv_available_kw"]) for r in rows]), CHART, 0.026, -11.1)
    playhead = cube("Playhead", (0, 0, 0), (0.018, 1.35, 0.01), CURTAIL)
    playhead.parent = camera
    playhead.rotation_euler = (0.0, 0.0, 0.0)
    pv_beads = [sphere(f"PvBead_{i}", FLOW_PV, 0.11) for i in range(3)]
    curtail_beads = [sphere(f"CurtailBead_{i}", CURTAIL, 0.1) for i in range(3)]
    discharge_beads = [sphere(f"DischargeBead_{i}", FLOW_DISCHARGE, 0.11) for i in range(3)]
    charge_beads = [sphere(f"ChargeBead_{i}", FLOW_BATTERY, 0.11) for i in range(3)]
    grid_beads = [sphere(f"GridBead_{i}", FLOW_GRID, 0.11) for i in range(3)]
    used_series = []
    curtail_series = []
    charge_series = []
    discharge_series = []
    grid_series = []

    for hour, row in enumerate(rows):
        frame = hour * 30 + 1
        pv = float(row["pv_available_kw"])
        pv_used = float(row["pv_used_kw"])
        curtail = float(row["pv_curtailment_kw"])
        load = float(row["load_kw"])
        charge = float(row["battery_charge_kw"])
        discharge = float(row["battery_discharge_kw"])
        grid_import = float(row["grid_import_kw"])
        price = float(row["buy_price_cny_per_kwh"])
        soc = float(row["battery_soc_pct"])
        used_series.append(pv_used)
        curtail_series.append(curtail)
        charge_series.append(charge)
        discharge_series.append(discharge)
        grid_series.append(grid_import)
        pv_scale = 1.0 + min(pv / 5500.0, 1.0) * 0.45
        for obj in bpy.data.objects:
            if obj.name.startswith("PV_"):
                obj.scale.z = pv_scale
                insert_constant(obj, "scale", frame)
            elif obj.name.startswith("Window_"):
                obj.scale.x = 0.55 + min(load / 2863.0, 1.0) * 0.9
                insert_constant(obj, "scale", frame)
        PV.diffuse_color = (
            0.02 + min(pv / 5500.0, 1.0) * 0.15,
            0.12 + min(pv / 5500.0, 1.0) * 0.55,
            0.35 + min(pv / 5500.0, 1.0) * 0.65,
            1,
        )
        PV.keyframe_insert(data_path="diffuse_color", frame=frame)
        soc_height = 0.35 + soc / 100.0 * 2.4
        soc_bar.scale.z = soc_height / 0.4
        soc_bar.location.z = soc_height / 2
        insert_constant(soc_bar, "scale", frame)
        insert_constant(soc_bar, "location", frame)
        curtail_width = 0.55 + min(curtail / 3000.0, 1.0) * 2.4
        curtail_tower.scale.x = curtail_width / 0.56
        curtail_tower.scale.z = 0.7
        curtail_tower.location.z = 0.18
        insert_constant(curtail_tower, "scale", frame)
        insert_constant(curtail_tower, "location", frame)
        world.color = sky_color(hour)
        world.keyframe_insert(data_path="color", frame=frame)
        if 6 <= hour <= 18:
            arc = (hour - 6) / 12.0 * math.pi
            sun_orb.location = (math.cos(arc) * 18, -8, 1.2 + math.sin(arc) * 11)
            sun_orb.hide_render = False
        else:
            sun_orb.location = (0, -8, -4)
            sun_orb.hide_render = True
        insert_constant(sun_orb, "location", frame)
        insert_constant(sun_orb, "hide_render", frame)
        if hour < 8:
            design = "A 屋顶光伏"
        elif hour < 16:
            design = "B 屋顶+车棚"
        else:
            design = "C 屋顶+车棚+连廊"
        for obj in carport_parts:
            obj.hide_render = hour < 8
            insert_constant(obj, "hide_render", frame)
        for obj in arcade_parts:
            obj.hide_render = hour < 16
            insert_constant(obj, "hide_render", frame)
        moon.hide_render = 7 <= hour <= 17
        insert_constant(moon, "hide_render", frame)
        playhead.location = (6.55 + hour * 0.23, 0.4, -11.02)
        insert_constant(playhead, "location", frame)
        callout = overlay(
            f"ChartCallout_{hour:02d}",
            f"{hour:02d}:00  可用 {pv:,.0f}  负荷 {load:,.0f}  弃光 {curtail:,.0f} kW",
            (9.15, 2.52, -11.02),
            0.18,
        )
        label = overlay(
            f"DispatchLabel_{hour:02d}",
            (
                f"{design}   {row['timestamp'][:13]}   负荷 {load:,.0f}   光伏 {pv_used:,.0f}   "
                f"SOC {soc:,.1f}%   电网 {grid_import:,.0f} kW"
            ),
            (-2.2, -6.55, -11.2),
            0.30,
        )
        result = overlay(
            f"ResultLabel_{hour:02d}",
            (
                f"弃光 {curtail:,.0f} kW   电价 {price:.3f}   "
                f"充电 {charge:,.0f}   放电 {discharge:,.0f} kW"
            ),
            (-2.2, -7.25, -11.2),
            0.26,
        )
        for item in (label, result, callout):
            item.hide_render = True
            insert_constant(item, "hide_render", 1)
            item.hide_render = False
            insert_constant(item, "hide_render", frame)
            item.hide_render = True
            insert_constant(item, "hide_render", frame + 30)
        for name, value in (
            ("PVTrunk", pv_used),
            ("BatteryCable", max(charge, discharge)),
            ("GridCable", grid_import),
        ):
            obj = bpy.data.objects.get(name)
            if obj:
                obj.scale.x = obj.scale.y = 0.55 + min(value / 3000.0, 1.0) * 1.8
                insert_constant(obj, "scale", frame)

    curtail_base = pv_point + Vector((1.4, 0.0, 0.4))
    for frame in range(1, scene.frame_end + 1, 3):
        hour = min((frame - 1) // 30, 23)
        phase = ((frame - 1) % 30) / 30.0
        move_beads(pv_beads, pv_point, load_point, used_series[hour], phase, frame)
        move_beads(
            curtail_beads,
            curtail_base,
            curtail_base + Vector((0.0, 0.0, 4.5)),
            curtail_series[hour],
            phase,
            frame,
        )
        move_beads(discharge_beads, battery_point, load_point, discharge_series[hour], phase, frame)
        move_beads(charge_beads, load_point, battery_point, charge_series[hour], phase, frame)
        move_beads(grid_beads, grid_point, substation_point, grid_series[hour], phase, frame)

    camera.location = (24, -22, 17)
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
