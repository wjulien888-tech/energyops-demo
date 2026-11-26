// Meeting revision: explicit operating scope, immutable evidence and offline result inputs.
function shanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function nextDay(date = shanghaiDate()) {
  return new Date(Date.parse(date + "T00:00:00Z") + 86400000)
    .toISOString()
    .slice(0, 10);
}
const MEETING = {
  get asOf() {
    return shanghaiDate();
  },
  first: "2026-02-19",
  get last() {
    return nextDay();
  },
};
function historicalDate(date = S.date) {
  return date < shanghaiDate();
}
function validDate(date) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= MEETING.first &&
    date <= MEETING.last &&
    Number.isFinite(Date.parse(date + "T00:00:00Z")) &&
    new Date(date + "T00:00:00Z").toISOString().slice(0, 10) === date
  );
}
function copyData(value) {
  return JSON.parse(JSON.stringify(value));
}
function publishedData() {
  const d = copyData(data);
  if (!historicalDate()) {
    delete d.actual;
    delete d.actualPV;
  }
  return d;
}
function rememberOutput(kind) {
  const id =
    (kind === "forecast" ? "FC-" : "PA-") +
    String(S.archive.length + 1).padStart(3, "0");
  const record = {
    id,
    kind,
    date: S.date,
    issuedAt:
      kind === "forecast"
        ? new Date(
            Date.parse(S.date + "T18:00:00+08:00") - 86400000,
          ).toISOString()
        : new Date().toISOString(),
    version:
      kind === "forecast"
        ? "DEMO-F1"
        : data.carbonFactor?.version || "DEMO-C1",
    source: kind === "parameters" && data.carbonFactor ? data.carbonFactor.id : "synthetic",
    capacity: S.capacity,
    power: S.power,
    key: kind === "forecast" ? forecastInputKey() : parameterInputKey(),
    data: publishedData(),
  };
  S.archive.push(record);
  S[kind === "forecast" ? "forecastId" : "parameterId"] = id;
  return record;
}
function activeInputs() {
  return {
    forecast: S.forecastId,
    parameters: S.parameterId,
    date: S.date,
    data: publishedData(),
  };
}
function applyBudget(value) {
  const budget = Number(value);
  if (!Number.isFinite(budget) || budget < 0 || budget > 30) {
    toast("费用增幅上限应为0—30%");
    render();
    return false;
  }
  if (budget === S.budget && S.current) {
    render();
    return true;
  }
  const old = S.current;
  S.budget = budget;
  draft = Engine.plans(data, S);
  S.current = null;
  if (dispatchReady())
    runPlan(
      old?.plan.state || "normal",
      old?.parent || null,
      old && old.plan.state !== "normal" ? old.plan.rows : null,
    );
  else render();
  return true;
}
function balanceTable(p) {
  const r = p.rows[S.hour];
  return `<div class="balance-table"><strong>${String(r.h).padStart(2, "0")}:00 供需核对</strong><span>购电 ${fmt(r.grid, 2)} + 光伏 ${fmt(r.pv, 2)} + 放电 ${fmt(r.discharge, 2)}</span><span>= 负荷 ${fmt(r.load, 2)} + 充电 ${fmt(r.charge, 2)} + 弃光 ${fmt(r.curtail, 2)} kW</span></div>`;
}
function noStoragePanel(p) {
  const snapshot = S.current?.inputs?.data || data,
    b = Engine.noStorage(snapshot),
    difference = b.cost - p.cost;
  return panel(
    "同口径运行比较",
    `<div class="tablewrap"><table><thead><tr><th>运行条件</th><th>预计购电费用 / 元</th><th>预计购电碳排 / kgCO₂</th><th>储能终态能量差 / kWh</th></tr></thead><tbody><tr><td>同光伏、无储能</td><td>${fmt(b.cost, 2)}</td><td>${fmt(b.carbon, 2)}</td><td>—</td></tr><tr><td>当前储能方案</td><td>${fmt(p.cost, 2)}</td><td>${fmt(p.carbon, 2)}</td><td>${fmt(p.terminal - p.initial, 2)}</td></tr><tr><td>无储能基准减当前方案</td><td>${fmt(difference, 2)}</td><td>${fmt(b.carbon - p.carbon, 2)}</td><td>—</td></tr></tbody></table></div><div class="note-line">同负荷、光伏、电价、碳因子及24小时周期；不含设备投资、折旧或回本。正常储能方案初末能量一致；故障状态若不一致，费用差包含能量差异。</div>`,
  );
}
function handoffPanel() {
  return panel(
    "方案交接",
    `<div class="card-pad handoff"><div><b>1. 选择与复核</b><p>选择候选方案并完成人工审阅。</p></div><div><b>2. 导出计划</b><p>操作员将逐时计划交给有权限的设备控制台。</p></div><div><b>3. 执行与反馈</b><p>本页面不发送控制指令；执行数据回传方式待团队确认。</p></div></div>`,
  );
}
function readResultFile(kind) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    try {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) throw Error("文件不能超过5MB");
      const text = await file.text();
      const result = JSON.parse(text);
      if (kind === "safety") acceptSafety(result, file.name);
      else throw Error("暂未启用该结果类型");
      render();
      toast("结果已导入");
    } catch (error) {
      toast("导入失败：" + error.message);
    }
  };
  input.click();
}
function safeText(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function stabilityOperatingPoint() {
  const record = S.current;
  if (!recordInputsReady(record)) return null;
  const hour = S.stabilityHour ?? 12;
  const row = record.plan.rows[hour];
  return {
    kind: "stability-operating-point",
    park_id: "campus-demo",
    plan_id: record.id,
    analysis_date: record.config.date,
    data_version: record.config.version,
    hour,
    pv_kWp: record.config.pvKwp,
    capacity_kWh: record.config.capacity,
    power_kW: record.config.power,
    grid_limit_kW: record.config.gridLimitKw,
    load_kW: row.load,
    pv_available_kW: row.pv,
    pv_used_kW: row.pv - row.curtail,
    battery_charge_kW: row.charge,
    battery_discharge_kW: row.discharge,
    battery_end_soc_pct: row.soc,
    grid_import_kW: row.grid,
  };
}
function exportStabilityPoint() {
  const point = stabilityOperatingPoint();
  if (point) download(`${point.plan_id}-operating-point.json`, JSON.stringify(point, null, 2), "application/json");
}
function acceptSafety(result, filename) {
  if (
    result.kind !== "stability-result" ||
    result.park_id !== "campus-demo" ||
    result.capacity_kWh !== S.capacity ||
    result.power_kW !== S.power ||
    result.pv_kWp !== currentPvKwp()
  )
    throw Error("模型资产参数与当前配置不一致");
  const point = stabilityOperatingPoint();
  if (S.jointForecast && (!point || result.plan_id !== point.plan_id ||
      result.analysis_date !== point.analysis_date || result.data_version !== point.data_version ||
      result.hour !== point.hour))
    throw Error("模型结果须匹配当前计划、日期、版本和小时");
  const available = result.battery_available_kW;
  if (available !== undefined && (!Number.isFinite(available) || available < 0 || available > S.power))
    throw Error("反馈中的储能可用功率超出设备范围");
  const time = result.time_s;
  if (
    !Array.isArray(time) ||
    time.length < 2 ||
    time.length > 2000 ||
    !time.every(
      (v, i) => Number.isFinite(v) && v >= 0 && (!i || v > time[i - 1]),
    )
  )
    throw Error("时间轴必须为递增秒序列");
  const types = {
    frequency_Hz: "Hz",
    bus_power_kW: "kW",
    voltage_V: "V",
    current_A: "A",
  };
  const present = Object.keys(types).filter((k) => Array.isArray(result[k]));
  if (
    !present.length ||
    present.some(
      (k) =>
        result[k].length !== time.length || !result[k].every(Number.isFinite),
    )
  )
    throw Error("稳定性曲线长度或数值无效");
  S.safety = {
    ...copyData(result),
    filename: String(filename),
    configurationKey: parameterInputKey(),
    series: present,
  };
}
function storageFeedbackReady(point) {
  const result = S.safety;
  const rolling = S.current?.hourlyFeedback;
  const elapsed = rolling?.history.length ?? 0;
  return point && result && S.current.plan.state === "normal" &&
    result.configurationKey === parameterInputKey() &&
    result.plan_id === point.plan_id && result.hour === point.hour &&
    elapsed === point.hour + 1 && elapsed < 24 &&
    Number.isFinite(result.battery_available_kW) &&
    rolling.limits?.availablePower !== result.battery_available_kW;
}
function applyStabilityFeedback() {
  const point = stabilityOperatingPoint();
  if (!storageFeedbackReady(point)) return;
  const record = S.current;
  const updated = Engine.applyStorageFeedback(
    data, record.config, record.plan, record.hourlyFeedback, S.safety.battery_available_kW,
  );
  if (!Engine.verify(updated.plan).ok) {
    toast("滚动方案复算失败");
    return;
  }
  record.hourlyFeedback = { ...updated, gridFeedback: { hour: point.hour, modelVersion: S.safety.model_version } };
  go("dispatch");
}
function safetyPanel() {
  const r = S.safety,
    point = stabilityOperatingPoint(),
    valid = r && r.configurationKey === parameterInputKey() &&
      (!S.jointForecast || (point && r.plan_id === point.plan_id && r.hour === point.hour));
  const operatingPoint = point ? `<div class="note-line">
    <label for="stability-hour">运行点小时</label>
    <select id="stability-hour" onchange="S.stabilityHour=Number(this.value);render()">
    ${S.current.plan.rows.map(row => `<option value="${row.h}" ${row.h === point.hour ? "selected" : ""}>${String(row.h).padStart(2, "0")}:00</option>`).join("")}
    </select>
    <p>${point.plan_id} · ${point.analysis_date} · ${point.pv_kWp} kWp · ${point.power_kW} kW / ${point.capacity_kWh} kWh</p>
    <p>负荷 ${fmt(point.load_kW)} kW · 光伏利用 ${fmt(point.pv_used_kW)} kW · 购电 ${fmt(point.grid_import_kW)} kW · SOC ${fmt(point.battery_end_soc_pct)}%</p>
    ${btn("导出运行点", "exportStabilityPoint()", "small")}
    </div>` : '<p class="note-line">生成调度方案后可选择并导出运行点。</p>';
  return panel(
    "园区微电网稳定性验证",
    `<div class="card-pad"><div class="scope-strip">对象：园区内部微电网　｜　长时段调度与短时段动态控制分别验证</div><div class="actions">${btn("导入模型结果", "readResultFile('safety')", "small")}${btn("结果格式", "showResultSchema('safety')", "small")}</div>${operatingPoint}${valid && Number.isFinite(r.battery_available_kW) ? `<div class="note-line">
    <p>模型反馈储能可用功率 · ${fmt(r.battery_available_kW)} kW</p>
    <p>仿真执行到所选小时结束后，可以应用反馈重算。</p>
    ${btn("应用功率反馈并重算", "applyStabilityFeedback()", "small", !storageFeedbackReady(point))}
    </div>` : ""}${valid ? `<div class="note-line">来源文件：${safeText(sourceText(r.filename, "Imported result file"))}　模型版本：${safeText(sourceText(r.model_version, "Imported model version"))}　工况：${safeText(sourceText(r.case_name, "Imported source case"))}</div>${r.series.map((k) => chart([{ name: { frequency_Hz: "频率", bus_power_kW: "母线功率", voltage_V: "电压", current_A: "电流" }[k], values: r[k], color: colors.load }], { frequency_Hz: "Hz", bus_power_kW: "kW", voltage_V: "V", current_A: "A" }[k], 170, { times: r.time_s })).join("")}<div class="note-line">${safeText(sourceText(r.assessment || "未提供验收判据，不判定为稳定性通过。", "Source assessment supplied in another language; refer to the original file."))}　导入仅展示数值结果，不验证模型真实性。</div>` : '<div class="empty">暂无控制模型验证结果</div>'}<div class="detailbox"><div><b>预测与参数</b><p>提供同一园区、窗口和设备配置。</p></div><div><b>调度方案</b><p>给出逐时计划，独立复算不能替代动态稳定性验证。</p></div><div><b>控制研究</b><p>展示频率、母线功率及电压/电流响应；正式结果与判据由模块负责人提供。</p></div></div></div>`,
    badge("负责人 · 高翰林"),
  );
}
function showResultSchema() {
  const point = stabilityOperatingPoint();
  const content = {
    kind: "stability-result",
    park_id: "campus-demo",
    capacity_kWh: S.capacity,
    power_kW: S.power,
    pv_kWp: currentPvKwp(),
    plan_id: point?.plan_id ?? null,
    analysis_date: point?.analysis_date ?? null,
    data_version: point?.data_version ?? null,
    hour: point?.hour ?? null,
    battery_available_kW: S.power,
    model_version: "由负责人填写",
    case_name: "由负责人填写",
    time_s: [0, 0.1, 0.2],
    frequency_Hz: [50, 49.9, 50],
    assessment: "填写判据、检查范围及结果，不自动判定通过",
  };
  modal(
    "控制模型结果格式",
    `<p>可提供 frequency_Hz、bus_power_kW、voltage_V、current_A 中至少一组等长数值序列。此处为格式示例，不是已完成的研究结果。</p><pre>${safeText(JSON.stringify(content, null, 2))}</pre>`,
  );
}
function outputHistory() {
  return panel(
    "专业模块输出记录",
    S.archive.length
      ? `<div class="tablewrap"><table><thead><tr><th>输出编号</th><th>模块</th><th>分析日期</th><th>版本</th><th>来源</th><th>操作</th></tr></thead><tbody>${S.archive.map((r) => `<tr><td>${r.id}</td><td>${r.kind === "forecast" ? "预测" : "碳因子与设备"}</td><td>${r.date}</td><td>${r.version}</td><td>${r.kind === "parameters" && r.data?.carbonFactor ? r.data.carbonFactor.name : "合成演示"}</td><td>${btn("查看", `showOutput('${r.id}')`, "small")}</td></tr>`).join("")}</tbody></table></div>`
      : '<div class="empty">暂无专业模块输出</div>',
  );
}
function showOutput(id) {
  const r = S.archive.find((v) => v.id === id);
  if (r)
    modal(
      "输出快照 · " + r.id,
      `<pre>${safeText(JSON.stringify(r, null, 2))}</pre>`,
    );
}
