# 控制模型离线结果格式

这是会议修订版的前端展示接入口，不是控制器、潮流求解器或现场API。

在“故障恢复管理”的“园区微电网稳定性验证”中点击“导入模型结果”，选择JSON文件。文件最大5MB。

必需字段：

- `kind`: `stability-result`
- `park_id`: `campus-demo`
- `capacity_kWh`、`power_kW`：与当前输出的储能参数相同。
- `pv_kWp`: 150（当前演示配置）。
- `time_s`: 严格递增、非负的秒时间序列，2—2000点。
- 至少一组与时间轴等长的有限数值：`frequency_Hz`、`bus_power_kW`、`voltage_V`、`current_A`。
- 建议提供 `model_version`、`case_name`、`assessment`，说明工况、指标范围、判据与结果。

界面只验证结构、数值与资产参数匹配，不能证明模型真实或完成稳定性验收。未提供结果时不生成曲线；未提供判据时不宣称通过。不要将小时级调度粒度改写为控制仿真步长。
