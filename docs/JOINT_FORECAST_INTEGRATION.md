# Paired prediction interface

Default EnergyOps forecast mode: GRU PV capacity20077.2kWp and DormPatch-96 load100x. No model retraining or server inference. Frozen model outputs from44 common month/day windows; PV2023 mapped to load2025 clock, +08:00 timestamps.

Generate forecast then export dispatch CSV or JSON;96 consecutive15min intervals, interval-mean kW. Fields step,timestamp,pv_power_kw,load_power_kw. Energy=P*0.25. Exported values exactly match research delivery output/dispatch_inputs_20077kwp_load100_20261106/daily. Negative predictions clipped in exporter, no smoothing. Hourly source load resampled preserving energy.

Battery4000kWh is downstream teammate dispatch configuration, no battery power or wiring inferred. Existing internal demo remains hourly with separate settings; not the teammate dispatch module. Model dates/results are archive replay, not live current forecasting. Date/full96 changes invalidate generated output.

Rebuild research files with tools/export_dispatch_forecasts.py in0000PV_prediction, then bundle daily CSVs. Public bundle contains predicted powers only, not SQL/weights/reference labels.
