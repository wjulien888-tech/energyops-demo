const $ = (s) => document.querySelector(s),
  fmt = (v, d = 1) =>
    Number(v).toLocaleString("zh-CN", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
const nav = [
  ["overview", "◈", "园区总览"],
  ["forecast", "⌁", "负荷与光伏预测"],
  ["parameters", "▤", "碳因子与设备配置"],
  ["dispatch", "⇄", "调度与方案比较"],
  ["fault", "⌘", "电网与故障恢复"],
  ["reports", "▧", "方案记录与报告"],
];
const owners = {
  forecast: "韦佳伶",
  parameters: "凌俊楷",
  dispatch: "梁紫昱、凌俊楷",
  fault: "高翰林",
  reports: "梁紫昱 · 各模块共同提供依据",
};
const S = {
  page: "forecast",
  scenario: "sunny",
  capacity: 320,
  power: 60,
  budget: 5,
  objective: "balanced",
  date: "2026-02-19",
  dataVersion: 1,
  records: [],
  current: null,
  fault: null,
  hour: 14,
  answer: "",
  missing: false,
  tour: null,
  step: 0,
  outputs: { forecast: null, parameters: null },
  archive: [],
  forecastId: null,
  parameterId: null,
  safety: null,
};
let data = Engine.dataset(),
  draft = Engine.plans(data, S);
const colors = {
  load: "#436d64",
  pv: "#b3c96a",
  grid: "#4c8fb2",
  soc: "#b38fc4",
  charge: "#75ac93",
  discharge: "#ca9d64",
  actual: "#b5c1b7",
};
// Output readiness belongs to the current input snapshot, not to page visits.
function validInputSeries(values) {
  return (
    Array.isArray(values) &&
    values.length === 24 &&
    values.every((value) => Number.isFinite(value) && value >= 0)
  );
}
function forecastInputKey() {
  return JSON.stringify([S.date, data.hours, data.load, data.pv]);
}
function parameterInputKey() {
  return JSON.stringify([S.date, S.capacity, S.power, data.carbon, data.price]);
}
function forecastReady() {
  return (
    validInputSeries(data.load) &&
    validInputSeries(data.pv) &&
    S.outputs.forecast === forecastInputKey()
  );
}
function parametersReady() {
  return (
    !S.missing &&
    validInputSeries(data.carbon) &&
    validInputSeries(data.price) &&
    Number.isFinite(S.capacity) &&
    S.capacity >= 100 &&
    S.capacity <= 1000 &&
    Number.isFinite(S.power) &&
    S.power >= 20 &&
    S.power <= 100 &&
    S.outputs.parameters === parameterInputKey()
  );
}
function dispatchReady() {
  return forecastReady() && parametersReady();
}
function recordInputsReady(record) {
  return (
    dispatchReady() &&
    record?.inputOutputs?.forecast === S.outputs.forecast &&
    record?.inputOutputs?.parameters === S.outputs.parameters
  );
}
function invalidateOutputs(kind = "all") {
  if (kind === "all" || kind === "forecast") S.outputs.forecast = null;
  if (kind === "all" || kind === "parameters") S.outputs.parameters = null;
  S.current = null;
  S.fault = null;
  for (const [name, ready] of [
    ["forecast", forecastReady()],
    ["parameters", parametersReady()],
  ]) {
    document
      .querySelectorAll(`[data-output-results="${name}"]`)
      .forEach((element) => {
        element.hidden = !ready;
      });
    document
      .querySelectorAll(`[data-output-action="${name}"]`)
      .forEach((button) => {
        button.disabled = !ready;
      });
    document
      .querySelectorAll(`[data-output-empty="${name}"]`)
      .forEach((element) => {
        element.hidden = ready;
      });
  }
  // Preserve the edited field's focus; a full render follows query/output.
  if (!dispatchReady()) {
    document.querySelectorAll("[data-dispatch-entry]").forEach((button) => {
      button.disabled = true;
    });
    if (S.page === "dispatch") {
      document
        .querySelectorAll(".scheme-card, .dispatch-curves, .bottom-metrics")
        .forEach((element) => {
          element.hidden = true;
        });
    }
  }
}
function outputForecast() {
  if (!applyFilters(true)) return false;
  if (!validInputSeries(data.load) || !validInputSeries(data.pv)) {
    toast("预测数据不完整，未输出");
    return false;
  }
  rememberOutput("forecast");
  S.outputs.forecast = forecastInputKey();
  render();
  toast("预测数据已输出");
  return true;
}
function toggleMissingInput() {
  S.missing = !S.missing;
  invalidateOutputs("parameters");
  render();
}
function badge(t, c = "") {
  return `<span class="badge ${c}">${t}</span>`;
}
function btn(t, action, cl = "", disabled = false) {
  const guarded =
    /go\(['"]dispatch['"]\)|runPlan\(|generateFromForm\(|injectFault\(|replan\(|openRecord\(/.test(
      action,
    );
  if (guarded && !dispatchReady()) disabled = true;
  const recordId = action.match(/openRecord\(['"]([^'"]+)['"]\)/)?.[1];
  if (
    recordId &&
    !recordInputsReady(S.records.find((record) => record.id === recordId))
  )
    disabled = true;
  const outputKind =
    ["forecast", "parameters"].includes(S.page) &&
    action.includes("showEvidence(")
      ? S.page
      : null;
  if (
    outputKind &&
    !(outputKind === "forecast" ? forecastReady() : parametersReady())
  )
    disabled = true;
  return `<button class="btn ${cl}" ${guarded ? "data-dispatch-entry" : ""} ${outputKind ? `data-output-action="${outputKind}"` : ""} onclick="${action}" ${disabled ? "disabled" : ""}>${t}</button>`;
}
function toast(t) {
  $("#toast").textContent =
    typeof translateText === "function" ? translateText(t) : t;
  $("#toast").classList.add("show");
  clearTimeout(window.tt);
  window.tt = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function go(page) {
  if (page === "dispatch" && !dispatchReady()) return false;
  S.page = page;
  S.answer = "";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function plan() {
  return S.current?.plan || draft.find((p) => p.key === S.objective);
}
function currentConfig() {
  return (
    S.current?.config || {
      capacity: S.capacity,
      power: S.power,
      budget: S.budget,
      scenario: S.scenario,
      date: S.date,
      version: S.dataVersion,
    }
  );
}
function kpi(label, value, unit, note) {
  return `<div class="kpi"><div class="kpi-label">${label}<span>↗</span></div><div class="kpi-value">${value}<span class="unit">${unit}</span></div><div class="kpi-note">${note}</div></div>`;
}
function panel(title, body, right = "") {
  return `<section class="card"><div class="cardhead"><h3>${title}</h3>${right}</div>${body}</section>`;
}
function chart(series, unit = "kW", height = 210, options = {}) {
  const W = 720,
    H = height + (options.times ? 58 : 42),
    L = 66,
    R = 15,
    T = 15,
    B = options.times ? 48 : 32,
    count = Math.max(...series.map((s) => s.values.length)),
    minimum = options.times
      ? Math.min(...series.flatMap((s) => s.values)) - 0.1
      : 0,
    max =
      Math.max(minimum + 1, ...series.flatMap((s) => s.values)) *
      (options.times ? 1 : 1.15),
    plotH = H - T - B;
  const x = (i) =>
      L +
      ((options.bars ? i + 0.5 : i) * (W - L - R)) /
        (options.bars || options.step ? count : Math.max(1, count - 1)),
    y = (v) => T + plotH - ((v - minimum) / (max - minimum)) * plotH;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${series.map((s) => s.name).join("、")}曲线，单位${unit}">`;
  const unitY = T + plotH / 2;
  svg += `<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#c8cfd9"/><text class="axis-unit" x="16" y="${unitY}" transform="rotate(-90 16 ${unitY})" text-anchor="middle" fill="#737d8c" font-size="11">${unit}</text>`;
  for (let j = 0; j < 5; j++) {
    let val = minimum + ((max - minimum) * j) / 4;
    svg += `<line x1="${L}" y1="${y(val)}" x2="${W - R}" y2="${y(val)}" stroke="#edf0e9"/><text x="${L - 9}" y="${y(val) + 3}" text-anchor="end" fill="#92a08e" font-size="9">${fmt(val, val < 2 ? 2 : 0)}</text>`;
  }
  for (let h = 0; h < count; h += Math.max(1, Math.ceil(count / 8)))
    svg += `<text x="${x(h)}" y="${H - (options.times ? 20 : 10)}" text-anchor="middle" fill="#8d9c89" font-size="9">${options.times ? fmt(options.times[h], 2) : String(h).padStart(2, "0") + ":00"}</text>`;
  series.forEach((s) => {
    let pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    if (options.step)
      pts = s.values
        .flatMap((v, i) =>
          i
            ? [`${x(i)},${y(s.values[i - 1])}`, `${x(i)},${y(v)}`]
            : [`${x(i)},${y(v)}`],
        )
        .concat([`${W - R},${y(s.values[count - 1])}`])
        .join(" ");
    if (options.bars) {
      const width = ((W - L - R) / count) * 0.7;
      s.values.forEach((v, i) => {
        svg += `<rect x="${x(i) - width / 2}" y="${y(v)}" width="${width}" height="${Math.max(0, y(0) - y(v))}" fill="${s.color}" opacity=".75"/>`;
      });
      return;
    }

    if (s.fill)
      svg += `<polygon points="${x(0)},${y(0)} ${pts} ${x(23)},${y(0)}" fill="${s.color}" opacity=".08"/>`;
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.4" ${s.dash ? 'stroke-dasharray="5 5"' : ""} stroke-linejoin="round"/>`;
  });
  for (let h = 0; h < count; h++)
    svg += `<rect class="hoverline" x="${x(h) - 10}" y="${T}" width="${(W - L - R) / Math.max(1, count - 1)}" height="${plotH}" fill="transparent" ${options.times ? "" : `onclick="selectHour(${h})"`}><title>${options.times ? fmt(options.times[h], 2) + "s" : String(h).padStart(2, "0") + ":00"} · ${series.map((s) => s.name + " " + fmt(s.values[h]) + " " + unit).join(" / ")}</title></rect>`;
  if (options.times)
    svg += `<text x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle" fill="#7d8796" font-size="10">时间 (s)</text>`;
  svg += "</svg>";
  return `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join("")}</div><div class="chart">${svg}</div>`;
}
function selectHour(h) {
  S.hour = h;
  if (S.page === "dispatch") {
    render();
  } else
    toast(
      `${String(h).padStart(2, "0")}:00 · 负荷 ${data.load[h]} kW · 光伏 ${data.pv[h]} kW`,
    );
}
function flow() {
  return `<div class="flow">${[
    ["场景与输入", "合成数据 · 明确假设", "overview"],
    ["预测与参数", "预测序列 + 设备边界", "forecast"],
    ["调度计算", "目标权衡 · 生成计划", "dispatch"],
    ["复算与电网检查", "检查范围分别记录", "fault"],
    ["方案比较与报告", "证据追溯 · 人工审阅", "reports"],
  ]
    .map(
      (v, i) =>
        `<button class="step ${S.current || i < 2 ? "on" : ""}" onclick="go('${v[2]}')"><span>${S.current ? "✓" : i + 1}</span><div><strong>${v[0]}</strong><small>${v[1]}</small></div></button>`,
    )
    .join("")}</div>`;
}
function render() {
  const name = nav.find((n) => n[0] === S.page)[2];
  $("#app").innerHTML =
    `<div class="shell"><aside class="sidebar"><div class="brand"><span class="brandmark">ϟ</span><span class="brandtext">EnergyOps<span style="color:#b5d591">.</span></span></div><div class="brand-sub">ENERGY DECISION STUDIO</div><div class="navlabel">WORKSPACE / 工作空间</div>${nav.map((n) => `<button aria-label="${n[2]}" title="${n[2]}" class="navbtn ${S.page === n[0] ? "active" : ""}" onclick="go('${n[0]}')"><span class="navicon">${n[1]}</span><span class="navtext">${n[2]}</span></button>`).join("")}<div class="navlabel" style="margin-top:25px">PRESENTATION / 答辩</div><button class="navbtn" onclick="showTeam()"><span class="navicon">♧</span><span class="navtext">团队模块与执行详情</span></button><button class="navbtn" onclick="resetDemo()"><span class="navicon">↺</span><span class="navtext">重置演示</span></button><div class="sidebar-bottom"><span class="dot"></span>模拟演示环境<br>历史场景 · Asia/Shanghai<br>v1.0 / 浏览器本地计算</div></aside><main class="main"><header class="topbar"><div class="crumb">工作空间 <b>/ ${name}</b></div><div class="top-actions">${badge("合成数据 · 非现场控制", "warn")}<span class="sub">科广校园 · 演示园区</span><span class="avatar">EO</span></div></header><div class="content">${S.tour ? tourBanner() : ""}<div class="pagehead"><div><div class="eyebrow">${{ overview: "CAMPUS OVERVIEW", forecast: "FORECAST LAB", parameters: "CARBON & ASSETS", dispatch: "DISPATCH STUDIO", fault: "GRID & RESILIENCE", reports: "EVIDENCE & REPORTS" }[S.page]}</div><h1>${name}</h1><p class="sub">${{ overview: "把预测、优化与恢复，连接成一次可复核的能源决策。", forecast: "从输入质量到预测误差，查看调度所依据的每一条曲线。", parameters: "统一碳排口径与设备边界，让每个方案都有据可依。", dispatch: "在相同输入与约束下，比较费用、碳排与储能运行计划。", fault: "跟踪故障、恢复反馈与状态更新，保留每一次重规划的依据。", reports: "从结论回到数据与模型，完整保留每一次演示决策。" }[S.page]}</p></div><div class="actions">${S.page === "overview" ? btn("▷ 正常调度演示", "startTour('normal')", "primary") + btn("故障恢复演示", "startTour('fault')") : badge("模块负责人 · " + (owners[S.page] || "团队共同"))}</div></div>${{ overview: overview, forecast: forecast, parameters: parameters, dispatch: dispatch, fault: fault, reports: reports }[S.page]()}<div class="footer"><span>EnergyOps · 园区能源管理与决策支持系统</span><span>全部曲线与案例均为合成 / 规则仿真 · 不代表模型实测效果 · 不下发设备指令</span></div></div></main></div>`;
}
function overview() {
  const p = plan();
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow">A CONNECTED ENERGY WORKFLOW</div><h2>让每一度电的决策，<br>都有清晰的依据。</h2><p>选择目标，生成计划，检查结果。在一个工作空间内，完成日常调度与故障后的方案调整。</p><div class="actions">${btn("进入决策工作台 ↗", "go('dispatch')", "primary small")}${btn("查看团队模块", "showTeam()", "small")}</div></div><div class="hero-art">${campusArt()}</div></section>${flow()}<div class="kpis">${kpi(
    "日用电需求",
    fmt(
      data.load.reduce((a, b) => a + b, 0),
      0,
    ),
    "kWh",
    "24 小时合成负荷 · 非校园总表",
  )}${kpi(
    "光伏发电潜力",
    fmt(
      data.pv.reduce((a, b) => a + b, 0),
      0,
    ),
    "kWh",
    S.scenario === "sunny" ? "晴天合成场景" : "多云合成场景",
  )}${kpi("储能配置", fmt(S.capacity, 0), "kWh", `额定功率 ${S.power} kW · SOC 15%–90%`)}${kpi("方案记录", String(S.records.length).padStart(2, "0"), "份", S.current ? "当前 " + S.current.id : "尚未生成 · 曲线为预览")}</div><div class="grid2">${panel(
    "园区日内能源画像",
    chart([
      { name: "负荷", values: data.load, color: colors.load, fill: true },
      { name: "光伏", values: data.pv, color: colors.pv, fill: true },
    ]) +
      `<div class="chart-note">${S.date} · 1 小时粒度 · 将鼠标移到曲线上查看时段数据</div>`,
    badge("合成场景"),
  )}${panel("决策任务", `<div class="card-pad"><div class="row"><div><strong>01 / 日前方案比较</strong><p>费用增幅不超过 ${S.budget}% 时，能否进一步减碳？</p></div>${btn("开始 ↗", "startTour('normal')", "small")}</div><div class="row"><div><strong>02 / 故障恢复重规划</strong><p>储能支路故障后，如何更新可用状态？</p></div>${btn("开始 ↗", "startTour('fault')", "small")}</div><div class="row"><div><strong>当前数据边界</strong><p>24 条合成负荷、光伏、电价与碳因子。<br>专业模型尚未接入，全部计算仅用于交互演示。</p></div></div></div>`)}</div><div class="section-title"><h2>专业模块 · 团队协作</h2><span class="sub">独立查看输入、结果与验证依据</span></div>${teamCards()}`;
}
function campusArt() {
  return `<svg width="390" height="210" viewBox="0 0 390 210" role="img" aria-label="园区光伏、储能与建筑示意"><g fill="none" stroke="#a9bd92"><path d="M30 157L180 75 355 149 200 200Z"/><path d="M51 146L196 68M83 165L229 85M121 183L267 102" opacity=".4"/></g><g stroke="#829e72" stroke-width="1.3"><path d="M115 94L164 69 213 92 164 119Z" fill="#f5f8eb"/><path d="M115 94V151L164 177V119Z" fill="#becfae"/><path d="M164 119L213 92V150L164 177Z" fill="#dbe7cd"/><path d="M125 87L165 66 201 83 161 106Z" fill="#426d5a"/><path d="M138 81L174 99M152 74L187 92M137 93L176 73M150 100L189 80" stroke="#9fc0a1"/><path d="M232 119L260 105 286 117 258 132Z" fill="#eff5e8"/><path d="M232 119V160L258 174V132Z" fill="#9bbd8b"/><path d="M258 132L286 117V159L258 174Z" fill="#ccddbd"/><path d="M249 140L242 151 250 150 245 161" stroke="#f6ffe9" stroke-width="2"/><path d="M72 137L92 127 111 137 92 148Z" fill="#e8f1dd"/><path d="M72 137V164L92 175V148Z" fill="#c8d6b9"/><path d="M92 148L111 137V164L92 175Z" fill="#dbe6cc"/></g><path d="M205 162L225 172 248 182" fill="none" stroke="#468968" stroke-width="2" stroke-dasharray="4 3"/><circle cx="318" cy="72" r="24" fill="#f6f8e9"/><path d="M317 55L307 74H317L314 89 329 68H319Z" fill="#8fae66"/><text x="26" y="40" fill="#7d966b" font-size="9" letter-spacing="2">PREDICT · OPTIMIZE · VERIFY</text></svg>`;
}
function teamCards() {
  return `<div class="teamgrid">${[
    [
      "韦佳伶",
      "负荷与光伏预测",
      "数据处理、预测曲线、误差评估与模型版本。",
      "forecast",
    ],
    [
      "凌俊楷",
      "碳因子与光储参数",
      "碳因子序列、设备参数统一，参与调度算法。",
      "parameters",
    ],
    [
      "高翰林",
      "电网分析与故障恢复",
      "网络约束、诊断依据、恢复仿真与状态反馈。",
      "fault",
    ],
    [
      "梁紫昱",
      "调度、Agent 与系统集成",
      "方案计算、工具编排、接口联调与端到端流程。",
      "dispatch",
    ],
  ]
    .map(
      (p, i) =>
        `<div class="person" role="button" tabindex="0" onclick="go('${p[3]}')" onkeydown="if(event.key==='Enter')go('${p[3]}')"><div class="personhead"><span class="avatar">${p[0][0]}</span><div><h3>${p[0]}</h3><div class="owner">MODULE 0${i + 1}</div></div></div><strong style="font-size:12px">${p[1]}</strong><p>${p[2]}</p><span class="link">查看专业模块 ↗</span></div>`,
    )
    .join("")}</div>`;
}
function dataSettings() {
  return `<div class="settings"><div class="field"><label for="day">分析日期 / 场景标签</label><input id="day" type="date" value="${S.date}" onchange="change('date',this.value)"></div><div class="field"><label>数据版本</label><div style="padding:10px 0">DEMO-D${S.dataVersion} · 24 × 1h</div></div>${btn("数据输入详情", "showEvidence('data')", "small")}</div>`;
}
function forecast() {
  const a = Engine.error(data.load, data.actual),
    b = Engine.error(data.pv, data.actualPV);
  return `${dataSettings()}<div class="notice">本页为确定性合成序列，预测值与参考值均为演示数据。误差仅用于展示评估流程，不代表韦佳伶真实模型的测试效果。日期用于标记演示案例，切换日期不请求真实天气。</div><div class="kpis">${kpi("负荷 MAE", fmt(a.mae, 2), "kW", "合成参考序列复算")}${kpi("负荷 RMSE", fmt(a.rmse, 2), "kW", "24 个合成评估点")}${kpi("光伏 MAE", fmt(b.mae, 2), "kW", "包含夜间 0 值时段")}${kpi("数据完整率", "100", "%", "24 / 24 条 · Asia/Shanghai")}</div><div class="grid2 equal">${panel(
    "负荷预测与参考值",
    chart([
      { name: "演示预测", values: data.load, color: colors.load },
      {
        name: "合成参考",
        values: data.actual,
        color: colors.actual,
        dash: true,
      },
    ]) +
      `<div class="chart-note">有效窗口：${S.date} 00:00–23:00 · 发布时间：前一日 18:00（模拟）</div>`,
  )}${panel(
    "光伏预测与参考值",
    chart([
      { name: "演示预测", values: data.pv, color: colors.pv, fill: true },
      {
        name: "合成参考",
        values: data.actualPV,
        color: colors.actual,
        dash: true,
      },
    ]) +
      `<div class="chart-note">光伏峰值 ${Math.max(...data.pv)} kW · 使用假设装机配置</div>`,
  )}</div>${panel("专业工作与模块交付", `<div class="card-pad"><div class="detailbox"><div><b>01 / 数据准备</b><p>统一时间粒度与单位；检查缺失、重复和有效窗口。当前演示集无缺失，未接入科广现场数据。</p></div><div><b>02 / 预测结果</b><p>输出负荷、光伏 24 小时序列及版本。当前为规则合成器 DEMO-F1，预留正式预测接口。</p></div><div><b>03 / 误差评估</b><p>按页面参考序列计算 MAE 与 RMSE，区分接口接入和真实模型效果。</p></div></div><div class="actions" style="margin-top:20px">${btn("使用当前输入进入调度 →", "go('dispatch')", "primary")}${btn("查看模块接口", "showEvidence('forecast')")}</div></div>`, badge("负责人 · 韦佳伶"))}`;
}
function change(k, v) {
  if (k === "date" && !v) return;
  if (["capacity", "power", "budget"].includes(k)) {
    v = Number(v);
    const limits = { capacity: [100, 1000], power: [20, 100], budget: [0, 30] };
    if (!Number.isFinite(v) || v < limits[k][0] || v > limits[k][1]) {
      toast(`请输入 ${limits[k][0]}–${limits[k][1]} 范围内的数值`);
      render();
      return;
    }
  }
  if (["date", "scenario"].includes(k)) invalidateOutputs();
  if (["capacity", "power"].includes(k)) invalidateOutputs("parameters");
  S[k] = v;
  S.dataVersion++;
  data = Engine.dataset(S.scenario);
  draft = Engine.plans(data, S);
  S.current = null;
  S.fault = null;
  S.answer = "";
  render();
  toast("输入已更新，请重新生成方案；历史记录保留原版本");
}
function parameters() {
  return `<div class="notice">碳因子为合成时变序列，单位 kgCO₂/kWh；电价为假设分时电价。设备效率、容量和约束均为演示配置，不用于投资回报结论。</div><div class="grid2 equal">${panel("分时碳因子", chart([{ name: "合成碳因子", values: data.carbon, color: colors.load, fill: true }], "kgCO₂/kWh") + `<div class="chart-note">计算边界：仅购电碳排 = Σ 购电量 × 时段碳因子，未含设备全生命周期。</div>`, badge("DEMO-C1"))}${panel("分时电价", chart([{ name: "假设电价", values: data.price, color: colors.discharge, fill: true }], "元/kWh") + `<div class="chart-note">谷段 0.32 · 平段 0.65 / 0.82 · 峰段 1.18 元/kWh；非真实结算依据。</div>`)}</div>${panel("光储设备配置", `<div class="card-pad"><div class="settings" style="padding:0;border:0;margin:0"><div class="field"><label for="cap">储能容量（kWh，100–1000）</label><input id="cap" type="number" min="100" max="1000" value="${S.capacity}" onchange="change('capacity',this.value)"></div><div class="field"><label for="power">充放电功率（kW，20–100）</label><input id="power" type="number" min="20" max="100" value="${S.power}" onchange="change('power',this.value)"></div><div class="field"><label>固定设备参数</label><span class="sub">充/放电效率各 95%<br>SOC 15%–90% · 初始 SOC 50%</span></div></div><div class="detailbox"><div><b>光伏</b><p>假设装机 150 kWp，晴天合成峰值 145 kW。当前无真实辐照或装机接入。</p></div><div><b>储能</b><p>功率、能量、效率与 SOC 边界统一输入调度。正常计划终态回到初始能量。</p></div><div><b>版本管理</b><p>修改配置即更新 DEMO-D 版本，旧计划保留原参数。可比较不同容量，不能据单日推断投资回报。</p></div></div><div class="actions" style="margin-top:20px">${btn("按当前配置生成方案 →", "go('dispatch')", "primary")}${btn("查看参数依据", "showEvidence('parameters')")}</div></div>`, badge("负责人 · 凌俊楷"))}`;
}
function dispatch() {
  const p = plan(),
    config = currentConfig(),
    base = (S.current?.alternatives || draft)[0],
    v = Engine.verify(p);
  return `${dataSettings()}${flow()}<div class="settings"><div class="field"><label for="objective">调度目标</label><select id="objective" onchange="S.objective=this.value;S.current=null;render()">${[
    ["economic", "经济优先"],
    ["green", "低碳优先"],
    ["balanced", "成本约束低碳"],
  ]
    .map(
      (a) =>
        `<option value="${a[0]}" ${S.objective === a[0] ? "selected" : ""}>${a[1]}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="field"><label for="budget">允许费用增幅（%，0–30）</label><input id="budget" type="number" min="0" max="30" value="${S.budget}" onchange="change('budget',this.value)"></div><div class="field"><label>设备配置 / 当前输入</label><span class="sub">${S.capacity} kWh / ${S.power} kW<br>DEMO-D${S.dataVersion}</span></div>${btn("生成并检查方案", "runPlan()", "primary")}${btn(S.missing ? "恢复碳因子" : "模拟缺失碳因子", "toggleMissingInput()", "small")}</div>${S.missing ? '<div class="notice error">碳因子缺失：当前阻断方案生成，不能补零或使用旧方案冒充新结果。点击“恢复碳因子”后重新计算。</div>' : ""}<div class="notice">${S.current ? `当前计划 <b>${S.current.id}</b> · ${p.name} · ${S.current.stateLabel} · 引用 DEMO-D${config.version}` : "当前展示待计算预览，点击“生成并检查方案”创建正式演示记录。"}　算法为 81 组权重候选的启发式扫描，不保证全局最优；独立复算不等于电网校核。</div><div class="analysis-grid"><div><div class="kpis">${kpi("购电费用", fmt(p.cost), "元", `${p.name} · 同输入经济基准 ${fmt(base.cost)} 元`)}${kpi("购电碳排", fmt(p.carbon), "kgCO₂", `相对经济基准 ${fmt((p.carbon / base.carbon - 1) * 100)}%`)}${kpi("弃光电量", fmt(p.curtail), "kWh", "禁止反送电 · 剩余光伏计入弃光")}${kpi("独立复算", S.current ? (v.ok ? "通过" : "失败") : "待运行", "", S.current ? "功率平衡 / SOC / 成本 / 碳排" : "生成后保存检查结果")}</div>${panel(
    "日内功率计划",
    chart([
      { name: "负荷", values: p.rows.map((r) => r.load), color: colors.load },
      {
        name: "光伏",
        values: p.rows.map((r) => r.pv),
        color: colors.pv,
        fill: true,
      },
      { name: "购电", values: p.rows.map((r) => r.grid), color: colors.grid },
    ]) +
      `<div class="chart-note">点击曲线查看小时详情 · ${String(S.hour).padStart(2, "0")}:00：电价 ${fmt(p.rows[S.hour].price, 2)} 元/kWh · 碳因子 ${fmt(p.rows[S.hour].carbon, 2)} kgCO₂/kWh · 购电 ${fmt(p.rows[S.hour].grid)} kW</div>`,
    badge(S.current ? "已记录" : "预览", S.current ? "" : "warn"),
  )}<div style="height:18px"></div>${panel(
    "储能运行计划",
    chart(
      [
        {
          name: "充电功率",
          values: p.rows.map((r) => r.charge),
          color: colors.charge,
        },
        {
          name: "放电功率",
          values: p.rows.map((r) => r.discharge),
          color: colors.discharge,
        },
      ],
      "kW",
      150,
    ) +
      chart(
        [{ name: "SOC", values: p.rows.map((r) => r.soc), color: colors.soc }],
        "%",
        110,
      ) +
      `<div class="chart-note">SOC 范围 15%–90%；初始 50%；终态 ${fmt(p.rows[23].soc)}%。${Math.abs(p.terminal - p.initial) > 1e-6 ? "故障后可用能力受限，终态未回到初始值；费用比较需考虑终态差异。" : "末端能量恢复约束用于统一比较。"}</div>`,
  )}<div style="height:18px"></div>${comparison()}<div style="height:18px"></div>${panel("检查与审阅", `<div class="card-pad"><div class="row"><div><strong>独立数值复算</strong><p>功率平衡、SOC 递推与边界、功率上限、成本和碳排。</p></div>${btn("查看依据", "showEvidence('verification')", "small", !S.current)}</div><div class="row"><div><strong>电网检查 · 演示规则</strong><p>仅按假设变压器 250 kW 有功限额筛查；未执行 AC 潮流。</p></div>${badge(S.current ? (Math.max(...p.rows.map((r) => r.grid)) <= 250 ? "限额筛查通过" : "存在有功越限") : "待运行", S.current ? "" : "warn")}</div><div class="row"><div><strong>人工审阅</strong><p>${S.current?.reviewed ? "已记录人工演示审阅，未触发任何设备动作。" : "计算通过后仍可独立标记人工审阅。"}</p></div>${btn("标记审阅", "reviewCurrent()", "small", !S.current)}</div></div>`)}</div>${assistant()}</div>`;
}
function comparison() {
  const ps = S.current?.alternatives || draft;
  return panel(
    "同输入方案比较",
    `<div class="tablewrap"><table><thead><tr><th>方案目标</th><th>费用 / 元</th><th>碳排 / kgCO₂</th><th>费用增幅</th><th>预算约束</th><th>查看</th></tr></thead><tbody>${ps.map((p) => `<tr class="${plan().key === p.key ? "selected" : ""}"><td>${p.name}</td><td>${fmt(p.cost)}</td><td>${fmt(p.carbon)}</td><td>${fmt((p.cost / ps[0].cost - 1) * 100)}%</td><td>${p.cost <= ps[0].cost * (1 + currentConfig().budget / 100) + 1e-6 ? "✓ 满足" : "超出预算"}</td><td>${btn("选择", `choose('${p.key}')`, "small")}</td></tr>`).join("")}</tbody></table></div><div class="chart-note" style="padding-top:12px">预算相对同状态、同配置的经济启发式基准；不宣称全局经济最优。故障前后结果请查看事件比较。</div>`,
  );
}
function choose(key) {
  S.objective = key;
  if (S.current) {
    const old = S.current;
    const record = {
      ...old,
      feedback: undefined,
      createdAt: new Date().toISOString(),
      id: nextId(),
      plan: old.alternatives.find((p) => p.key === key),
      reviewed: false,
      created: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    };
    S.records.push(record);
    S.current = record;
  } else {
  }
  render();
  toast("已切换方案，图表与解释同步更新");
}
function nextId() {
  return "EO-" + String(S.records.length + 1).padStart(3, "0");
}
function runPlan(state = "normal", parent = null, prefix = null) {
  if (!dispatchReady()) return false;
  if (S.missing) {
    toast("碳因子缺失，生成已阻断");
    return false;
  }
  const cfg = {
    capacity: S.capacity,
    power: S.power,
    budget: S.budget,
    scenario: S.scenario,
    date: S.date,
    version: S.dataVersion,
  };
  const ps = Engine.plans(data, cfg, state, prefix);
  const record = {
    id: nextId(),
    created: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    config: cfg,
    inputOutputs: { ...S.outputs },
    inputs: activeInputs(),
    createdAt: new Date().toISOString(),
    alternatives: ps,
    plan: ps.find((p) => p.key === S.objective),
    stateLabel: {
      normal: "正常设备状态",
      full: "恢复完成",
      partial: "部分恢复 · 功率降至35%",
      failed: "恢复失败 · 储能停用",
    }[state],
    parent,
    reviewed: false,
  };
  S.records.push(record);
  S.current = record;
  S.answer = "";
  render();
  toast(
    record.id +
      " 已生成，独立复算 " +
      (Engine.verify(record.plan).ok ? "通过" : "失败"),
  );
  return true;
}
function reviewCurrent() {
  if (!S.current) return;
  S.current.reviewed = true;
  render();
  toast("已记录人工审阅 · 未下发设备指令");
}
function assistant() {
  return `<aside class="assistant"><div class="assistant-head"><span class="avatar" style="background:#dceccb;color:#397443">✧</span><div><b>能源分析助手</b><div class="owner">规则解释 · 非在线大模型</div></div></div><div class="assistant-body"><div class="sub">当前引用 ${S.current ? S.current.id : "预览输入"} · 不进行独立数值猜测</div><div class="bubble">${S.answer || "你可以从费用与碳排的权衡开始。生成方案后，我会依据本次计算结果解释曲线，并提供检查与参数入口。"}</div>${[
    ["为什么这样充放电？", "schedule"],
    ["低碳方案满足预算吗？", "budget"],
    ["这个结果通过了哪些检查？", "checks"],
  ]
    .map(
      (a) =>
        `<button class="prompt" onclick="ask('${a[1]}')">${a[0]} ↗</button>`,
    )
    .join(
      "",
    )}<div class="actions" style="margin-top:15px">${btn("执行详情", "showTeam()", "small")}${btn("导出报告", "exportReport()", "small", !S.current)}</div><p class="assistant-foot">解释来自本次计划和固定规则。电网分析使用简化限额筛查；正式预测、潮流与故障算法尚待接入。</p></div></aside>`;
}
function ask(type) {
  const p = plan(),
    base = (S.current?.alternatives || draft)[0],
    v = Engine.verify(p);
  if (type === "schedule") {
    const charges = p.rows
      .filter((r) => r.charge > 0.1)
      .map((r) => String(r.h).padStart(2, "0") + ":00");
    S.answer = `当前采用“${p.name}”。充电时段为 ${charges.join("、") || "无"}，依据电价与碳因子加权分数、SOC 和功率边界选择；末端恢复初始能量也可能触发补充充电。<br><br>${btn("查看参数依据", "go('parameters')", "small")}`;
  }
  if (type === "budget")
    S.answer = `本方案费用 ${fmt(p.cost)} 元；同输入经济基准 ${fmt(base.cost)} 元，增幅 ${fmt((p.cost / base.cost - 1) * 100)}%。预算上限 ${fmt(base.cost * (1 + currentConfig().budget / 100))} 元，因此${p.cost <= base.cost * (1 + currentConfig().budget / 100) + 1e-6 ? "满足" : "超出"} ${currentConfig().budget}% 费用增幅约束。<br><br>购电碳排 ${fmt(p.carbon)} kgCO₂。${p.carbon >= base.carbon - 1e-6 ? "当前候选未产生额外减碳收益，不保证每个配置都有改善。" : ""}`;
  if (type === "checks")
    S.answer = S.current
      ? `独立复算：${v.ok ? "通过" : "失败"}。最大功率平衡残差 ${v.balance.toExponential(1)} kW。<br><br>演示电网检查仅筛查 250 kW 变压器有功限额，不覆盖电压、无功或动态稳定性。<br><br>${btn("打开验证依据", "showEvidence('verification')", "small")}`
      : "请先生成方案，再查看有记录的验证结果。";
  render();
}
function topology() {
  const f = S.fault,
    status = !f
      ? "正常"
      : !f.feedback
        ? "故障 · 待反馈"
        : {
            full: "恢复完成",
            partial: "部分恢复",
            failed: "停用",
            none: "无反馈",
          }[f.feedback];
  const faulted = f && f.feedback !== "full";
  return `<div class="topology"><svg viewBox="0 0 660 290" role="img" aria-label="园区简化拓扑：电网连接变压器和母线，负荷、光伏、储能连接母线"><defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#dfe7dc"/></pattern></defs><rect width="660" height="290" fill="url(#dots)"/><g stroke="#7f9c82" stroke-width="2" fill="none"><path d="M60 140H150M210 140H300M300 70V220M300 80H470M300 145H470M300 215H470"/><path d="M400 215H470" stroke="${faulted ? "#c66b59" : "#4c9875"}" ${faulted ? 'stroke-dasharray="6 4"' : ""}/></g><g fill="#f8fbf5" stroke="#bdcfb7"><rect x="23" y="112" width="73" height="56" rx="7"/><rect x="150" y="112" width="75" height="56" rx="7"/><rect x="470" y="52" width="151" height="56" rx="7"/><rect x="470" y="117" width="151" height="56" rx="7"/><rect x="470" y="187" width="151" height="56" rx="7" stroke="${faulted ? "#d99785" : "#bdcfb7"}"/></g><g fill="#355b43" font-size="12" text-anchor="middle"><text x="60" y="137">公共电网</text><text x="60" y="153" font-size="9" fill="#889c82">GRID</text><text x="188" y="136">变压器</text><text x="188" y="152" font-size="9">250 kW 限额</text><text x="545" y="76">园区负荷</text><text x="545" y="94" font-size="9">24h 合成曲线</text><text x="545" y="140">光伏系统</text><text x="545" y="158" font-size="9">150 kWp · 假设</text><text x="545" y="210">储能支路 BESS-01</text><text x="545" y="230" font-size="10" fill="${faulted ? "#b25c47" : "#4f8c68"}">${status}</text><text x="300" y="255" font-size="10" fill="#8b9d83">园区母线 · 示意连接关系，不含真实电气参数</text></g>${faulted ? '<circle cx="400" cy="215" r="11" fill="#fae3d8"/><text x="400" y="219" text-anchor="middle" fill="#bd6049" font-size="13">!</text>' : ""}</svg></div>`;
}
function fault() {
  const f = S.fault,
    replanned = f?.newId ? S.records.find((r) => r.id === f.newId) : null;
  return `<div class="notice">故障来自预设仿真事件，诊断与恢复反馈均为演示案例；不代表故障检测准确率。事件发生于 14:00，重规划为全日对照仿真，14:00 前计划保持相同；不执行真实设备控制。</div><div class="actions" style="margin-bottom:18px">${btn(f ? "事件已注入" : "① 注入储能支路故障", "injectFault()", "danger", !!f)}${btn("② 生成恢复建议", "diagnose()", "", !f || f.diagnosed)}${btn("④ 使用有效反馈重规划", "replan()", "primary", !f || !f.feedback || f.feedback === "none" || !!f.newId)}${btn("事件报告", "exportEvent()", "small", !f)}</div><div class="grid2">${panel("园区拓扑与设备状态", topology() + `<div class="chart-note">资产映射：BESS-01 → 支路 SW-B1。故障当前状态与有效恢复反馈分别记录。</div>`, badge(f ? "仿真事件 EVT-001" : "设备正常", f ? "warn" : ""))}${panel(
    "事件处理链",
    `<div class="card-pad"><div class="timeline">${[
      [
        "故障接收",
        f ? "14:00 · BESS-01 支路断开，事件来源：手动注入。" : "等待注入事件。",
        !!f,
      ],
      [
        "诊断与恢复建议",
        f?.diagnosed
          ? "预设诊断：SW-B1 断开；建议检查后复位。建议本身不更新可用状态。"
          : "等待事件及诊断。",
        f?.diagnosed,
      ],
      [
        "恢复反馈",
        f?.feedback
          ? {
              full: "有效反馈：支路恢复，可用功率100%。",
              partial: "有效反馈：部分恢复，可用功率35%。",
              failed: "有效反馈：恢复失败，14:00 后储能停用。",
              none: "无有效反馈：保留故障状态，阻断重规划。",
            }[f.feedback]
          : "等待仿真反馈。",
        f?.feedback && f.feedback !== "none",
      ],
      [
        "重规划与验证",
        f?.newId
          ? `新计划 ${f.newId} 已关联原计划 ${f.original.id}。`
          : "使用有效状态重算，再次独立复算。",
        !!f?.newId,
      ],
    ]
      .map(
        (v) =>
          `<div class="timeline-item ${v[2] ? "done" : ""}"><strong>${v[0]}</strong><p>${v[1]}</p></div>`,
      )
      .join("")}</div></div>`,
  )}</div>${
    f?.diagnosed
      ? panel(
          "③ 选择仿真恢复反馈",
          `<div class="card-pad"><p class="sub">在收到有效反馈之前，不把恢复建议当作已恢复状态。可重置事件后演示不同分支。</p><div class="actions" style="margin-top:16px">${[
            ["full", "恢复完成"],
            ["partial", "部分恢复 · 35%功率"],
            ["failed", "恢复失败 · 储能停用"],
            ["none", "无反馈"],
          ]
            .map((a) =>
              btn(
                a[1],
                `feedback('${a[0]}')`,
                f.feedback === a[0] ? "primary" : "",
                !!f.newId,
              ),
            )
            .join(
              "",
            )}${btn("重置此事件", "S.fault=null;render()", "small")}</div>${f.feedback === "none" ? '<div class="notice error" style="margin-top:16px;margin-bottom:0">未获得有效反馈，不能覆盖设备状态或据此生成正式新计划。</div>' : ""}</div>`,
        )
      : ""
  }${replanned ? `<div style="height:20px"></div>${panel("故障前后方案关联", `<div class="tablewrap"><table><thead><tr><th>方案</th><th>设备状态</th><th>费用 / 元</th><th>碳排 / kgCO₂</th><th>终态 SOC</th><th>独立复算</th></tr></thead><tbody>${[f.original, replanned].map((r) => `<tr><td>${r.id} · ${r.plan.name}</td><td>${r.stateLabel}</td><td>${fmt(r.plan.cost)}</td><td>${fmt(r.plan.carbon)}</td><td>${fmt(r.plan.rows[23].soc)}%</td><td>${Engine.verify(r.plan).ok ? "通过" : "失败"}</td></tr>`).join("")}</tbody></table></div><div class="card-pad"><p class="sub">同一日期、目标和数据版本，设备状态改变。若设备受限导致终态能量不同，费用差异包含终态差异，不能全部归因为策略优劣。</p><div class="actions" style="margin-top:15px">${btn("查看新计划曲线 →", "go('dispatch')", "primary")}${btn("导出事件报告", "exportEvent()")}</div></div>`)}` : ""}<div style="height:20px"></div>${panel("电网分析模块 · 输入与检查范围", `<div class="card-pad"><div class="detailbox"><div><b>网络输入</b><p>示意母线与设备映射、假设变压器限额。尚无真实线路阻抗、电压与无功参数。</p></div><div><b>演示校核</b><p>对计划最大购电功率进行 250 kW 有功限额筛查。未接入 AC 潮流，不声称电网安全验收。</p></div><div><b>恢复交付</b><p>事件、诊断依据、恢复建议、反馈状态及版本。有效反馈传递给调度模块形成关联新计划。</p></div></div></div>`, badge("负责人 · 高翰林"))}`;
}
function injectFault() {
  if (!dispatchReady()) return false;
  if (S.missing) {
    toast("请先恢复碳因子并生成原计划");
    return;
  }
  if ((!S.current || S.current.plan.state !== "normal") && !runPlan())
    return false;
  S.fault = {
    original: S.current,
    diagnosed: false,
    feedback: null,
    newId: null,
  };
  S.page = "fault";
  render();
  toast("已注入 EVT-001：14:00 储能支路故障");
}
function diagnose() {
  if (!S.fault) return;
  S.fault.diagnosed = true;
  render();
  toast("已生成预设恢复建议，等待反馈");
}
function feedback(value) {
  S.fault.feedback = value;
  render();
  toast(
    value === "none"
      ? "无有效反馈，重规划已阻断"
      : "有效反馈已记录，尚未重规划",
  );
}
function replan() {
  if (!dispatchReady()) return false;
  const f = S.fault;
  if (!f || !f.feedback || f.feedback === "none") return;
  const cfg = f.original.config;
  Object.assign(S, {
    capacity: cfg.capacity,
    power: cfg.power,
    budget: cfg.budget,
    scenario: cfg.scenario,
    date: cfg.date,
    dataVersion: cfg.version,
  });
  data = Engine.dataset(S.scenario);
  draft = Engine.plans(data, S);
  S.objective = f.original.plan.key;
  if (runPlan(f.feedback, f.original.id, f.original.plan.rows)) {
    f.newId = S.current.id;
    S.page = "fault";
    render();
  }
}
function reports() {
  return `<div class="actions" style="margin-bottom:20px">${btn("导出当前方案", "exportReport()", "primary", !S.current)}${btn("团队执行详情", "showTeam()")}${btn("返回调度工作台", "go('dispatch')")}</div>${panel(
    "方案历史与审阅记录",
    S.records.length
      ? `<div class="tablewrap"><table><thead><tr><th>计划 / 时间</th><th>目标与输入</th><th>设备状态</th><th>费用 / 元</th><th>碳排 / kgCO₂</th><th>审阅</th><th>操作</th></tr></thead><tbody>${[
          ...S.records,
        ]
          .reverse()
          .map(
            (r) =>
              `<tr class="${S.current?.id === r.id ? "selected" : ""}"><td><strong>${r.id}</strong><br><span class="sub">${r.created}</span></td><td>${r.plan.name}<br><span class="sub">DEMO-D${r.config.version} · ${r.config.capacity} kWh<br>${r.config.date}</span></td><td>${r.stateLabel}${r.parent ? "<br>关联 " + r.parent : ""}</td><td>${fmt(r.plan.cost)}</td><td>${fmt(r.plan.carbon)}</td><td>${r.reviewed ? "已审阅" : "待审阅"}</td><td>${btn("查看", `openRecord('${r.id}')`, "small")}</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : '<div class="empty">尚无方案记录。<br>进入调度工作台，生成第一份演示计划。</div>',
    badge(S.records.length + " 份 · 当前会话"),
  )}<div class="grid2 equal" style="margin-top:20px">${panel(
    "证据与版本",
    `<div class="card-pad">${[
      [
        "数据与时间窗口",
        "合成负荷 / 光伏 / 电价 / 碳因子，24h，Asia/Shanghai",
        "data",
      ],
      [
        "预测接口与误差",
        "历史预测和实际值（模拟）；未来日期无实际误差",
        "forecast",
      ],
      [
        "独立复算依据",
        "功率平衡、能量递推、SOC边界、费用与碳排",
        "verification",
      ],
    ]
      .map(
        (v) =>
          `<div class="row"><div><strong>${v[0]}</strong><p>${v[1]}</p></div>${btn("查看", `showEvidence('${v[2]}')`, "small")}</div>`,
      )
      .join("")}</div>`,
  )}${panel("交付边界", `<div class="card-pad"><p class="sub">本 Demo 用于产品流程演示和团队答辩。生成记录保存在当前页面会话中，刷新将清空，请及时导出。</p><div class="row"><strong>已实现</strong><p>联动曲线、候选比较、独立复算、四种恢复反馈、报告导出。</p></div><div class="row"><strong>待接入</strong><p>真实数据、正式预测模型、优化求解器、潮流与故障算法、在线大模型。</p></div></div>`)}</div>${teamCards()}`;
}
function openRecord(id) {
  const r = S.records.find((r) => r.id === id);
  if (!r || !recordInputsReady(r)) return false;
  S.current = r;
  Object.assign(S, {
    capacity: r.config.capacity,
    power: r.config.power,
    budget: r.config.budget,
    scenario: r.config.scenario,
    date: r.config.date,
    dataVersion: r.config.version,
    objective: r.plan.key,
  });
  data = Engine.dataset(S.scenario);
  draft = Engine.plans(data, S);
  S.missing = false;
  S.answer = "";
  go("dispatch");
}
function modal(title, content) {
  $("#detail-body").innerHTML = `<h2>${title}</h2>${content}`;
  $("#detail").showModal();
  if (typeof translateContainer === "function")
    translateContainer($("#detail-body"));
}
function showEvidence(type) {
  let content, title;
  if (type === "verification") {
    if (!S.current) {
      modal("独立复算", "<p>请先生成一个方案，查看有记录的检查结果。</p>");
      return;
    }
    const v = Engine.verify(plan());
    title = S.current.id + " · 独立复算";
    content = `<p>从逐时输入输出重新累计，不以计划声明的总值代替复算。容差：1e-6。检查范围不包含 AC 潮流。</p><pre>${JSON.stringify(v, null, 2)}</pre><p>终态能量差单位 kWh；停用故障可能导致末端无法回到初始值，已单独记录。</p>`;
  } else {
    const d =
      type === "data"
        ? {
            source: "DEMO：全部为确定性合成序列",
            version: "DEMO-D" + S.dataVersion,
            date: S.date,
            timezone: "Asia/Shanghai",
            interval: "1h",
            count: 24,
            scenario: S.scenario,
            missing: S.missing ? ["carbon"] : [],
            firstRow: {
              hour: 0,
              load_kW: data.load[0],
              pv_kW: data.pv[0],
              price_CNY_per_kWh: data.price[0],
              carbon_kgCO2_per_kWh: S.missing ? null : data.carbon[0],
            },
          }
        : type === "forecast"
          ? {
              owner: "韦佳伶",
              model: "DEMO-F1：规则合成，非训练模型",
              input: ["历史负荷（待接入）", "气象（待接入）", "光伏设备参数"],
              output: [
                "load[24] kW",
                "pv[24] kW",
                "issued_at",
                "valid_window",
                "version",
              ],
              load_error: historicalDate()
                ? Engine.error(data.load, data.actual)
                : null,
              pv_error: historicalDate()
                ? Engine.error(data.pv, data.actualPV)
                : null,
              evaluation: "合成参考序列，不代表独立实测测试集",
            }
          : {
              owner: "凌俊楷",
              carbon_source: "DEMO-C1 合成因子",
              carbon_boundary: "购电碳排，不含生命周期",
              pv_kWp: 150,
              battery_capacity_kWh: S.capacity,
              battery_power_kW: S.power,
              charge_efficiency: 0.95,
              discharge_efficiency: 0.95,
              soc_min: 0.15,
              soc_max: 0.9,
              soc_initial: 0.5,
            };
    title = {
      data: "输入与来源",
      forecast: "预测模块接口",
      parameters: "碳因子与设备参数",
    }[type];
    content = `<p>供答辩检查的演示字段，正式模型可保持同类接口替换实现。</p><pre>${JSON.stringify(d, null, 2)}</pre>`;
  }
  modal(title, content);
}
function showTeam() {
  modal(
    "团队模块与本次执行详情",
    `<p>以下展示文档分工与当前 Demo 的实现边界；不代表各成员真实算法已经接入，也不用于推断实际工时。</p><table><thead><tr><th>成员</th><th>模块 / 交付</th><th>本次演示实现</th></tr></thead><tbody><tr><td>韦佳伶</td><td>预测、数据处理、误差与版本</td><td>合成预测接口与误差复算</td></tr><tr><td>凌俊楷</td><td>碳因子、光储参数、调度参与</td><td>合成因子、设备参数联动</td></tr><tr><td>高翰林</td><td>电网分析、诊断与恢复</td><td>限额筛查、预设故障与反馈分支</td></tr><tr><td>梁紫昱</td><td>调度、Agent、页面与集成</td><td>启发式计划、规则解释、版本与报告</td></tr></tbody></table><h3 style="margin-top:22px">当前执行链</h3><pre>输入 DEMO-D${S.dataVersion} → 时间/单位/完整性检查
→ DEMO-F1 合成预测 + DEMO-C1 碳因子
→ 81 组候选权重扫描（非全局优化求解）
→ 独立功率 / 能量 / 费用 / 碳排复算
→ 250 kW 有功限额筛查（非 AC 潮流）
→ ${S.current ? S.current.id + " / " + S.current.plan.name : "尚未生成计划"}
→ 规则解释 / 人工审阅 / 报告</pre>`,
  );
}
function reportText(r) {
  const v = Engine.verify(r.plan);
  return `# EnergyOps 演示方案报告\n\n计划：${r.id}\n场景日期：${r.config.date}\n时区：Asia/Shanghai；粒度：1h\n目标：${r.plan.name}\n预测输出：${r.inputs?.forecast || "—"}\n参数输出：${r.inputs?.parameters || "—"}\n交接状态：导出不等于执行，本页面不发送控制指令。\n数据版本：DEMO-D${r.config.version}\n储能：${r.config.capacity} kWh / ${r.config.power} kW\n设备状态：${r.stateLabel}\n父计划：${r.parent || "无"}\n预计购电费用：${fmt(r.plan.cost, 2)} 元\n购电碳排：${fmt(r.plan.carbon, 2)} kgCO2\n弃光：${fmt(r.plan.curtail, 2)} kWh\n允许费用增幅：${r.config.budget}%（相对同设备状态的经济启发式基准）\n终态SOC：${fmt(r.plan.rows[23].soc, 2)}%\n独立复算：${v.ok ? "通过" : "失败"}；功率平衡最大残差 ${v.balance}\n电网检查：250 kW有功限额筛查${Math.max(...r.plan.rows.map((x) => x.grid)) <= 250 ? "通过" : "越限"}，未执行AC潮流\n人工审阅：${r.reviewed ? "已标记" : "待审阅"}\n\n## 数据与算法边界\n全部数据为合成，预测与参考值非实测。规则启发式扫描81组权重，不保证全局最优；AI为规则解释，未接入在线模型。不下发设备控制，不证明真实节费、减排、故障检测效果或投资回报。\n\n## 分工\n韦佳伶：负荷与光伏预测；凌俊楷：碳因子与光储参数、调度参与；高翰林：电网与故障恢复；梁紫昱：调度、Agent、页面与集成。正式专业模型待接入。\n\n## 逐时计划\n\n时段,负荷kW,光伏kW,购电kW,充电kW,放电kW,SOC%,电价元/kWh,碳因子kgCO2/kWh\n${r.plan.rows.map((x) => [x.h, x.load, x.pv, x.grid.toFixed(3), x.charge.toFixed(3), x.discharge.toFixed(3), x.soc.toFixed(3), x.price, x.carbon].join(",")).join("\n")}\n`;
}
function download(name, text, type = "text/markdown;charset=utf-8") {
  const a = document.createElement("a"),
    url = URL.createObjectURL(new Blob(["\ufeff", text], { type }));
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("报告已生成并下载");
}
function exportReport() {
  if (!S.current) {
    toast("请先生成方案");
    return;
  }
  download(S.current.id + "-方案报告.md", reportText(S.current));
}
function exportEvent() {
  const f = S.fault;
  if (!f) return;
  const newer = S.records.find((r) => r.id === f.newId);
  download(
    "EVT-001-故障恢复报告.md",
    `# EnergyOps 仿真事件报告\n\n事件：EVT-001 / 14:00 / BESS-01 → SW-B1\n来源：用户手动注入的预设事件\n诊断：${f.diagnosed ? "预设储能支路断开，建议检查后复位" : "尚未生成"}\n反馈：${{ full: "恢复完成", partial: "部分恢复，功率35%", failed: "恢复失败，储能停用", none: "无有效反馈" }[f.feedback] || "尚无反馈"}\n原计划：${f.original.id}\n新计划：${f.newId || "未生成"}\n\n重规划为全日对照仿真，故障前动作保持一致；不声称在线实时恢复。终态能量差单独记录。\n\n${reportText(f.original)}\n${newer ? reportText(newer) : "无新计划，不覆盖原计划。"}\n`,
  );
}
const tours = {
  normal: [
    [
      "forecast",
      "查看预测与合成误差",
      "确认分析窗口，并查看负荷/光伏模块的输入与输出。",
    ],
    [
      "parameters",
      "确认碳因子与设备参数",
      "查看时变碳因子，可修改储能容量，观察配置版本更新。",
    ],
    [
      "dispatch",
      "生成方案并比较",
      "点击“生成并检查方案”，查看三种目标、曲线和规则解释。",
    ],
    ["reports", "复核与导出", "查看当前方案版本、验证依据，并导出报告。"],
  ],
  fault: [
    [
      "dispatch",
      "准备正常基准方案",
      "先生成正常计划，为后续故障建立比较基准。",
    ],
    ["fault", "注入事件并生成建议", "依次点击“注入故障”“生成恢复建议”。"],
    ["fault", "记录有效恢复反馈", "选择恢复完成、部分恢复、恢复失败或无反馈。"],
    [
      "fault",
      "重规划与导出事件报告",
      "有效反馈后点击重规划，比较新旧计划并导出报告。",
    ],
  ],
};
function startTour(type) {
  if (type === "fault" && !dispatchReady()) {
    go("forecast");
    return;
  }
  S.tour = type;
  S.step = 0;
  go(tours[type][0][0]);
}
function tourBanner() {
  const steps = tours[S.tour],
    a = steps[S.step];
  return `<div class="tour"><div><strong>${S.tour === "normal" ? "正常调度" : "故障恢复"}演示 · ${S.step + 1}/4 · ${a[1]}</strong><div style="font-size:11px;opacity:.8;margin-top:6px">${a[2]}</div></div><div class="actions">${S.step > 0 ? btn("上一步", "tourMove(-1)", "small") : ""}${btn(S.step === 3 ? "结束引导" : "下一步 →", S.step === 3 ? "S.tour=null;render()" : "tourMove(1)", "small")}${btn("退出", "S.tour=null;render()", "small")}</div></div>`;
}
function tourMove(n) {
  if (n > 0) {
    if (S.tour === "normal" && S.step === 2 && !S.current) {
      toast("请先生成方案再进入报告");
      return;
    }
    if (S.tour === "fault") {
      if (S.step === 0 && !S.current) {
        toast("请先生成正常方案");
        return;
      }
      if (S.step === 1 && !S.fault?.diagnosed) {
        toast("请先注入事件并生成恢复建议");
        return;
      }
      if (S.step === 2 && !S.fault?.feedback) {
        toast("请先选择恢复反馈");
        return;
      }
    }
  }
  const nextStep = Math.min(3, Math.max(0, S.step + n));
  if (tours[S.tour][nextStep][0] === "dispatch" && !dispatchReady()) return;
  S.step = nextStep;
  go(tours[S.tour][S.step][0]);
}
function resetDemo() {
  S.archive = [];
  S.forecastId = null;
  S.parameterId = null;
  S.safety = null;
  S.page = "forecast";
  S.outputs = { forecast: null, parameters: null };
  S.scenario = "sunny";
  S.capacity = 320;
  S.power = 60;
  S.budget = 5;
  S.objective = "balanced";
  S.date = "2026-02-19";
  S.dataVersion = 1;
  S.records = [];
  S.current = null;
  S.fault = null;
  S.missing = false;
  S.tour = null;
  S.answer = "";
  data = Engine.dataset();
  draft = Engine.plans(data, S);
  render();
  toast("已恢复初始演示状态");
}
// The business UI performs the only initial render.
