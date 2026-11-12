#!/usr/bin/env bash
# Example Slurm submission for an 8-core CPU node.
# Adjust the partition, module names, and time limit for your cluster.
#SBATCH --job-name=energyops-video
#SBATCH --cpus-per-task=8
#SBATCH --mem=16G
#SBATCH --time=00:30:00
#SBATCH --output=energyops-video-%j.out
#SBATCH --error=energyops-video-%j.err

set -euo pipefail
module load blender ffmpeg 2>/dev/null || true
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-8}"
bash video/render_hpc_cpu.sh
