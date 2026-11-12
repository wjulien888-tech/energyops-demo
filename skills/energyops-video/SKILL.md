---
name: energyops-video
description: Build or update the EnergyOps campus dispatch demonstration video from verified local simulation outputs, including a timeline CSV, a reproducible Blender campus scene, and a video preview.
---

# EnergyOps video workflow

Use this skill only for the EnergyOps repository at `/Users/zoe/Documents/ChatGPT/energyops` or a compatible checkout.

## Source of truth

Reuse verified outputs; do not rerun or replace the optimizer unless the user explicitly requests a new scenario. The default scenario is:

- `outputs/hkust_gz_stage_b/scenarios/roof_only_10350kwp/medium_150kw_400kwh/schedule_economic.json`
- matching `verification_economic.json`

Export the 24 hourly points with `scripts/export_video_timeline.py`. Preserve schedule IDs, Evidence IDs, input hashes, `simulation_only=true`, and `executable=false` in the metadata.

## Scene and rendering

Use `video/create_energyops_scene.py` to create a low-poly campus with buildings, roof PV, battery storage, a substation, grid connection, and a camera animation. Use `video/render_energyops_animation.py` when Blender headless rendering is available. If the machine cannot initialize its GPU/Metal backend, keep the `.blend` file and use `video/render_preview_video.py` to produce a data-driven FFmpeg preview.

## Safety and modeling boundaries

Do not invent feeder topology, node voltages, frequency traces, protection results, or stability pass/fail claims. The current project verifies dispatch power balance, SOC and equipment constraints, not distribution-network or dynamic stability. Label the video as simulation-only and show network stability as not connected unless a real network model and verifier are added.

## Validation

Before delivery, run:

```bash
.venv/bin/python scripts/export_video_timeline.py
.venv/bin/python -m py_compile scripts/export_video_timeline.py video/*.py
.venv/bin/python -m pytest -q tests/test_physical_pv.py tests/test_verifier.py
```

Do not commit generated `outputs/` files unless the user explicitly asks for them; the repository's `.gitignore` excludes them by default.
