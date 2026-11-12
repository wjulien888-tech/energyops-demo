#!/usr/bin/env bash
set -euo pipefail

# Reproducible 8-core CPU render for a Linux HPC node.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export OMP_NUM_THREADS="${OMP_NUM_THREADS:-8}"
export OPENBLAS_NUM_THREADS="${OPENBLAS_NUM_THREADS:-8}"
export MKL_NUM_THREADS="${MKL_NUM_THREADS:-8}"
export BLIS_NUM_THREADS="${BLIS_NUM_THREADS:-8}"
export BLENDER_USER_CONFIG="${BLENDER_USER_CONFIG:-${TMPDIR:-/tmp}/energyops-blender-config}"
export LIBGL_ALWAYS_SOFTWARE="${LIBGL_ALWAYS_SOFTWARE:-1}"
export GALLIUM_DRIVER="${GALLIUM_DRIVER:-llvmpipe}"
BLENDER_BIN="${BLENDER_BIN:-blender}"

if command -v module >/dev/null 2>&1; then
  module load blender 2>/dev/null || true
  module load ffmpeg 2>/dev/null || true
  module load Xvfb 2>/dev/null || true
fi

mkdir -p outputs/video/frames "$BLENDER_USER_CONFIG" /tmp/energyops-test

if command -v xvfb-run >/dev/null 2>&1; then
  BLENDER_CMD=(xvfb-run -a "$BLENDER_BIN")
  echo "xvfb=yes"
else
  BLENDER_CMD=("$BLENDER_BIN")
  echo "xvfb=no"
fi

echo "cpu_threads=${OMP_NUM_THREADS}"
"${BLENDER_CMD[@]}" --background --python video/create_energyops_scene.py

if ! "${BLENDER_CMD[@]}" --background outputs/video/energyops_campus.blend \
  -o /tmp/energyops-test/frame_ -f 1; then
  echo "Blender single-frame render failed."
  echo "If this is a missing graphics context, install Xvfb or use a node with graphics support."
  echo "Next command: xvfb-run -a ${BLENDER_BIN} --background outputs/video/energyops_campus.blend -o /tmp/energyops-test/frame_ -f 1"
  exit 1
fi
ls -lh /tmp/energyops-test

"${BLENDER_CMD[@]}" --background outputs/video/energyops_campus.blend \
  -o outputs/video/frames/frame_ -a

frame_count="$(find outputs/video/frames -name 'frame_*.png' | wc -l)"
echo "png_frame_count=${frame_count}"

if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q 'libx264'; then
  VCODEC="libx264"
else
  VCODEC="$(ffmpeg -hide_banner -encoders 2>/dev/null | awk '/^ V/ && /264/ { print $2; exit }')"
fi
if [[ -z "${VCODEC}" ]]; then
  echo "FFmpeg has no H.264 encoder. Check: ffmpeg -encoders | grep 264"
  exit 1
fi
echo "video_codec=${VCODEC}"

ffmpeg -y -loglevel warning \
  -framerate 30 -i outputs/video/frames/frame_%04d.png \
  -c:v "${VCODEC}" -pix_fmt yuv420p -movflags +faststart \
  outputs/video/energyops_demo.mp4

echo "Rendered outputs/video/energyops_demo.mp4 with ${OMP_NUM_THREADS} CPU threads"
