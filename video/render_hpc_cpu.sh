#!/usr/bin/env bash
set -euo pipefail

# Reproducible 8-core CPU render for a Linux HPC node.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export OMP_NUM_THREADS="${OMP_NUM_THREADS:-8}"
export BLENDER_USER_CONFIG="${BLENDER_USER_CONFIG:-${TMPDIR:-/tmp}/energyops-blender-config}"
BLENDER_BIN="${BLENDER_BIN:-blender}"
mkdir -p outputs/video/frames "$BLENDER_USER_CONFIG"

if command -v xvfb-run >/dev/null 2>&1; then
  BLENDER_CMD=(xvfb-run -a "$BLENDER_BIN")
else
  BLENDER_CMD=("$BLENDER_BIN")
fi

"${BLENDER_CMD[@]}" --background --python video/create_energyops_scene.py
"${BLENDER_CMD[@]}" --background outputs/video/energyops_campus.blend \
  -o outputs/video/frames/frame_ -a

ffmpeg -y -loglevel warning \
  -framerate 30 -i outputs/video/frames/frame_%04d.png \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  outputs/video/energyops_demo.mp4

echo "Rendered outputs/video/energyops_demo.mp4 with ${OMP_NUM_THREADS} CPU threads"
