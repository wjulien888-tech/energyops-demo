/* Enterprise workbench presentation, based on the local APX reference layouts. */
const UI = { curve: "power", forecast: "load", allRows: false, help: false };
Object.assign(colors, {
  load: "#1677ff",
  pv: "#1cad78",
  grid: "#ff9b40",
  soc: "#8363dd",
  charge: "#1677ff",
  discharge: "#1cad78",
  actual: "#9ca8b8",
});
const businessNav = [
  ["planning", "建设前配置比较"],
  ["overview", "运行总览"],
  ["forecast", "负荷与光伏预测"],
  ["parameters", "碳因子与设备参数"],
  ["dispatch", "日前调度方案"],
  ["fault", "故障恢复管理"],
  ["reports", "方案与报告管理"],
];
function ico(type) {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    chart: '<path d="M4 4v16h17M8 15l4-5 4 3 5-8"/>',
    bolt: '<path d="M14 2L5 14h7l-2 8 9-12h-7z"/>',
    file: '<path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h6"/>',
    settings:
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    folder: '<path d="M3 7V5h7l2 3h9v12H3z"/>',
    alert: '<path d="M12 3L2 21h20zM12 9v5m0 3v1"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0114-2l1 3M4 15l1 3a8 8 0 0014-2"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
  };
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type] || paths.folder}</svg>`;
}
function render() {
  if (S.page === "dispatch" && !dispatchReady()) S.page = "forecast";
  const title = businessNav.find((n) => n[0] === S.page)?.[1] || "日前调度方案";
  $("#app").innerHTML =
    `<div class="business-shell"><header class="system-header"><div class="system-brand"><b>Energy<span>Ops</span></b><i></i><span>园区能源管理系统</span></div><div class="header-actions"><button class="language-toggle" onclick="toggleLanguage()">${interfaceLanguage === "zh" ? "EN" : "ZH"}</button><span class="env-tag">${(S.jointForecast || (S.loadModel && S.loadModel !== "demo")) ? "模型结果" : "模拟环境"}</span><span class="header-region">科广校园　⌄</span><span class="usericon">${ico("user")}</span><span>演示用户</span></div></header><nav class="quick-nav">${[
      ["grid", "园区总览", "overview"],
      ["chart", "能源预测", "forecast"],
      ["bolt", "运行调度", "dispatch"],
      ["alert", "故障管理", "fault"],
      ["file", "报表管理", "reports"],
    ]
      .map(
        (a) =>
          `<button title="${a[1]}" aria-label="${a[1]}" class="rail-item ${S.page === a[2] || (a[2] === "dispatch" && S.page === "parameters") ? "active" : ""}" ${a[2] === "dispatch" ? `data-dispatch-entry ${dispatchReady() ? "" : "disabled"}` : ""} onclick="go('${a[2]}')">${ico(a[0])}<span>${a[1]}</span></button>`,
      )
      .join(
        "",
      )}</nav><aside class="side-menu"><h2>能源运行管理</h2><div class="menu-section">业务管理</div>${businessNav.map((a) => `<button class="menu-item ${S.page === a[0] ? "active" : ""}" ${a[0] === "dispatch" ? `data-dispatch-entry ${dispatchReady() ? "" : "disabled"}` : ""} onclick="go('${a[0]}')" aria-label="${a[1]}">${ico(a[0] === "overview" ? "grid" : a[0] === "fault" ? "alert" : "folder")}<span>${a[1]}</span></button>`).join("")}<div class="menu-section">演示工具</div><button class="menu-item secondary" onclick="startTour('normal')">${ico("chart")}<span>正常调度流程</span></button><button class="menu-item secondary" onclick="startTour('fault')">${ico("alert")}<span>故障恢复流程</span></button><button class="menu-item secondary" onclick="window.open('campus3d/','_blank')">${ico("grid")}<span>校园 3D 数字孪生</span></button><div class="side-bottom"><span class="statusdot"></span>浏览器本地计算<br><span>时区：Asia/Shanghai</span></div></aside><main class="main"><div class="page-tabs"><span class="tab-home" onclick="go('overview')">${ico("grid")}</span><button class="page-tab active">${title}</button><div class="tab-tools">${btn("重置演示", "resetDemo()", "text-btn")}</div></div><div class="content">${S.tour ? tourBanner() : ""}${{ overview, planning, forecast, parameters, dispatch, fault, reports }[S.page]()}<footer class="system-footer">${(S.jointForecast || (S.loadModel && S.loadModel !== "demo")) ? "模型预测结果 · 15分钟展示 / 小时调度" : "数据类型：模拟　｜　时间粒度：1小时"}　｜　仅用于方案仿真与演示，不下发设备指令</footer></div></main></div>`;
  translateInterface();
}
function queryBar(extra = "", run = false) {
  return `<section class="card query-card"><div class="filter-fields"><div class="field"><label for="q-park">园区名称</label><select id="q-park"><option>科广校园（演示）</option></select></div><div class="field"><label for="day">运行日期</label><input id="day" type="date" min="${MEETING.first}" max="${MEETING.last}" value="${S.date}" oninput="invalidateOutputs()"></div><div class="field"><label>数据来源</label><div class="readonly">模拟数据</div></div><div class="field"><label>数据版本</label><div class="readonly">DEMO-D${S.dataVersion}</div></div>${extra}</div><div class="query-actions"><div class="actions">${btn(ico("search") + "查询", "applyFilters()", "primary")}${btn("重置条件", "resetFilters()")}</div><div class="actions">${run ? btn("输入检查", "showEvidence('data')") + btn(ico("bolt") + "生成调度方案", "generateFromForm()", "primary") : btn("数据详情", "showEvidence('data')", "", (S.page === "forecast" && !forecastReady()) || (S.page === "parameters" && !parametersReady()))}</div></div></section>`;
}
function resetFilters() {
  const changed = S.date !== "2026-02-19";
  if (changed) {
    invalidateOutputs();
    S.date = "2026-02-19";
    S.dataVersion++;
  }
  if (changed) draft = Engine.plans(data, S);
  render();
}
function kpi(label, value, unit, note) {
  return `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value">${value}<span class="unit">${unit}</span></div><div class="kpi-note">${note}</div></div>`;
}
const planningStorage = [
  { power: 64, capacity: 320 },
  { power: 250, capacity: 600 },
  { power: 300, capacity: 800 },
];
let planningComparison = null;
function changePlanningPv(value, redraw = true) {
  const pvKwp = Number(value);
  if (!Number.isFinite(pvKwp) || pvKwp < 1 || pvKwp > 20077.2) {
    toast("请输入 1–20,077.2 kWp 的候选装机容量");
    return false;
  }
  if (pvKwp === S.planningPvKwp) return true;
  S.planningPvKwp = pvKwp;
  planningComparison = null;
  invalidateOutputs();
  S.dataVersion++;
  if (S.jointForecast) applyJointForecast();
  if (redraw) render();
  return true;
}
function applyPendingPlanningPv() {
  const field = $("#custom-pv");
  return !field || changePlanningPv(field.value, false);
}
function comparePlanningStorage() {
  if (!applyPendingPlanningPv()) return;
  const days = planningDays();
  let peakSurplus = 0;
  let maxDailySurplus = 0;
  for (const day of days) {
    const surplus = day.pv.map((pv, hour) => Math.max(0, pv - day.load[hour]));
    peakSurplus = Math.max(peakSurplus, ...surplus);
    maxDailySurplus = Math.max(maxDailySurplus, surplus.reduce((sum, value) => sum + value, 0));
  }
  const rows = planningStorage.map(({power, capacity}) => {
    const totals = { cost: 0, carbon: 0, curtail: 0, peak: 0 };
    for (const day of days) {
      const plan = Engine.plans(day, { power, capacity, budget: 5 })[2];
      totals.cost += plan.cost;
      totals.carbon += plan.carbon;
      totals.curtail += plan.curtail;
      totals.peak = Math.max(totals.peak, ...plan.rows.map(row => row.grid));
    }
    return totals;
  });
  planningComparison = { pvKwp: S.planningPvKwp, profile: S.carbonProfile, days: days.length, rows, peakSurplus, maxDailySurplus };
  render();
}
function selectPlanningStorage(index) {
  const candidate = planningStorage[index];
  if (!candidate || !applyPendingPlanningPv()) return;
  invalidateOutputs("parameters");
  Object.assign(S, candidate);
  S.dataVersion++;
  if (!S.jointForecast) usePlanningForecast();
  else applyJointForecast();
  go("forecast");
}
function planningCapacityBasis(pvKwp) {
  const roofKwp = 10350.6;
  const mwp = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(pvKwp / 1000);
  const count = fmt(pvKwp / 0.65, 0);
  const roofShare = fmt(pvKwp / roofKwp * 100, 1);
  const english = interfaceLanguage === "en";
  const basis = pvKwp <= roofKwp
    ? english
      ? `<strong>${mwp} MWp</strong> is about ${roofShare}% of the planned rooftop capacity, or approximately ${count} panels rated at 650 Wp. It can be studied as a partial-rooftop scenario.`
      : `<strong>${mwp} MWp</strong> 约占图纸屋顶规划容量的 ${roofShare}%，按 650 Wp 组件折算约 ${count} 块，可作为部分屋顶的规划情景。`
    : english
      ? `<strong>${mwp} MWp</strong> exceeds the rooftop allowance by ${fmt(pvKwp - roofKwp, 1)} kWp and corresponds to approximately ${count} panels rated at 650 Wp. The excess requires wall or parking areas.`
      : `<strong>${mwp} MWp</strong> 超出图纸屋顶规划容量约 ${fmt(pvKwp - roofKwp, 1)} kWp，按 650 Wp 组件折算约 ${count} 块，超出部分需利用墙面或停车场。`;
  return `<section class="planning-capacity-basis">
    <h4>${english ? `Basis for ${mwp} MWp` : `${mwp} MWp 装机依据`}</h4>
    <p>校园布置图第 1 页容量表列出屋顶 10,350.6 kWp、墙面 9,422.4 kWp、停车场 304.2 kWp，合计 20,077.2 kWp。</p>
    <p>${basis}</p>
    <p>具体屋顶、结构与并网条件待校核。仿真出力沿用按装机比例缩放的全建预测曲线。</p>
    <figure class="planning-pv-layout">
      <a href="campus-pv-layout.png" target="_blank" rel="noopener">
        <img src="campus-pv-layout.png" alt="校园光伏布置图，右下角为装机容量表" width="2300" height="1627" loading="lazy">
      </a>
      <figcaption>校园光伏布置图 · 点击查看大图</figcaption>
    </figure>
  </section>`;
}
function planning() {
  const result = planningComparison?.pvKwp === S.planningPvKwp &&
    planningComparison.profile === S.carbonProfile ? planningComparison : null;
  return panel("建设前配置比较", `<div class="card-pad">
    <p>比较候选设备规格，选定后进入一次完整的园区调度仿真。</p>
    <div class="field"><label for="planning-pv">候选光伏装机</label>
    <select id="planning-pv" onchange="changePlanningPv(this.value)">
      <option value="6000" ${S.planningPvKwp === 6000 ? "selected" : ""}>6 MWp · 屋顶分期建设情景</option>
      <option value="20077.2" ${S.planningPvKwp === 20077.2 ? "selected" : ""}>20.0772 MWp · 全建压力测试</option>
      ${[6000, 20077.2].includes(S.planningPvKwp) ? "" : `<option selected value="${S.planningPvKwp}">${S.planningPvKwp} kWp</option>`}
    </select></div>
    <div class="field"><label for="custom-pv">自定义装机（kWp）</label>
    <input id="custom-pv" type="number" min="1" max="20077.2" step="0.1" value="${S.planningPvKwp}"></div>
    ${btn("应用装机", "changePlanningPv(document.querySelector('#custom-pv').value)", "small")}
    ${planningCapacityBasis(S.planningPvKwp)}
    ${btn("比较候选储能", "comparePlanningStorage()", "primary")}
    ${result ? `<p role="status">${result.days} 个样本日 · 日前计划指标</p>
      <p>无储能时，小时最大光伏富余 ${fmt(result.peakSurplus)} kW；单日最大光伏富余 ${fmt(result.maxDailySurplus)} kWh。</p>
      <p>功率参考小时富余峰值；容量参考可用 SOC 窗口、效率和富余持续时间。600 kWh 在 SOC 15%–90% 下有 450 kWh 的可用能量窗口。</p>
      <p>演示假设充放电共用同一功率上限。实际放电功率还需按目标削峰幅度、持续时长和并网限额校核。</p>` : ""}
    <div class="tablewrap"><table><thead><tr><th>功率／容量</th><th>弃光 (kWh)</th><th>购电费用 (元)</th><th>购电碳排 (kgCO₂)</th><th>峰值购电 (kW)</th><th>选择</th></tr></thead>
    <tbody>${planningStorage.map((candidate, index) => {
      const stats = result?.rows[index];
      return `<tr><td>${candidate.power} kW / ${candidate.capacity} kWh</td>
        <td>${stats ? fmt(stats.curtail) : "—"}</td><td>${stats ? fmt(stats.cost) : "—"}</td>
        <td>${stats ? fmt(stats.carbon) : "—"}</td><td>${stats ? fmt(stats.peak) : "—"}</td>
        <td>${btn("选用并开始调度", `selectPlanningStorage(${index})`, "small")}</td></tr>`;
    }).join("")}</tbody></table></div>
  </div>`);
}
function overview() {
  const p = plan();
  return `${queryBar()}<div class="kpis overview-stats">${kpi(
    "用电量",
    fmt(
      data.load.reduce((a, b) => a + b, 0),
      1,
    ),
    "kWh",
    "模拟负荷 · 24个时段",
  )}${kpi(
    "光伏发电量",
    fmt(
      data.pv.reduce((a, b) => a + b, 0),
      1,
    ),
    "kWh",
    "模拟发电数据",
  )}${kpi("储能容量", fmt(S.capacity, 0), "kWh", `额定功率 ${S.power} kW`)}${kpi("已生成方案", S.records.length, "份", S.current ? "当前方案 " + S.current.id : "暂无计算记录")}</div><div class="grid2 overview-grid">${panel(
    "能源供需曲线",
    chart(
      [
        { name: "负荷", values: data.load, color: colors.load },
        { name: "光伏", values: data.pv, color: colors.pv },
        ...(S.current
          ? [
              {
                name: "购电",
                values: p.rows.map((r) => r.grid),
                color: colors.grid,
              },
            ]
          : []),
      ],
      "kW",
      230,
    ),
    `<span class="sub">${S.date}　00:00—23:00 · 各曲线为功率幅值</span>`,
  )}${panel("设备运行信息", `<div class="tablewrap"><table><thead><tr><th>设备</th><th>参数</th><th>状态</th></tr></thead><tbody><tr><td>光伏系统</td><td>${currentPvKwp()} kWp</td><td>${badge("可用")}</td></tr><tr><td>储能系统</td><td>${S.capacity} kWh / ${S.power} kW</td><td>${badge(S.fault && S.fault.feedback !== "full" ? "事件处理中" : "可用", S.fault ? "warn" : "")}</td></tr><tr><td>园区变压器</td><td>${gridScreenLabel()}</td><td>${badge(S.jointForecast ? "待验证" : "参数已配置")}</td></tr></tbody></table></div><div class="note-line">校园负荷案例、光伏150 kWp和储能均为合成演示假设，非现场设备监测；电表购电不直接等于含光伏系统的总负荷。</div>`)}</div>${S.current ? panel("储能SOC", chart([{ name: "SOC", values: p.rows.map((r) => r.soc), color: colors.soc }], "%", 150)) : ""}${panel("业务处理", `<div class="tablewrap"><table><thead><tr><th>业务事项</th><th>处理内容</th><th>关联记录</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td>日前调度</td><td>基于负荷、光伏、电价与碳因子生成方案</td><td>${S.current?.id || "—"}</td><td>${badge(S.current ? "已计算" : "待计算", S.current ? "" : "warn")}</td><td>${btn("进入调度", "go('dispatch')", "link-btn")}</td></tr><tr><td>故障恢复</td><td>诊断、恢复反馈、状态更新与重规划</td><td>${S.fault ? "EVT-001" : "—"}</td><td>${badge(S.fault?.newId ? "已重规划" : S.fault ? "处理中" : "暂无事件", S.fault && !S.fault.newId ? "warn" : "")}</td><td>${btn("事件管理", "go('fault')", "link-btn")}</td></tr><tr><td>方案报告</td><td>查看历史记录、复算依据与导出报告</td><td>${S.records.length} 份方案</td><td>—</td><td>${btn("查看记录", "go('reports')", "link-btn")}</td></tr></tbody></table></div>`)}<div class="module-strip"><span>专业模块</span>${[
    ["预测", "韦佳伶", "forecast"],
    ["碳因子与设备", "凌俊楷", "parameters"],
    ["调度与集成", "梁紫昱、凌俊楷", "dispatch"],
    ["电网与恢复", "高翰林", "fault"],
  ]
    .map(
      (a) =>
        `<button ${a[2] === "dispatch" ? `data-dispatch-entry ${dispatchReady() ? "" : "disabled"}` : ""} onclick="go('${a[2]}')">${a[0]} <span>${a[1]}</span></button>`,
    )
    .join("")}</div>`;
}
function advanceHourlyFeedback(runToEnd = false) {
  const record = S.current;
  if (!recordInputsReady(record) || S.missing || record.plan.state !== "normal") return;
  let result = record.hourlyFeedback;
  const endHour = runToEnd ? 24 : Math.min(24, (result?.history.length || 0) + 1);
  while ((result?.history.length || 0) < endHour) {
    const next = Engine.advanceSimulation(data, record.config, record.plan, result);
    if (!Engine.verify(next.plan).ok) {
      toast("滚动方案复算失败");
      break;
    }
    result = next;
  }
  record.hourlyFeedback = result;
  render();
}
function hourlyFeedbackPanel() {
  const record = S.current;
  if (!record || record.plan.state !== "normal") return "";
  const result = record.hourlyFeedback;
  const executed = result?.history.length || 0;
  const terminalGap = result ? result.plan.terminal - result.plan.initial : 0;
  return panel("逐小时反馈仿真", `<div class="card-pad">
    <p>每次推进 1 个仿真小时。记录实际负荷、光伏和小时末 SOC，再更新剩余时段。</p>
    ${result?.limits ? `<p>后续储能可用功率 · ${fmt(result.limits.availablePower)} kW</p>` : ""}
    <p role="status">已执行 ${executed} / 24 小时${result ? ` · ${executed === 24 ? "全天结果" : "已执行与剩余计划合计"}：购电 ${fmt(result.plan.cost, 2)} 元，碳排 ${fmt(result.plan.carbon, 2)} kgCO₂` : ""}${Math.abs(terminalGap) > 1e-6 ? ` · 日末电量偏差 ${fmt(terminalGap, 2)} kWh` : ""}</p>
    ${result ? `<div class="hour-table"><table><thead><tr><th>时段</th><th>状态</th><th>负荷 (kW)</th><th>光伏 (kW)</th><th>小时末 SOC (%)</th><th>购电 (kW)</th></tr></thead><tbody>${result.plan.rows.map((row) =>
      `<tr><td>${String(row.h).padStart(2, "0")}:00</td><td>${row.h < executed ? "已执行" : "更新后计划"}</td><td>${fmt(row.load)}</td><td>${fmt(row.pv)}</td><td>${fmt(row.soc)}</td><td>${fmt(row.grid)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    </div>`, `<div class="actions">${btn("推进 1 小时", "advanceHourlyFeedback()", "small", S.missing || executed === 24)}${btn("运行至日末", "advanceHourlyFeedback(true)", "small", S.missing || executed === 24)}</div>`);
}
const dispatchPromptOptions = [
  ["电费优先", "以全天购电费用最低为目标生成调度方案。"],
  ["低碳优先", "以全天购电碳排最低为目标生成调度方案。"],
  ["低碳 · 电费最多增 3%", "优先减碳，但购电费用比经济基准最多增加 3%。"],
  ["低碳 · 电费最多增 5%", "优先减碳，但购电费用比经济基准最多增加 5%。"],
];
function selectDispatchPrompt(index) {
  const input = $("#dispatch-prompt");
  const option = dispatchPromptOptions[index];
  if (!input || !option) return;
  input.value = translateText(option[1]);
  input.focus?.();
}
function dispatchIntentPanel() {
  return panel("用自然语言指定调度目标", `<div class="card-pad">
    <p class="sub">DeepSeek Mock · 本地规则解析</p>
    <div class="field"><label for="dispatch-prompt">管理人员需求</label>
    <textarea id="dispatch-prompt" rows="3" maxlength="4000" placeholder="优先减碳，但购电费用比经济基准最多增加 3%"></textarea></div>
    <div class="actions dispatch-prompt-options" aria-label="常用调度需求">
    ${dispatchPromptOptions.map(([label], index) =>
      btn(label, `selectDispatchPrompt(${index})`, "small outline-blue"),
    ).join("")}
    </div>
    <div class="actions">${btn("解析并生成方案", "generateFromPrompt()", "primary", S.missing)}</div>
  </div>`);
}
function parseMockDispatchIntent(message) {
  const text = message.normalize("NFKC").toLowerCase();
  if (/馈电|反送电|电池容量|储能容量|充放电功率|export to (?:the )?grid|feed.?in|battery capacity|battery power/.test(text)) {
    return null;
  }

  const carbon = /低碳|减碳|降碳|减排|碳排|emissions?|carbon/.test(text);
  const cost = /电费|费用|成本|\bcosts?\b|\bbudget\b/.test(text);
  const costPriority = /(?:电费|费用|成本|经济)(?:最低|最小|优先)|最低(?:电费|费用|成本)|(?:降低|减少|最小化)(?:全天)?(?:购电)?(?:电费|费用|成本)|省电费|(?:lowest|minimum|reduce|minimi[sz]e).*\bcosts?\b|\bcost priority\b|\beconomic\b/.test(text);
  const cap = /最多|不超过|不能超过|不得超过|上限|以内|至多|at most|no more than|(?:not|never) exceed|within|\bcap\b|\blimit\b/.test(text);
  if (cap || /%|\bpercent\b|百分之/.test(text)) {
    const percentages = Array.from(text.matchAll(/([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:%|percent\b)|百分之\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))/g));
    if (!carbon || !cost || !cap || percentages.length !== 1) return null;
    const budget = Number(percentages[0][1] ?? percentages[0][2]);
    return budget >= 0 && budget <= 30
      ? { objective: "balanced", max_cost_increase_pct: budget }
      : null;
  }
  if (carbon === costPriority) return null;
  return { objective: carbon ? "green" : "economic", max_cost_increase_pct: null };
}

function generateFromPrompt() {
  const message = $("#dispatch-prompt")?.value.trim();
  if (!message) {
    toast("请输入调度需求");
    return;
  }
  const intent = parseMockDispatchIntent(message);
  if (!intent) {
    toast("请选择电费优先、低碳优先，或指定 0–30% 的减碳费用增幅上限");
    return;
  }
  if (applyFilters(true) && dispatchReady() && !S.missing) {
    runPlan("normal", null, null, intent);
  }
  const input = $("#dispatch-prompt");
  if (input) input.value = message;
}
function promptPlanSummary(plan, intent) {
  const budget = intent.max_cost_increase_pct;
  return panel("按需求生成的调度方案", `<div class="card-pad">
    <p>模拟解析目标 · <strong>${plan.name}</strong></p>
    ${budget === null ? "" : `<p>相对经济基准的费用增幅上限 · ${fmt(budget, 2)}%</p>`}
    <p>预计购电费用 ${fmt(plan.cost, 2)} 元 · 预计购电碳排 ${fmt(plan.carbon, 2)} kgCO₂</p>
  </div>`);
}
function batteryLogicPanel(dayAhead) {
  const rolling = S.current?.hourlyFeedback;
  const plan = rolling?.plan || dayAhead;
  const row = plan.rows[S.hour];
  const executed = row.h < (rolling?.history.length || 0);
  const pvCharge = Math.min(row.charge, Math.max(0, row.pv - row.load));
  const gridCharge = Math.max(0, row.charge - pvCharge);
  const reason = {
    hold: "当前时段未触发充放电规则",
    unavailable: "储能停用",
    pv_surplus: "优先用富余光伏充电",
    lower_score: "电价与碳因子加权分数偏低，优先安排充电",
    higher_score: "加权分数偏高，安排放电减少购电",
    terminal: "按日末 SOC 目标调整动作",
  }[row.reason];
  const action = row.charge > 1e-6 ? "充电" : row.discharge > 1e-6 ? "放电" : "待机";
  return panel("电池充放电逻辑", `<div class="card-pad">
    <div class="field"><label for="battery-hour">查看时段</label>
    <select id="battery-hour" onchange="selectHour(Number(this.value))">
    ${plan.rows.map(point => `<option value="${point.h}" ${point.h === row.h ? "selected" : ""}>${String(point.h).padStart(2, "0")}:00</option>`).join("")}
    </select></div>
    <p><strong>${action}</strong> · ${executed ? "模拟执行结果" : "计划动作"} · ${reason || ""}</p>
    <p>充电 ${fmt(row.charge, 2)} kW（光伏 ${fmt(pvCharge, 2)} / 电网 ${fmt(gridCharge, 2)}） · 放电 ${fmt(row.discharge, 2)} kW</p>
    <p>SOC ${fmt(row.startSoc, 2)}% → ${fmt(row.soc, 2)}% · 当小时功率上限 ${fmt(row.powerLimit, 2)} kW</p>
    <p>电价 ${fmt(row.price, 2)} 元/kWh · 电网碳因子 ${fmt(row.carbon, 3)} kgCO₂/kWh</p>
    <p class="note-line">动作受功率、SOC 和日末目标约束。若电池满或充电功率不足，多余光伏计入弃光。</p>
  </div>`);
}
function dispatch() {
  const p = plan(),
    ps = S.current?.alternatives || draft,
    base = ps[0],
    cfg = currentConfig(),
    pvEnergy = p.rows.reduce((sum, row) => sum + row.pv, 0),
    v = Engine.verify(p),
    same =
      Math.abs(ps[1].cost - ps[2].cost) < 1e-6 &&
      Math.abs(ps[1].carbon - ps[2].carbon) < 1e-6;
  const intent = S.current?.intent;
  const refs = S.current?.inputs || {
    forecast: S.forecastId,
    parameters: S.parameterId,
  };
  const chartBody =
    UI.curve === "carbon"
      ? chart(
          [
            {
              name: "逐时购电碳排",
              values: p.rows.map((r) => r.grid * r.carbon),
              color: "#7d73c8",
            },
          ],
          "kgCO₂",
          245,
        )
      : UI.curve === "soc"
        ? chart(
            [
              {
                name: "SOC",
                values: p.rows.map((r) => r.soc),
                color: colors.soc,
              },
            ],
            "%",
            245,
          )
        : UI.curve === "battery"
          ? chart(
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
              245,
              { step: true },
            )
          : chart(
              [
                {
                  name: "购电功率",
                  values: p.rows.map((r) => r.grid),
                  color: colors.load,
                },
                {
                  name: "光伏功率",
                  values: p.rows.map((r) => r.pv),
                  color: colors.pv,
                },
                {
                  name: "负荷功率",
                  values: p.rows.map((r) => r.load),
                  color: "#a6afbd",
                  dash: true,
                },
              ],
              "kW",
              245,
            );
  let accumulated = 0;
  const table = p.rows.map((r) => {
    accumulated += r.grid * r.carbon;
    return { ...r, emission: r.grid * r.carbon, accumulated };
  });
  return `${queryBar(
    intent ? "" : `<div class="field"><label for="objective">优化目标</label><select id="objective">${[
      ["economic", "经济优先"],
      ["green", "低碳优先"],
      ["balanced", "成本约束低碳"],
    ]
      .map(
        (a) =>
          `<option value="${a[0]}" ${S.objective === a[0] ? "selected" : ""}>${a[1]}</option>`,
      )
      .join("")}</select></div>`,
    true,
  )}${dispatchIntentPanel()}<div class="source-chain"><span>预测 ${refs.forecast}</span><span>参数 ${refs.parameters}</span><span>${S.date} / 24 × 1h · ${currentPvKwp()} kWp · ${cfg.power} kW / ${cfg.capacity} kWh</span><span>当日预测光伏电量 ${fmt(pvEnergy, 1)} kWh</span><span>${historicalDate() ? "历史方案回放" : "日前预测方案"} · 合成数据</span></div>${intent ? promptPlanSummary(p, intent) : `<section class="card scheme-card meeting-schemes"><div class="cardhead"><h3>调度方案</h3><div class="actions"><span class="sub">${S.current ? "当前：" + S.current.id : "待计算预览"}</span>${btn("设备参数", "go('parameters')", "small")}${btn("计算依据", "showTeam()", "small")}</div></div><div class="scheme-list">${ps.map((r, i) => `<div class="scheme-row ${p.key === r.key ? "selected" : ""}"><div class="scheme-name"><span class="scheme-letter scheme-${i}">方案${String.fromCharCode(65 + i)}</span><strong>${r.name}</strong></div><div><label>预计购电费用</label><b>${fmt(r.cost, 2)} <small>元</small></b></div><div><label>预计购电碳排</label><b>${fmt(r.carbon, 2)} <small>kgCO₂</small></b></div><div><label>预算校核</label>${badge(r.cost <= base.cost * (1 + cfg.budget / 100) + 1e-6 ? "满足" : "超出预算", r.cost <= base.cost * (1 + cfg.budget / 100) + 1e-6 ? "" : "warn")}</div><div class="actions">${btn(p.key === r.key ? "当前方案" : "查看", `choose('${r.key}')`, "small outline-blue")}${btn("导出", `exportAlternative('${r.key}')`, "small", !S.current)}</div></div>`).join("")}</div><div class="scheme-foot"><span>经济基准为同条件候选集中最低费用。C在费用上限内优先减碳。${same ? "当前约束下B、C结果一致，未人为制造差异。" : ""}</span><label for="budget">费用增幅上限 <input id="budget" type="number" min="0" max="30" value="${S.budget}" onchange="applyBudget(this.value)"> %</label>${btn("应用上限", "applyBudget(document.querySelector('#budget').value)", "small")}</div></section>`}${S.missing ? '<div class="notice error">碳因子缺失，方案生成已阻断。</div>' : ""}${batteryLogicPanel(p)}${hourlyFeedbackPanel()}<section class="card dispatch-curves"><div class="cardhead"><h3>调度曲线与时段数据</h3><div class="actions"><span class="sub">储能 ${cfg.capacity} kWh / ${cfg.power} kW</span>${btn("校核详情", "showEvidence('verification')", "small", !S.current)}${btn("导出当前方案", "exportReport()", "small", !S.current)}</div></div><div class="tabline"><div class="tabs">${[
    ["power", "功率计划"],
    ["battery", "储能充放电"],
    ["soc", "SOC曲线"],
    ["carbon", "逐时碳排"],
  ]
    .map(
      (a) =>
        `<button class="tab ${UI.curve === a[0] ? "active" : ""}" onclick="UI.curve='${a[0]}';render()">${a[1]}</button>`,
    )
    .join(
      "",
    )}</div><span class="sub">${S.current ? S.current.id + " · " + S.current.stateLabel : "预览数据，尚未生成记录"}</span></div><div class="dispatch-body"><div class="table-chart"><div class="hour-table"><table><thead><tr><th>时段</th><th>${UI.curve === "carbon" ? "排放(kgCO₂)" : UI.curve === "soc" ? "SOC(%)" : UI.curve === "battery" ? "充电(kW)" : "购电(kW)"}</th><th>${UI.curve === "carbon" ? "购电量(kWh)" : UI.curve === "soc" ? "能量(kWh)" : UI.curve === "battery" ? "放电(kW)" : "负荷(kW)"}</th></tr></thead><tbody>${table
    .slice(0, UI.allRows ? 24 : 8)
    .map(
      (r) =>
        `<tr class="${S.hour === r.h ? "selected" : ""}" onclick="selectHour(${r.h})"><td>${String(r.h).padStart(2, "0")}:00</td><td>${fmt(UI.curve === "carbon" ? r.emission : UI.curve === "soc" ? r.soc : UI.curve === "battery" ? r.charge : r.grid, 2)}</td><td>${fmt(UI.curve === "carbon" ? r.grid : UI.curve === "soc" ? r.energy : UI.curve === "battery" ? r.discharge : r.load, 2)}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table><button class="table-expand" onclick="UI.allRows=!UI.allRows;render()">${UI.allRows ? "收起" : "展开全部24个时段"}　⌄</button></div><div class="curve-main">${chartBody}${balanceTable(p)}<div class="note-line">${UI.curve === "battery" ? "阶梯表示逐小时计划，同一时段充放电互斥；不表示连续采样。" : UI.curve === "carbon" ? "每小时购电量乘碳因子，24小时合计对应方案总排放。" : "功率均显示幅值，储能贡献可由供需核对及充放电/SOC页查看。"}</div></div></div><aside class="strategy"><h4>策略说明 / 校核结果</h4>${strategyItem("blue", "费用与碳排", `预计 ${fmt(p.cost, 2)} 元 / ${fmt(p.carbon, 2)} kgCO₂。不代表实际结算。`)}${strategyItem("green", "设备约束", `初始SOC 50%；终态 ${fmt(p.rows[23].soc, 2)}%。夜间可由初始储电供电，充电也可来自电网。`)}${strategyItem("blue", "独立复算", S.current ? `${v.ok ? "通过" : "失败"}：功率平衡、能量递推、SOC、充放电互斥与指标。` : "待生成方案。")}${strategyItem("orange", "电网校核范围", gridScreenLabel())}<button class="strategy-link" onclick="openExplanation()">查看完整说明</button></aside></div></section><div class="grid3 bottom-metrics">${panel("费用约束", `<div class="metric"><strong>${fmt(base.cost * (1 + cfg.budget / 100), 2)}<small>元</small></strong><span>C方案费用上限；相对经济基准增加不超过 ${cfg.budget}%</span></div>`)}${panel("运行指标", `<div class="metric"><strong>${fmt(p.curtail, 2)}<small>kWh</small></strong><span>弃光电量　｜　终态能量差 ${fmt(p.terminal - p.initial, 2)} kWh</span></div>`)}${panel("方案审阅", `<div class="metric">${badge(S.current?.reviewed ? "已审阅" : "待审阅", S.current?.reviewed ? "" : "warn")}${btn("标记审阅", "reviewCurrent()", "small", !S.current)}${btn("故障恢复", "go('fault')", "small")}</div>`)}</div>${noStoragePanel(p)}${handoffPanel()}<div class="note-line">${btn(S.missing ? "恢复碳因子" : "缺失数据演示", "toggleMissingInput()", "text-btn")}<span>规则启发式扫描，不保证全局最优；预测、因子和设备为合成输入。</span></div>`;
}
function strategyItem(color, title, text) {
  return `<div class="strategy-item"><span class="strategy-dot ${color}"></span><div><b>${title}</b><p>${text}</p></div></div>`;
}
function exportAlternative(key) {
  if (!S.current) return;
  const r = {
    ...S.current,
    plan: S.current.alternatives.find((p) => p.key === key),
  };
  download(r.id + "-" + r.plan.name + "-方案报告.md", reportText(r));
}
function openExplanation() {
  const p = plan(),
    ps = S.current?.alternatives || draft;
  modal(
    "方案说明",
    `<table><tbody><tr><td>当前方案</td><td>${S.current?.id || "预览"} / ${p.name}</td></tr><tr><td>计算方式</td><td>81组电价与碳因子权重候选扫描，不保证全局最优。</td></tr><tr><td>充放电依据</td><td>加权分数、SOC范围、充放电功率及末端能量恢复约束。</td></tr><tr><td>经济基准</td><td>同一输入及设备状态下，候选集中最低费用 ${fmt(ps[0].cost, 2)} 元。</td></tr><tr><td>费用周期</td><td>仅计本日购电支出，放电不再次计费。正常计划初末SOC一致，不以消耗初始储电冒充节省；未计设备投资和折旧。</td></tr><tr><td>碳排边界</td><td>购电量乘以分时碳因子，不含设备全生命周期。</td></tr><tr><td>检查范围</td><td>独立数值复算；${gridScreenLabel()}。</td></tr></tbody></table><p>本说明采用固定规则读取当前方案，无在线大模型调用。</p>`,
  );
}
function outputEmpty(name, visible = true) {
  return `<div class="output-empty" data-output-empty="${name}" ${visible ? "" : "hidden"}>${ico(name === "forecast" ? "chart" : "file")}<span>${name === "forecast" ? "暂无预测结果" : "暂无参数结果"}</span></div>`;
}
function forecast() {
  const ready = forecastReady();
  const header = `${queryBar()}<section class="card"><div class="cardhead"><h3>负荷与光伏预测</h3><div class="actions"><span class="sub">负责人：韦佳伶</span>${btn("模块接口", "showEvidence('forecast')", "small", !ready)}${btn("输出预测数据", "outputForecast()", "primary small")}${btn("参数配置", "go('parameters')", "small")}${btn("进入调度", "go('dispatch')", "small primary")}</div></div>`;
  if (!ready) return header + outputEmpty("forecast") + "</section>";
  const historical = historicalDate();
  const isLoad = UI.forecast === "load",
    pred = isLoad ? data.load : data.pv,
    actual = historical ? (isLoad ? data.actual : data.actualPV) : null,
    err = historical ? Engine.error(pred, actual) : null;
  return (
    header +
    `<div data-output-results="forecast"><div class="tabline"><div class="tabs">${[
      ["load", "负荷预测"],
      ["pv", "光伏预测"],
    ]
      .map(
        (a) =>
          `<button class="tab ${UI.forecast === a[0] ? "active" : ""}" onclick="UI.forecast='${a[0]}';render()">${a[1]}</button>`,
      )
      .join(
        "",
      )}</div><span class="sub">发布时间：前一日18:00（模拟）　版本：DEMO-F1</span></div><div class="prediction-layout"><div class="hour-table"><table><thead><tr><th>时段</th><th>预测(kW)</th>${historical ? "<th>实际值(kW)</th><th>偏差(kW)</th>" : ""}</tr></thead><tbody>${pred.map((v, h) => `<tr><td>${String(h).padStart(2, "0")}:00</td><td>${fmt(v, 2)}</td>${historical ? `<td>${fmt(actual[h], 2)}</td><td>${fmt(v - actual[h], 2)}</td>` : ""}</tr>`).join("")}</tbody></table></div><div class="prediction-chart">${chart(
      [
        {
          name: historical ? "历史预测" : isLoad ? "负荷预测" : "光伏预测",
          values: pred,
          color: colors.load,
        },
        ...(historical
          ? [{ name: "实际值（模拟）", values: actual, color: colors.pv }]
          : []),
      ],
      "kW",
      265,
    )}${historical ? `<div class="kpis prediction-stats">${kpi("MAE", fmt(err.mae, 2), "kW", "平均绝对误差")}${kpi("RMSE", fmt(err.rmse, 2), "kW", "均方根误差")}${kpi("数据完整率", "100", "%", "24/24个时段")}</div>` : ""}<div class="note-line">${historical ? "历史预测与实际值均为模拟序列，误差不代表真实模型效果。MAE/RMSE越小越好，尚无独立测试集与达标阈值。" : "当天及未来预测没有完整实际值，不计算MAE/RMSE。"} 输出 ${S.forecastId}，有效窗口 ${S.date} 00:00—23:00；当前日期 ${MEETING.asOf}（上海时区）。正式研究模型待接入。</div></div></div><div class="forecast-checks"><h4>数据检查</h4><div class="tablewrap"><table><thead><tr><th>检查项</th><th>要求</th><th>结果</th><th>说明</th></tr></thead><tbody><tr><td>时间窗口</td><td>分析日00:00—23:00</td><td>${badge("通过")}</td><td>Asia/Shanghai，1小时粒度</td></tr><tr><td>完整性与单位</td><td>24条记录，功率单位kW</td><td>${badge("通过")}</td><td>模拟输入无缺失值</td></tr><tr><td>模型接入</td><td>预测接口及版本</td><td>${badge("演示接口", "warn")}</td><td>当前为规则合成器，正式模型待接入</td></tr></tbody></table></div></div></div>${outputEmpty("forecast", false)}</section>`
  );
}
function parameters() {
  const ready = parametersReady();
  return `${queryBar()}<section class="card"><div class="cardhead"><h3>碳因子与设备参数</h3><div class="actions"><span class="sub">负责人：凌俊楷</span>${btn("输出参数", "saveAssets()", "primary small")}${btn("参数依据", "showEvidence('parameters')", "small", !ready)}${btn("进入调度", "go('dispatch')", "primary small")}</div></div><div class="asset-inputs"><div class="field"><label for="carbon-profile">碳因子典型日</label><select id="carbon-profile" aria-label="碳因子典型日" onchange="setCarbonProfile(this.value)">${ENERGYOPS_CARBON_FACTORS.profiles.map((item) => `<option value="${item.id}"${item.id === S.carbonProfile ? " selected" : ""}>${item.name}</option>`).join("")}</select><div class="sub">广东2025年S1情景K-means聚类中心</div></div><div class="field"><label for="cap">候选储能容量（kWh）</label><input id="cap" oninput="invalidateOutputs('parameters')" aria-label="储能容量" type="number" min="100" max="1000" value="${S.capacity}"></div><div class="field"><label for="power">候选充放电功率（kW）</label><input id="power" oninput="invalidateOutputs('parameters')" type="number" min="20" max="1000" value="${S.power}"></div></div>${ready ? parameterResults() : ""}${outputEmpty("parameters", !ready)}</section>`;
}
function parameterResults() {
  return `<div data-output-results="parameters"><div class="result-heading">设备参数结果</div><div class="tablewrap"><table class="asset-table"><thead><tr><th>设备名称</th><th>参数项</th><th>参数值</th><th>单位</th><th>设置依据</th></tr></thead><tbody><tr><td>光伏系统</td><td>装机容量</td><td>${currentPvKwp()}</td><td>kWp</td><td>额定峰值功率，非全天输出；现场光伏尚未接入</td></tr><tr><td rowspan="5">储能系统</td><td>额定容量</td><td>${S.capacity}</td><td>kWh</td><td>设备配置</td></tr><tr><td>额定充放电功率</td><td>${S.power}</td><td>kW</td><td>设备配置</td></tr><tr><td>充电 / 放电效率</td><td>95 / 95</td><td>%</td><td>固定假设参数</td></tr><tr><td>SOC下限 / 上限</td><td>15 / 90</td><td>%</td><td>调度边界约束</td></tr><tr><td>初始SOC</td><td>50</td><td>%</td><td>正常状态末端恢复初始能量</td></tr></tbody></table></div><div class="grid2 equal parameter-curves">${panel("分时碳因子", chart([{ name: data.carbonFactor?.name || "碳因子", values: data.carbon, color: colors.load }], "kgCO₂/kWh", 210) + `<div class="note-line">广东2025年S1情景K-means聚类中心，${data.carbonFactor?.name || ""}。代表日 ${data.carbonFactor?.representative_date || "—"}，${data.carbonFactor?.days || "—"} 天，年度权重 ${data.carbonFactor ? (data.carbonFactor.weight * 100).toFixed(1) : "—"}%。单位 kgCO₂/kWh，由 tCO₂/MWh 等值换算。仅核算购电碳排，不含全生命周期。与负荷、光伏不是同一地点、同一年份的同步实测。</div>`)}${panel("分时电价", chart([{ name: "电价（假设）", values: data.price, color: colors.pv }], "元/kWh", 210) + `<div class="note-line">分时电价为演示假设，未冒用广州工业或校园实际结算价。</div>`)}</div></div>`;
}
const originalFault = fault;
fault = function () {
  return (
    safetyPanel() +
    originalFault().replace(
      /<div class="notice">[\s\S]*?<\/div>/,
      '<div class="event-caption"><span>事件类型：储能支路断开</span><span>来源：预设仿真</span><span>发生时间：14:00</span><span>设备：BESS-01</span></div>',
    )
  );
};
const originalReports = reports;
reports = function () {
  return originalReports().replace(teamCards(), "") + outputHistory();
};
function teamCards() {
  return "";
}
function applyFilters(silent = false) {
  const day = $("#day")?.value || S.date,
    objective = $("#objective")?.value || S.objective;
  if (!validDate(day)) {
    toast("该日期没有有效预测窗口");
    return false;
  }
  const budget = $("#budget") ? Number($("#budget").value) : S.budget;
  if (!Number.isFinite(budget) || budget < 0 || budget > 30) {
    toast("费用增幅上限应为0—30%");
    return false;
  }
  if (budget !== S.budget) {
    S.budget = budget;
    S.dataVersion++;
    draft = Engine.plans(data, S);
    S.current = null;
  }
  if (day !== S.date) {
    invalidateOutputs();
    S.date = day;
    S.dataVersion++;
    data = Engine.dataset(S.scenario);
    draft = Engine.plans(data, S);
    S.current = null;
    S.fault = null;
  }
  if (objective !== S.objective) {
    S.objective = objective;
    S.current = null;
  }
  render();
  if (!silent) toast("查询完成，共24个时段");
  return true;
}
function generateFromForm() {
  if (applyFilters(true)) runPlan();
}
function saveAssets() {
  const capacity = Number($("#cap")?.value ?? S.capacity),
    power = Number($("#power")?.value ?? S.power);
  if (
    !Number.isFinite(capacity) ||
    capacity < 100 ||
    capacity > 1000 ||
    !Number.isFinite(power) ||
    power < 20 ||
    power > 1000
  ) {
    toast("容量应为100—1000 kWh，功率应为20—1000 kW");
    return;
  }
  if (!applyFilters(true)) return false;
  if (
    S.missing ||
    !validInputSeries(data.carbon) ||
    !validInputSeries(data.price)
  ) {
    toast("碳因子或电价数据不完整，未输出");
    return false;
  }
  S.capacity = capacity;
  S.power = power;
  S.dataVersion++;
  S.current = null;
  S.fault = null;
  draft = Engine.plans(data, S);
  rememberOutput("parameters");
  S.outputs.parameters = parameterInputKey();
  render();
  toast("碳因子与设备参数已输出");
  return true;
}
S.page = "forecast";
render();
