"""Render the generated EnergyOps Blender scene and encode an MP4."""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blender", default="blender")
    parser.add_argument("--output", type=Path, default=ROOT / "outputs/video/energyops_demo.mp4")
    args = parser.parse_args()
    blend = ROOT / "outputs/video/energyops_campus.blend"
    frames = ROOT / "outputs/video/frames/frame_%04d.png"
    if not blend.exists():
        raise SystemExit(f"Missing {blend}; run create_energyops_scene.py first")
    frames.parent.mkdir(parents=True, exist_ok=True)
    render_env = os.environ.copy()
    render_env.setdefault("BLENDER_USER_CONFIG", "/tmp/energyops-blender-config")
    subprocess.run([args.blender, "--background", str(blend), "-o", str(frames), "-a"], check=True, env=render_env)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y", "-framerate", "30", "-i", str(frames),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(args.output),
    ], check=True)
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
