"""Render a dependency-light 2.5D preview when Blender's headless renderer is unavailable.

The .blend scene remains the canonical 3D asset. This preview uses FFmpeg's
drawbox/drawtext filters so the data-driven video can still be inspected on a
machine where Blender cannot initialize a Metal device.
"""

from __future__ import annotations

import csv
import shlex
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
def main() -> int:
    timeline = ROOT / "outputs/video/timeline.csv"
    output = ROOT / "outputs/video/energyops_preview.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)
    with timeline.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != 24:
        raise SystemExit(f"Expected 24 rows in {timeline}, got {len(rows)}")

    filters = [
        "color=c=0x08111f:s=1280x720:r=24",
        "drawbox=x=0:y=0:w=1280:h=120:color=0x102743:t=fill",
    ]
    # Low-poly campus blocks with a shaded offset face.
    buildings = [(80, 230, 150, 110), (270, 185, 160, 155), (470, 250, 145, 90), (655, 165, 180, 175), (885, 245, 155, 95)]
    for x, y, w, h in buildings:
        filters.append(f"drawbox=x={x}:y={y}:w={w}:h={h}:color=0x334b68:t=fill")
        filters.append(f"drawbox=x={x+18}:y={y-18}:w={w}:h=18:color=0x5b7895:t=fill")
        filters.append(f"drawbox=x={x+w}:y={y-18}:w=18:h={h}:color=0x1c3048:t=fill")
        filters.append(f"drawbox=x={x+20}:y={y+16}:w={w-40}:h=9:color=0x1d76c7:t=fill")
    # Battery and substation.
    filters += [
        "drawbox=x=1080:y=260:w=110:h=150:color=0x125c64:t=fill",
        "drawbox=x=1100:y=285:w=70:h=100:color=0x24a9b1:t=fill",
        "drawbox=x=1070:y=480:w=130:h=90:color=0x8f2933:t=fill",
        "drawbox=x=1188:y=520:w=80:h=10:color=0xdf3d43:t=fill",
        "drawbox=x=1070:y=580:w=200:h=6:color=0xdf3d43:t=fill",
    ]
    # Legend and KPI bar headings.
    max_pv = max(float(r["pv_available_kw"]) for r in rows) or 1.0
    max_load = max(float(r["load_kw"]) for r in rows) or 1.0
    max_grid = max(float(r["grid_import_kw"]) for r in rows) or 1.0
    for hour, row in enumerate(rows):
        start, end = hour * 24, hour * 24 + 23
        enable = f"between(n,{start},{end})"
        pv_h = max(4, round(240 * float(row["pv_available_kw"]) / max_pv))
        load_h = max(4, round(240 * float(row["load_kw"]) / max_load))
        soc_h = max(4, round(240 * float(row["battery_soc_pct"]) / 100))
        grid_h = max(4, round(240 * float(row["grid_import_kw"]) / max_grid))
        for baseline, height, color in [(250, pv_h, "0xffc247"), (380, load_h, "0xf2f5fa"), (510, soc_h, "0x48d8ec"), (665, grid_h, "0xff5964")]:
            filters.append(f"drawbox=x=935:y={baseline - height}:w=260:h={height}:color={color}:t=fill:enable='{enable}'")
    filter_graph = ",".join(filters)
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi", "-i", filter_graph,
        "-t", "24", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ]
    print("Rendering preview with:", shlex.join(cmd[:6]), "...")
    subprocess.run(cmd, check=True)
    print(f"Wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
