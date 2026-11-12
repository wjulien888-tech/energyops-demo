#!/usr/bin/env python3
"""Export a verified EnergyOps dispatch result to a video-friendly timeline."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def export_timeline(schedule_path: Path, verification_path: Path, output_dir: Path) -> tuple[Path, Path]:
    schedule = load_json(schedule_path)
    verification = load_json(verification_path)
    points = schedule.get("points")
    if not isinstance(points, list) or len(points) != 24:
        raise ValueError(f"Expected exactly 24 schedule points, got {type(points).__name__}:{len(points or [])}")
    if verification.get("passed") is not True:
        raise ValueError("Refusing to export an unverified schedule")

    required = {
        "timestamp", "pv_power_kw", "pv_curtailment_kw", "load_power_kw",
        "battery_charge_kw", "battery_discharge_kw", "battery_energy_before_kwh",
        "battery_energy_after_kwh", "grid_import_kw", "grid_export_kw",
        "buy_price_cny_per_kwh",
    }
    missing = sorted(required - set(points[0]))
    if missing:
        raise ValueError(f"Missing schedule fields: {', '.join(missing)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    timeline_path = output_dir / "timeline.csv"
    metadata_path = output_dir / "timeline_metadata.json"
    fieldnames = [
        "timestamp", "hour", "load_kw", "pv_available_kw", "pv_used_kw",
        "pv_curtailment_kw", "battery_charge_kw", "battery_discharge_kw",
        "battery_energy_kwh", "battery_soc_pct", "grid_import_kw", "grid_export_kw",
        "buy_price_cny_per_kwh",
    ]
    rows: list[dict[str, object]] = []
    for index, point in enumerate(points):
        pv_available = float(point["pv_power_kw"])
        curtailment = float(point["pv_curtailment_kw"])
        pv_used = pv_available - curtailment
        battery_energy = float(point["battery_energy_after_kwh"])
        # This scenario is explicitly medium_150kw_400kwh; keep the capacity in metadata.
        soc_pct = battery_energy / 400.0 * 100.0
        balance_lhs = float(point["load_power_kw"]) + float(point["battery_charge_kw"]) + float(point["grid_export_kw"])
        balance_rhs = pv_used + float(point["battery_discharge_kw"]) + float(point["grid_import_kw"])
        if abs(balance_lhs - balance_rhs) > 1e-5:
            raise ValueError(f"Power balance failed at {point['timestamp']}: {balance_lhs} != {balance_rhs}")
        rows.append({
            "timestamp": point["timestamp"],
            "hour": index,
            "load_kw": float(point["load_power_kw"]),
            "pv_available_kw": pv_available,
            "pv_used_kw": pv_used,
            "pv_curtailment_kw": curtailment,
            "battery_charge_kw": float(point["battery_charge_kw"]),
            "battery_discharge_kw": float(point["battery_discharge_kw"]),
            "battery_energy_kwh": battery_energy,
            "battery_soc_pct": soc_pct,
            "grid_import_kw": float(point["grid_import_kw"]),
            "grid_export_kw": float(point["grid_export_kw"]),
            "buy_price_cny_per_kwh": float(point["buy_price_cny_per_kwh"]),
        })

    with timeline_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    metadata = {
        "simulation_only": True,
        "executable": False,
        "verified_schedule": True,
        "schedule_id": schedule.get("schedule_id"),
        "schedule_evidence_id": schedule.get("evidence_id"),
        "verification_evidence_id": verification.get("evidence_id"),
        "verification_passed": verification.get("passed"),
        "source_schedule": str(schedule_path),
        "source_verification": str(verification_path),
        "schedule_sha256": sha256_file(schedule_path),
        "verification_sha256": sha256_file(verification_path),
        "scenario": {
            "pv_scenario_id": "roof_only_10350kwp",
            "battery_case_id": "medium_150kw_400kwh",
            "objective_mode": "economic",
            "battery_capacity_kwh": 400.0,
        },
        "network_stability": {
            "status": "not_connected",
            "message": "This video does not claim feeder power-flow or dynamic stability validation.",
        },
        "row_count": len(rows),
        "metrics": verification.get("recomputed_metrics", schedule.get("metrics", {})),
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return timeline_path, metadata_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schedule", type=Path, default=Path("outputs/hkust_gz_stage_b/scenarios/roof_only_10350kwp/medium_150kw_400kwh/schedule_economic.json"))
    parser.add_argument("--verification", type=Path, default=Path("outputs/hkust_gz_stage_b/scenarios/roof_only_10350kwp/medium_150kw_400kwh/verification_economic.json"))
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/video"))
    args = parser.parse_args()
    timeline, metadata = export_timeline(args.schedule, args.verification, args.output_dir)
    print(f"Wrote {timeline}")
    print(f"Wrote {metadata}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
