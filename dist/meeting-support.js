// Meeting revision: explicit operating scope, immutable evidence and offline result inputs.
const MEETING = { asOf: "2026-10-31", first: "2026-02-19", last: "2026-11-01" };
let interfaceLanguage = "zh";
function historicalDate(date = S.date) {
  return date <= MEETING.asOf;
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
    version: kind === "forecast" ? "DEMO-F1" : "DEMO-C1",
    source: "synthetic",
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
function acceptSafety(result, filename) {
  if (
    result.kind !== "stability-result" ||
    result.park_id !== "campus-demo" ||
    result.capacity_kWh !== S.capacity ||
    result.power_kW !== S.power ||
    result.pv_kWp !== 150
  )
    throw Error("模型资产参数与当前配置不一致");
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
function safetyPanel() {
  const r = S.safety,
    valid = r && r.configurationKey === parameterInputKey();
  return panel(
    "园区微电网稳定性验证",
    `<div class="card-pad"><div class="scope-strip">对象：园区内部微电网　｜　长时段调度与短时段动态控制分别验证</div><div class="actions">${btn("导入模型结果", "readResultFile('safety')", "small")}${btn("结果格式", "showResultSchema('safety')", "small")}</div>${valid ? `<div class="note-line">来源文件：${safeText(r.filename)}　模型版本：${safeText(r.model_version)}　工况：${safeText(r.case_name)}</div>${r.series.map((k) => chart([{ name: { frequency_Hz: "频率", bus_power_kW: "母线功率", voltage_V: "电压", current_A: "电流" }[k], values: r[k], color: colors.load }], { frequency_Hz: "Hz", bus_power_kW: "kW", voltage_V: "V", current_A: "A" }[k], 170, { times: r.time_s })).join("")}<div class="note-line">${safeText(r.assessment || "未提供验收判据，不判定为稳定性通过。")}　导入仅展示数值结果，不验证模型真实性。</div>` : '<div class="empty">暂无控制模型验证结果</div>'}<div class="detailbox"><div><b>预测与参数</b><p>提供同一园区、窗口和设备配置。</p></div><div><b>调度方案</b><p>给出逐时计划，独立复算不能替代动态稳定性验证。</p></div><div><b>控制研究</b><p>展示频率、母线功率及电压/电流响应；正式结果与判据由模块负责人提供。</p></div></div></div>`,
    badge("负责人 · 高翰林"),
  );
}
function showResultSchema() {
  const content = {
    kind: "stability-result",
    park_id: "campus-demo",
    capacity_kWh: S.capacity,
    power_kW: S.power,
    pv_kWp: 150,
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
function toggleLanguage() {
  $("#toast").classList.remove("show");
  interfaceLanguage = interfaceLanguage === "zh" ? "en" : "zh";
  render();
}
const translations = {
  园区能源管理系统: "Campus Energy Management",
  能源运行管理: "Energy Operations",
  业务管理: "Management",
  演示工具: "Demo tools",
  模块说明: "Modules",
  团队分工与接口: "Team & interfaces",
  运行总览: "Overview",
  园区总览: "Overview",
  能源预测: "Forecasts",
  运行调度: "Dispatch",
  故障管理: "Grid safety",
  报表管理: "Reports",
  负荷与光伏预测: "Load & PV Forecasts",
  碳因子与设备参数: "Carbon Factors & Assets",
  日前调度方案: "Day-ahead Dispatch",
  故障恢复管理: "Grid Safety & Recovery",
  方案与报告管理: "Plans & Reports",
  正常调度流程: "Dispatch walkthrough",
  故障恢复流程: "Recovery walkthrough",
  重置演示: "Reset demo",
  模拟环境: "Demo",
  演示用户: "Demo user",
  浏览器本地计算: "Browser computation",
  园区名称: "Campus",
  "科广校园（演示）": "Campus demo",
  科广校园: "Campus",
  运行日期: "Date",
  数据来源: "Data source",
  数据版本: "Data version",
  模拟数据: "Synthetic data",
  查询: "Query",
  重置条件: "Reset filters",
  数据详情: "Data details",
  输出预测数据: "Generate forecast",
  输出参数: "Generate parameters",
  参数配置: "Asset settings",
  进入调度: "Open dispatch",
  模块接口: "Module interface",
  暂无预测结果: "No forecast output",
  暂无参数结果: "No parameter output",
  负责人: "Owner",
  历史预测: "Archived forecast",
  "实际值（模拟）": "Observed value (synthetic)",
  实际值: "Observed value",
  预测值: "Forecast",
  负荷预测: "Load forecast",
  光伏预测: "PV forecast",
  偏差: "Error",
  "参考值（合成）": "Synthetic reference",
  平均绝对误差: "Mean absolute error",
  均方根误差: "Root mean square error",
  数据完整率: "Completeness",
  数据检查: "Input checks",
  检查项: "Check",
  要求: "Requirement",
  结果: "Result",
  说明: "Details",
  时间窗口: "Time window",
  通过: "Passed",
  设备参数结果: "Asset parameters",
  储能容量: "Battery capacity",
  额定充放电功率: "Charge/discharge limit",
  设备名称: "Asset",
  参数项: "Parameter",
  参数值: "Value",
  单位: "Unit",
  设置依据: "Basis",
  光伏系统: "PV system",
  储能系统: "Battery",
  装机容量: "Rated PV capacity",
  额定容量: "Rated capacity",
  "充电 / 放电效率": "Charge / discharge efficiency",
  "SOC下限 / 上限": "SOC min / max",
  初始SOC: "Initial SOC",
  分时碳因子: "Hourly carbon factors",
  分时电价: "Time-of-use price",
  参数依据: "Parameter evidence",
  进入调度: "Open dispatch",
  优化目标: "Objective",
  经济优先: "Economic",
  低碳优先: "Low carbon",
  成本约束低碳: "Cost-capped low carbon",
  输入检查: "Input checks",
  生成调度方案: "Calculate plans",
  调度方案: "Dispatch plans",
  设备参数: "Assets",
  计算依据: "Evidence",
  预计购电费用: "Estimated grid cost",
  预计购电碳排: "Estimated grid emissions",
  购电费用: "Grid cost",
  购电碳排: "Grid emissions",
  费用增幅上限: "Cost increase cap",
  成本受限: "Cost cap",
  预算校核: "Budget check",
  满足: "Met",
  超出预算: "Over cap",
  当前方案: "Selected",
  导出当前方案: "Export current plan",
  导出: "Export",
  查看: "View",
  调度曲线与时段数据: "Schedule & hourly data",
  校核详情: "Verification",
  功率计划: "Power plan",
  储能充放电: "Battery charge/discharge",
  SOC曲线: "Battery SOC",
  逐时碳排: "Hourly emissions",
  购电功率: "Grid import",
  光伏功率: "PV power",
  负荷功率: "Load power",
  充电功率: "Charge power",
  放电功率: "Discharge power",
  时段: "Hour",
  供需核对: "Power balance",
  负荷: "Load",
  光伏: "PV",
  购电: "Grid import",
  放电: "Discharge",
  充电: "Charge",
  弃光: "Curtailment",
  同口径运行比较: "Comparable operation baseline",
  "同光伏、无储能": "Same PV, no battery",
  当前储能方案: "Selected battery plan",
  无储能基准减当前方案: "Baseline minus plan",
  运行条件: "Operating condition",
  储能终态能量差: "Terminal energy difference",
  方案交接: "Plan handoff",
  选择与复核: "Select & review",
  导出计划: "Export schedule",
  执行与反馈: "Execution & feedback",
  费用约束: "Cost constraint",
  运行指标: "Operating metrics",
  方案审阅: "Human review",
  待审阅: "Pending review",
  已审阅: "Reviewed",
  标记审阅: "Mark reviewed",
  故障恢复: "Recovery",
  方案说明: "Plan explanation",
  "策略说明 / 校核结果": "Strategy / verification",
  独立复算: "Independent verification",
  设备约束: "Asset limits",
  电网校核范围: "Grid check scope",
  费用与碳排: "Cost & emissions",
  查看完整说明: "Full explanation",
  园区微电网稳定性验证: "Campus grid stability",
  导入模型结果: "Import model result",
  结果格式: "Result schema",
  暂无控制模型验证结果: "No control-model results",
  预测与参数: "Forecast & inputs",
  控制研究: "Control research",
  频率: "Frequency",
  母线功率: "Bus power",
  电压: "Voltage",
  电流: "Current",
  计划与运行反馈: "Plan & operation feedback",
  导入运行反馈: "Import feedback",
  反馈格式: "Feedback schema",
  暂无执行后反馈: "No execution feedback",
  计划购电: "Planned import",
  反馈购电: "Reported import",
  指标: "Metric",
  计划估计: "Plan estimate",
  反馈同口径复算: "Feedback calculation",
  差值: "Difference",
  关联计划: "Linked plan",
  来源文件: "Source file",
  模型版本: "Model version",
  工况: "Case",
  仿真反馈: "Simulation feedback",
  实测反馈: "Measured feedback",
  正常设备状态: "Normal assets",
  时区: "Timezone",
  "碳因子（合成）": "Carbon factor (synthetic)",
  "电价（假设）": "Price (assumed)",
  待计算预览: "Unrecorded preview",
  成本上限: "Cost cap",
  预计: "Estimated",
  当前: "Current",
  设备运行信息: "Asset status",
  业务处理: "Tasks",
  业务事项: "Task",
  处理内容: "Description",
  关联记录: "Record",
  状态: "Status",
  操作: "Action",
  待计算: "Pending",
  已计算: "Computed",
  暂无事件: "No event",
  事件管理: "Events",
  方案报告: "Reports",
  查看记录: "Records",
  事件处理链: "Event flow",
  事件已注入: "Event injected",
  注入储能支路故障: "Inject branch fault",
  生成恢复建议: "Recovery suggestion",
  使用有效反馈重规划: "Replan from feedback",
  事件报告: "Event report",
  园区拓扑与设备状态: "Campus topology & state",
  设备正常: "Normal",
  故障接收: "Event received",
  诊断与恢复建议: "Diagnosis & suggestion",
  恢复反馈: "Recovery feedback",
  重规划与验证: "Replan & verify",
  选择仿真恢复反馈: "Simulation feedback",
  恢复完成: "Recovered",
  部分恢复: "Partial recovery",
  恢复失败: "Recovery failed",
  储能停用: "Battery unavailable",
  无反馈: "No feedback",
  重置此事件: "Reset event",
  故障前后方案关联: "Linked before/after plans",
  方案历史与审阅记录: "Plan history & review",
  证据与版本: "Evidence & versions",
  交付边界: "Scope",
  输入和模型版本: "Input & model versions",
  "计划 / 时间": "Plan / time",
  目标与输入: "Objective & inputs",
  设备状态: "Asset state",
  "终态 SOC": "Terminal SOC",
  操作: "Actions",
};
function translateText(value) {
  if (interfaceLanguage !== "en") return value;
  const escape = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = Object.keys(translations)
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|");
  return String(value).replace(
    new RegExp(pattern, "g"),
    (matched) => translations[matched],
  );
}
function translateContainer(root) {
  if (
    typeof document.createTreeWalker !== "function" ||
    interfaceLanguage !== "en" ||
    !root
  )
    return;
  const walker = document.createTreeWalker(root, 4);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.parentElement?.closest("pre"))
      node.nodeValue = translateText(node.nodeValue);
  }
  root.querySelectorAll("[aria-label], [title]").forEach((el) => {
    for (const attr of ["aria-label", "title"])
      if (el.hasAttribute(attr))
        el.setAttribute(attr, translateText(el.getAttribute(attr)));
  });
}
function outputHistory() {
  return panel(
    "专业模块输出记录",
    S.archive.length
      ? `<div class="tablewrap"><table><thead><tr><th>输出编号</th><th>模块</th><th>分析日期</th><th>版本</th><th>来源</th><th>操作</th></tr></thead><tbody>${S.archive.map((r) => `<tr><td>${r.id}</td><td>${r.kind === "forecast" ? "预测" : "碳因子与设备"}</td><td>${r.date}</td><td>${r.version}</td><td>合成演示</td><td>${btn("查看", `showOutput('${r.id}')`, "small")}</td></tr>`).join("")}</tbody></table></div>`
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

function translateInterface() {
  if (typeof document.createTreeWalker !== "function") return;
  document.documentElement.lang = interfaceLanguage === "en" ? "en" : "zh-CN";
  translateContainer(document.querySelector("#app"));
}

Object.assign(translations, {
  预测: "Forecast",
  参数: "Inputs",
  历史方案回放: "Historical replay",
  日前预测方案: "Day-ahead plan",
  合成数据: "Synthetic inputs",
  合成演示: "Synthetic demo",
  方案: "Plan",
  元: "CNY",
  储能: "Battery",
  排放: "Emissions",
  累计: "Cumulative",
  购电量: "Imported energy",
  展开全部24个时段: "Expand all 24 hours",
  收起: "Collapse",
  逐时购电碳排: "Hourly grid emissions",
  "经济基准为同条件候选集中最低费用。C在费用上限内优先减碳。":
    "The economic baseline is the lowest-cost candidate. Plan C minimizes emissions within the cost cap.",
  "当前约束下B、C结果一致，未人为制造差异。":
    "Plans B and C coincide under the current cap; no artificial difference is introduced.",
  "每小时购电量乘碳因子，24小时合计对应方案总排放。":
    "Hourly imported energy multiplied by its carbon factor; the 24-hour sum equals the plan total.",
  "功率均显示幅值，储能贡献可由供需核对及充放电/SOC页查看。":
    "Power curves show magnitudes. Battery contributions appear in the balance and battery/SOC views.",
  "阶梯表示逐小时计划，同一时段充放电互斥；不表示连续采样。":
    "Steps represent hourly decisions. Charge and discharge are mutually exclusive within each interval; these are not continuous measurements.",
  "不代表实际结算。": "Not an actual settlement.",
  "；终态 ": "; terminal ",
  "夜间可由初始储电供电，充电也可来自电网。":
    "Initial stored energy may supply nighttime demand; charging may also use the grid.",
  "功率平衡、能量递推、SOC、充放电互斥与指标。":
    "power balance, energy evolution, SOC, exclusivity and totals.",
  "仅250 kW有功限额筛查，不等于潮流或动态稳定性通过。":
    "Only a 250 kW active-power limit check; not power-flow or dynamic-stability approval.",
  "C方案费用上限；相对经济基准增加不超过 ":
    "Plan C cost cap; maximum increase above the economic baseline: ",
  "弃光电量　｜　终态能量差 ": "Curtailed energy | terminal energy difference ",
  "同负荷、光伏、电价、碳因子及24小时周期；不含设备投资、折旧或回本。正常储能方案初末能量一致；故障状态若不一致，费用差包含能量差异。":
    "Same load, PV, prices, factors and 24-hour horizon. Excludes capital cost, depreciation and payback. Normal battery plans preserve initial energy; fault cases may contain terminal-energy effects.",
  "选择候选方案并完成人工审阅。":
    "Select a candidate and complete human review.",
  "操作员将逐时计划交给有权限的设备控制台。":
    "An authorized operator transfers the hourly plan to the equipment controller.",
  "本页面不发送控制指令；执行数据回传方式待团队确认。":
    "This page sends no control commands. The execution feedback path remains to be agreed.",
  缺失数据演示: "Missing-data demo",
  恢复碳因子: "Restore carbon factors",
  "规则启发式扫描，不保证全局最优；预测、因子和设备为合成输入。":
    "Rule-based candidate scan; no global optimality guarantee. Forecasts, factors and assets are synthetic.",
  "数据类型：模拟　｜　时间粒度：1小时　｜　仅用于方案仿真与演示，不下发设备指令":
    "Synthetic data | 1-hour intervals | Simulation and demonstration only; no equipment commands.",
  专业模块输出记录: "Module output archive",
  输出编号: "Output ID",
  模块: "Module",
  分析日期: "Analysis date",
  版本: "Version",
  来源: "Source",
  暂无专业模块输出: "No module outputs",
  碳因子与设备: "Carbon factors & assets",
  输出快照: "Output snapshot",
  "历史预测与实际值均为模拟序列，误差不代表真实模型效果。MAE/RMSE越小越好，尚无独立测试集与达标阈值。":
    "Both archived forecasts and observations are synthetic. Lower MAE/RMSE is better; these values are not independent model validation or a pass threshold.",
  "未来预测没有实际值，不计算MAE/RMSE。":
    "Future forecasts have no observed values; MAE/RMSE are unavailable.",
  "输出 ": "Output ",
  有效窗口: "Valid window",
  演示基准日: "Demo reference date",
  "正式研究模型待接入。": "The research model is not connected.",
  发布时间: "Issued at",
  "前一日18:00（模拟）": "Previous day 18:00 (synthetic)",
  模型接入: "Model connection",
  预测接口及版本: "Forecast interface and version",
  演示接口: "Demo interface",
  "当前为规则合成器，正式模型待接入":
    "Rule-based generator; research model not connected",
  完整性与单位: "Completeness & units",
  "24条记录，功率单位kW": "24 records, power in kW",
  模拟输入无缺失值: "No missing values in synthetic inputs",
  固定假设参数: "Fixed assumptions",
  设备配置: "Asset configuration",
  调度边界约束: "Dispatch bounds",
  正常状态末端恢复初始能量: "Normal terminal energy equals initial energy",
  "额定峰值功率，非全天输出；现场光伏尚未接入":
    "Rated peak power, not all-day output; no onsite PV connection",
  "DEMO-C1合成因子；仅核算购电碳排，不含全生命周期。正式分时碳因子待接入。":
    "Synthetic DEMO-C1 factors. Grid electricity emissions only, excluding lifecycle impacts. Production factors are not connected.",
  "分时电价为演示假设，未冒用广州工业或校园实际结算价。":
    "Assumed time-of-use prices, not actual Guangzhou industrial or campus settlement rates.",
  "对象：园区内部微电网　｜　长时段调度与短时段动态控制分别验证":
    "Campus internal microgrid | Long-horizon dispatch and short-horizon dynamic control are verified separately",
  "提供同一园区、窗口和设备配置。":
    "Use matching campus, horizon and asset configuration.",
  "给出逐时计划，独立复算不能替代动态稳定性验证。":
    "Hourly plans and numerical checks do not replace dynamic-stability validation.",
  "展示频率、母线功率及电压/电流响应；正式结果与判据由模块负责人提供。":
    "Display frequency, bus power and voltage/current responses. The module owner supplies model results and acceptance criteria.",
  控制模型结果格式: "Control-model result schema",
  暂无计算记录: "No calculated plans",
  暂无计算: "Not calculated",
  暂无执行后反馈: "No post-execution feedback",
  未来: "Future",
  预测数据已输出: "Forecast output generated",
  碳因子与设备参数已输出: "Parameter output generated",
  "已生成，独立复算 ": " generated; independent verification: ",
});

Object.assign(translations, {
  应用上限: "Apply cap",
  入库: "Archive",
  "时间 (s)": "Time (s)",
});

Object.assign(translations, {
  团队执行详情: "Team execution details",
  返回调度工作台: "Back to dispatch",
  份: "plans",
  当前会话: "current session",
  费用: "Cost",
  碳排: "Emissions",
  审阅: "Review",
  数据与时间窗口: "Inputs & time window",
  "合成负荷 / 光伏 / 电价 / 碳因子，24h，Asia/Shanghai":
    "Synthetic load / PV / prices / carbon factors; 24h; Asia/Shanghai",
  预测接口与误差: "Forecast interface & error",
  "历史预测和实际值（模拟）；未来日期无实际误差":
    "Archived forecasts vs synthetic observations; no observed error for future dates",
  独立复算依据: "Independent verification evidence",
  "功率平衡、能量递推、SOC边界、费用与碳排":
    "Power balance, energy evolution, SOC bounds, costs & emissions",
  "本 Demo 用于产品流程演示和团队答辩。生成记录保存在当前页面会话中，刷新将清空，请及时导出。":
    "This demo supports team walkthroughs and presentations. Records are held in the page session and cleared on refresh; export them before leaving.",
  已实现: "Implemented",
  待接入: "Not connected",
  "联动曲线、候选比较、独立复算、四种恢复反馈、报告导出。":
    "Linked charts, candidate comparisons, independent checks, four recovery feedback states and report export.",
  "真实数据、正式预测模型、优化求解器、潮流与故障算法、在线大模型。":
    "Production data, forecasting models, solvers, power-flow/fault algorithms and online LLMs.",
  "事件类型：储能支路断开": "Event: battery branch disconnected",
  "来源：预设仿真": "Source: preset simulation",
  发生时间: "Event time",
  设备: "Asset",
  公共电网: "Public grid",
  变压器: "Transformer",
  限额: "Limit",
  园区负荷: "Campus load",
  合成曲线: "Synthetic curve",
  假设: "Assumed",
  储能支路: "Battery branch",
  正常: "Normal",
  "园区母线 · 示意连接关系，不含真实电气参数":
    "Campus bus: schematic connections only, no production electrical parameters",
  "资产映射：BESS-01 → 支路 SW-B1。故障当前状态与有效恢复反馈分别记录。":
    "Asset mapping: BESS-01 to SW-B1. Event state and valid recovery feedback are recorded separately.",
  "等待注入事件。": "Waiting for an injected event.",
  "等待事件及诊断。": "Waiting for an event and diagnosis.",
  "等待仿真反馈。": "Waiting for simulation feedback.",
  "使用有效状态重算，再次独立复算。":
    "Recalculate from valid state and verify independently.",
  "电网分析模块 · 输入与检查范围": "Grid analysis: inputs & scope",
  网络输入: "Network inputs",
  "示意母线与设备映射、假设变压器限额。尚无真实线路阻抗、电压与无功参数。":
    "Schematic bus, asset mapping and assumed transformer limit. No actual line impedance, voltage or reactive-power parameters.",
  演示校核: "Demo checks",
  "对计划最大购电功率进行 250 kW 有功限额筛查。未接入 AC 潮流，不声称电网安全验收。":
    "Check planned peak grid import against a 250 kW active-power limit. No AC power flow or grid-safety acceptance.",
  恢复交付: "Recovery output",
  "事件、诊断依据、恢复建议、反馈状态及版本。有效反馈传递给调度模块形成关联新计划。":
    "Events, diagnostic evidence, suggestions, feedback and versions. Valid feedback is passed to dispatch for a linked new plan.",
  "在收到有效反馈之前，不把恢复建议当作已恢复状态。可重置事件后演示不同分支。":
    "A recovery suggestion is not a recovered state. Reset the event to explore another feedback branch.",
  "未获得有效反馈，不能覆盖设备状态或据此生成正式新计划。":
    "No valid feedback: do not overwrite the asset state or generate a new plan.",
  "功率降至35%": "power limited to 35%",
  "35%功率": "35% power",
  有效反馈: "Valid feedback",
  "未提供验收判据，不判定为稳定性通过。":
    "No acceptance criteria supplied; stability approval is not inferred.",
  "导入仅展示数值结果，不验证模型真实性。":
    "Imported numerical results do not authenticate the model.",
  "已注入 EVT-001：14:00 储能支路故障":
    "Injected EVT-001: battery branch fault at 14:00",
  "已生成预设恢复建议，等待反馈":
    "Preset recovery suggestion generated; awaiting feedback",
  "无有效反馈，重规划已阻断": "No valid feedback; replanning blocked",
  "有效反馈已记录，尚未重规划": "Valid feedback recorded; not yet replanned",
});
