# EnergyOps 视频 MVP

这个目录只负责把已验证的调度结果转换成演示视频，不重新运行优化器。

仓库内的 `fixtures/timeline_sample.csv` 是脱敏、四舍五入的 24 小时示例，只用于渲染回归，不代表实测数据。若存在 `outputs/video/timeline.csv`，脚本优先使用真实本地导出；否则自动使用该示例。

## 运行

```bash
uv run python scripts/export_video_timeline.py
BLENDER_USER_CONFIG=/tmp/energyops-blender-config blender --background --python video/create_energyops_scene.py
python video/render_energyops_animation.py
```

输出位于 `outputs/video/`：

- `timeline.csv`：24 小时视频时间轴；
- `timeline_metadata.json`：输入哈希、Evidence ID、验证状态和边界；
- `energyops_campus.blend`：自动生成的低多边形园区场景；
- `frames/`：PNG 帧；
- `energyops_demo.mp4`：MP4 视频。

如果 Blender 在当前机器上无法初始化 Metal，可运行：

```bash
.venv/bin/python video/render_preview_video.py
```

这会生成 `outputs/video/energyops_preview.mp4`。它是数据驱动的 2.5D 预览；`energyops_campus.blend` 仍是正式三维场景源文件。

## HPC 8 核 CPU

Linux HPC 节点可直接运行：

```bash
bash video/render_hpc_cpu.sh
```

如果使用 Slurm：

```bash
sbatch video/render_hpc_cpu.slurm
```

脚本会优先使用 `xvfb-run`，以便在无图形界面的计算节点上运行 Blender；渲染器使用 CPU-safe 的 Workbench，并把最终 MP4 写到 `outputs/video/energyops_demo.mp4`。

## 边界

视频标记为 `simulation_only=true` 和 `executable=false`。当前项目尚未接入配电网拓扑、节点电压、保护或动态稳定模型，因此视频不显示“电网稳定性通过”，只展示已验证的功率平衡、SOC 和调度约束。
