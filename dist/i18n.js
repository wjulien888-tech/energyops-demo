let interfaceLanguage = "zh";
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
  暂无执行后反馈: "No post-execution feedback",
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
  操作: "Actions",
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
  未来: "Future",
  预测数据已输出: "Forecast output generated",
  碳因子与设备参数已输出: "Parameter output generated",
  "已生成，独立复算 ": " generated; independent verification: ",
  应用上限: "Apply cap",
  入库: "Archive",
  "时间 (s)": "Time (s)",
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
};

function toggleLanguage() {
  interfaceLanguage = interfaceLanguage === "zh" ? "en" : "zh";
  $("#toast").textContent = "";
  $("#toast").classList.remove("show");
  render();
}
function translateText(value) {
  if (interfaceLanguage !== "en") return value;
  const escape = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = Object.keys(translations)
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|");
  return String(value)
    .replace(new RegExp(pattern, "g"), (key) => translations[key])
    .replace(
      /[，。：；、（）“”‘’]/g,
      (char) =>
        ({
          "，": ", ",
          "。": ". ",
          "：": ": ",
          "；": "; ",
          "、": ", ",
          "（": "(",
          "）": ")",
          "“": '"',
          "”": '"',
          "‘": "'",
          "’": "'",
        })[char],
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
  while ((node = walker.nextNode()))
    node.nodeValue = translateText(node.nodeValue);
  root
    .querySelectorAll("[aria-label],[title],[placeholder],[alt]")
    .forEach((el) => {
      for (const attr of ["aria-label", "title", "placeholder", "alt"])
        if (el.hasAttribute(attr))
          el.setAttribute(attr, translateText(el.getAttribute(attr)));
    });
}
function translateInterface() {
  if (typeof document.createTreeWalker !== "function") return;
  const en = interfaceLanguage === "en";
  document.documentElement.lang = en ? "en" : "zh-CN";
  document.title = en
    ? "EnergyOps | Campus Energy Management"
    : "EnergyOps · 园区能源决策工作台";
  const meta = document.querySelector('meta[name="description"]');
  if (meta)
    meta.content = en
      ? "Campus energy forecasting, dispatch and stability demonstration."
      : "EnergyOps 园区能源管理与决策支持交互演示";
  const close = document.querySelector("#detail > button");
  if (close) close.textContent = en ? "Close" : "关闭详情";
  translateContainer(document.querySelector("#app"));
  translateContainer(document.querySelector("#detail"));
  document
    .querySelectorAll('input[type="date"]')
    .forEach((el) => (el.lang = en ? "en" : "zh-CN"));
}
function sourceText(value, label = "Source text provided in another language") {
  const result = translateText(String(value ?? ""));
  return interfaceLanguage === "en" && /\p{Script=Han}/u.test(result)
    ? label
    : result;
}
function englishReportText(r) {
  const p = r.plan,
    v = Engine.verify(p),
    b = Engine.noStorage(r.inputs.data);
  return `# EnergyOps Simulation Plan Report

Plan: ${r.id}
Analysis date: ${r.config.date}
Timezone: Asia/Shanghai
Interval: 1 hour
Objective: ${translateText(p.name)}
Forecast output: ${r.inputs.forecast}
Parameter output: ${r.inputs.parameters}
Data version: DEMO-D${r.config.version}
Battery: ${r.config.capacity} kWh / ${r.config.power} kW
Asset state: ${translateText(r.stateLabel)}
Parent plan: ${r.parent || "None"}
Estimated grid cost: ${p.cost.toFixed(2)} CNY
Estimated grid emissions: ${p.carbon.toFixed(2)} kgCO2
Curtailed energy: ${p.curtail.toFixed(2)} kWh
Cost-increase cap: ${r.config.budget}% above the same-state economic candidate
Terminal SOC: ${p.rows[23].soc.toFixed(2)}%
Terminal energy difference: ${(p.terminal - p.initial).toFixed(3)} kWh
Independent verification: ${v.ok ? "Passed" : "Failed"}
Maximum power balance residual: ${v.balance} kW
Grid scope: 250 kW active-power limit check only; no AC power flow or dynamic-stability approval
Human review: ${r.reviewed ? "Reviewed" : "Pending"}

## Comparable No-Battery Baseline

Same forecast load, PV, prices, carbon factors and 24-hour horizon.
No-battery grid cost: ${b.cost.toFixed(2)} CNY
No-battery grid emissions: ${b.carbon.toFixed(2)} kgCO2
Baseline minus plan cost: ${(b.cost - p.cost).toFixed(2)} CNY
Baseline minus plan emissions: ${(b.carbon - p.carbon).toFixed(2)} kgCO2
Normal battery plans preserve initial energy. Fault cases can contain terminal-energy differences. No investment cost, depreciation or payback is included.

## Handoff and Scope

Selecting, reviewing or exporting a plan does not execute it. An authorized operator must transfer it to the equipment controller. This page sends no equipment commands.
All default data are synthetic. The rule-based candidate scan does not guarantee a global optimum. Forecast accuracy, actual cost savings, emission reductions and fault-detection performance are not demonstrated by these synthetic results. Production forecasting, carbon-factor and control models remain to be connected. Explanations are rule-based, without an online LLM.

## Team Modules

Jialing Wei: load/PV forecasting. Junkai Ling: carbon factors, asset inputs and dispatch. Hanlin Gao: grid/control and recovery. Ziyu Liang: dispatch, interface and integration.

## Hourly Plan

hour,load_kW,pv_kW,grid_kW,charge_kW,discharge_kW,soc_percent,price_CNY_per_kWh,carbon_kgCO2_per_kWh
${p.rows.map((x) => [x.h, x.load, x.pv, x.grid.toFixed(3), x.charge.toFixed(3), x.discharge.toFixed(3), x.soc.toFixed(3), x.price, x.carbon].join(",")).join("\n")}
`;
}
function englishEventReport(f, newer) {
  return `# EnergyOps Simulated Recovery Event

Event: EVT-001
Time: 14:00
Asset: BESS-01 / SW-B1
Source: manually injected preset simulation
Diagnosis: ${f.diagnosed ? "Preset branch disconnection; inspection/reset suggested" : "Not generated"}
Feedback: ${{ full: "Recovered", partial: "Partially recovered, 35% power limit", failed: "Recovery failed, battery unavailable", none: "No valid feedback" }[f.feedback] || "No feedback received"}
Original plan: ${f.original.id}
New plan: ${newer?.id || "Not generated"}

Replanning is a full-day comparison with pre-event actions retained. It does not demonstrate real-time onsite recovery. Terminal-energy differences are reported separately.

${englishReportText(f.original)}
${newer ? englishReportText(newer) : "No new plan; the original plan is retained."}
`;
}
function englishFilename(name) {
  return translateText(name)
    .replace(/\p{Script=Han}+/gu, "report")
    .replace(/\s+/g, "-");
}
Object.assign(translations, {
  韦佳伶: "Jialing Wei",
  凌俊楷: "Junkai Ling",
  高翰林: "Hanlin Gao",
  梁紫昱: "Ziyu Liang",
  中文: "ZH",
  关闭详情: "Close",
  方案报告: "Plan report",
  故障恢复报告: "Recovery report",
});

Object.assign(translations, {
  用电量: "Load energy",
  "模拟负荷 · 24个时段": "Synthetic load, 24 intervals",
  光伏发电量: "PV energy",
  模拟发电数据: "Synthetic generation",
  额定功率: "Rated power",
  已生成方案: "Generated plans",
  能源供需曲线: "Energy supply and demand",
  各曲线为功率幅值: "All curves show power magnitudes",
  可用: "Available",
  园区变压器: "Campus transformer",
  有功限额: "Active-power limit",
  参数已配置: "Configured",
  "校园负荷案例、光伏150 kWp和储能均为合成演示假设，非现场设备监测；电表购电不直接等于含光伏系统的总负荷。":
    "Campus load, 150 kWp PV and battery data are synthetic assumptions, not onsite measurements. Metered grid import is not the total load of a PV-equipped system.",
  日前调度: "Day-ahead dispatch",
  "基于负荷、光伏、电价与碳因子生成方案":
    "Generate schedules from load, PV, prices and carbon factors",
  "诊断、恢复反馈、状态更新与重规划":
    "Diagnosis, recovery feedback, state updates and replanning",
  "查看历史记录、复算依据与导出报告":
    "Review records, verification evidence and exported reports",
  专业模块: "Technical modules",
  调度与集成: "Dispatch & integration",
  电网与恢复: "Grid & recovery",
  "曲线，单位": " chart; unit: ",
  "园区简化拓扑：电网连接变压器和母线，负荷、光伏、储能连接母线":
    "Campus topology: the public grid connects through a transformer to a bus serving the load, PV and battery.",
  "尚无方案记录。": "No plan records yet.",
  "进入调度工作台，生成第一份演示计划。":
    "Open dispatch to generate the first demonstration plan.",
  能量: "Energy",
  "24/24个时段": "24 of 24 intervals",
  分析日: "Analysis day",
  "1小时粒度": "1-hour intervals",
  输入与来源: "Inputs & provenance",
  "供答辩检查的演示字段，正式模型可保持同类接口替换实现。":
    "Demonstration fields for review. Production models can use the same interface structure.",
  "DEMO：全部为确定性合成序列": "DEMO: deterministic synthetic sequences only",
  "DEMO-F1：规则合成，非训练模型":
    "DEMO-F1: rule-based synthetic generator, not a trained model",
  "历史负荷（待接入）": "Historical load (not connected)",
  "气象（待接入）": "Weather (not connected)",
  "合成参考序列，不代表独立实测测试集":
    "Synthetic reference, not an independent measured test set",
  "DEMO-C1 合成因子": "DEMO-C1 synthetic factors",
  "购电碳排，不含生命周期":
    "Grid electricity emissions, excluding lifecycle impacts",
  "从逐时输入输出重新累计，不以计划声明的总值代替复算。容差：1e-6。检查范围不包含 AC 潮流。":
    "Recomputed from hourly inputs and outputs, not the declared totals. Tolerance: 1e-6. AC power flow is outside scope.",
  "终态能量差单位 kWh；停用故障可能导致末端无法回到初始值，已单独记录。":
    "Terminal energy difference is in kWh. An unavailable battery may not return to its initial energy; this difference is reported separately.",
  团队模块与本次执行详情: "Team modules & execution details",
  "以下展示文档分工与当前 Demo 的实现边界；不代表各成员真实算法已经接入，也不用于推断实际工时。":
    "Project responsibilities and implementation scope. These do not imply that production algorithms are connected or measure actual person-hours.",
  成员: "Member",
  "模块 / 交付": "Module / deliverable",
  本次演示实现: "Demo implementation",
  "预测、数据处理、误差与版本":
    "Forecasting, preprocessing, errors and versions",
  合成预测接口与误差复算: "Synthetic forecast interface and error calculation",
  "碳因子、光储参数、调度参与":
    "Carbon factors, PV/battery parameters and dispatch",
  "合成因子、设备参数联动": "Synthetic factors and linked asset inputs",
  "电网分析、诊断与恢复": "Grid analysis, diagnosis and recovery",
  "限额筛查、预设故障与反馈分支":
    "Limit checks, preset faults and feedback branches",
  "调度、Agent、页面与集成": "Dispatch, agent, interface and integration",
  "启发式计划、规则解释、版本与报告":
    "Heuristic plans, rule-based explanation, versions and reports",
  当前执行链: "Current execution chain",
  输入: "Input",
  "时间/单位/完整性检查": "Time, units and completeness checks",
  合成预测: "Synthetic forecast",
  碳因子: "Carbon factor",
  "81 组候选权重扫描（非全局优化求解）":
    "81 candidate weight scans (not globally optimal solving)",
  "独立功率 / 能量 / 费用 / 碳排复算":
    "Independent power / energy / cost / emissions recalculation",
  "有功限额筛查（非 AC 潮流）": "Active-power screening (not AC power flow)",
  "规则解释 / 人工审阅 / 报告":
    "Rule-based explanation / human review / reports",
  "可提供 frequency_Hz、bus_power_kW、voltage_V、current_A 中至少一组等长数值序列。此处为格式示例，不是已完成的研究结果。":
    "Provide at least one numeric series matching the time axis: frequency_Hz, bus_power_kW, voltage_V or current_A. This is a format example, not completed research evidence.",
  由负责人填写: "Provided by the module owner",
  "填写判据、检查范围及结果，不自动判定通过":
    "Provide criteria, check scope and assessment; no automatic approval",
  计算方式: "Calculation method",
  "81组电价与碳因子权重候选扫描，不保证全局最优。":
    "Scan 81 price/carbon weight candidates; global optimality is not guaranteed.",
  充放电依据: "Charge/discharge basis",
  "加权分数、SOC范围、充放电功率及末端能量恢复约束。":
    "Weighted scores, SOC bounds, power limits and terminal-energy recovery constraints.",
  经济基准: "Economic baseline",
  "同一输入及设备状态下，候选集中最低费用":
    "Lowest candidate cost with the same inputs and asset state",
  费用周期: "Cost horizon",
  "仅计本日购电支出，放电不再次计费。正常计划初末SOC一致，不以消耗初始储电冒充节省；未计设备投资和折旧。":
    "Only electricity purchased in this day is charged; discharge is not charged again. Normal plans preserve initial SOC, avoiding artificial savings from initial stored energy. Capital cost and depreciation are excluded.",
  碳排边界: "Emissions boundary",
  "购电量乘以分时碳因子，不含设备全生命周期。":
    "Imported energy multiplied by hourly carbon factors; asset lifecycle impacts are excluded.",
  检查范围: "Check scope",
  "独立数值复算与250kW有功限额筛查，不含真实潮流。":
    "Independent numerical recalculation and a 250 kW active-power screen; no actual power-flow analysis.",
  "本说明采用固定规则读取当前方案，无在线大模型调用。":
    "This explanation reads the current plan using fixed rules, without an online LLM.",
  仿真事件: "Simulated event",
  "14:00 · BESS-01 支路断开，事件来源：手动注入。":
    "14:00: BESS-01 branch disconnected; manually injected event.",
  "预设诊断：SW-B1 断开；建议检查后复位。建议本身不更新可用状态。":
    "Preset diagnosis: SW-B1 disconnected. Inspect before resetting. A suggestion does not update asset availability.",
  "有效反馈：支路恢复，可用功率100%。":
    "Valid feedback: branch recovered, 100% power available.",
  新计划: "New plan",
  已关联原计划: "linked to original plan",
  "同一日期、目标和数据版本，设备状态改变。若设备受限导致终态能量不同，费用差异包含终态差异，不能全部归因为策略优劣。":
    "Same date, objective and data version with a changed asset state. If an asset restriction changes terminal energy, cost differences include this energy effect and cannot be attributed solely to strategy quality.",
  查看新计划曲线: "View new plan curves",
  "有效反馈：部分恢复，可用功率35%。":
    "Valid feedback: partial recovery, 35% power available.",
  停用: "Unavailable",
  "有效反馈：恢复失败，14:00 后储能停用。":
    "Valid feedback: recovery failed, battery unavailable after 14:00.",
  "无有效反馈：保留故障状态，阻断重规划。":
    "No valid feedback: retain the fault state and block replanning.",
  正常调度演示: "Dispatch walkthrough",
  查看预测与合成误差: "Review forecasts & synthetic errors",
  "确认分析窗口，并查看负荷/光伏模块的输入与输出。":
    "Confirm the horizon and inspect load/PV inputs and outputs.",
  下一步: "Next",
  退出: "Exit",
  确认碳因子与设备参数: "Confirm carbon factors & assets",
  "查看时变碳因子，可修改储能容量，观察配置版本更新。":
    "Review hourly carbon factors, edit battery capacity and observe configuration versions.",
  上一步: "Previous",
  生成方案并比较: "Generate & compare plans",
  "点击“生成并检查方案”，查看三种目标、曲线和规则解释。":
    "Calculate plans to inspect three objectives, curves and rule-based explanations.",
  复核与导出: "Review & export",
  "查看当前方案版本、验证依据，并导出报告。":
    "Review the selected version and verification evidence, then export the report.",
  结束引导: "Finish walkthrough",
  故障恢复演示: "Recovery walkthrough",
  准备正常基准方案: "Prepare a normal baseline",
  "先生成正常计划，为后续故障建立比较基准。":
    "Generate a normal plan as the baseline for the subsequent fault.",
  注入事件并生成建议: "Inject an event & generate suggestions",
  "依次点击“注入故障”“生成恢复建议”。":
    "Inject the fault, then generate a recovery suggestion.",
  记录有效恢复反馈: "Record valid recovery feedback",
  "选择恢复完成、部分恢复、恢复失败或无反馈。":
    "Choose recovered, partial, failed or no-feedback status.",
  重规划与导出事件报告: "Replan & export event report",
  "有效反馈后点击重规划，比较新旧计划并导出报告。":
    "After valid feedback, replan, compare linked plans and export the report.",
  "预测数据不完整，未输出": "Forecast data are incomplete; no output generated",
  "输入已更新，请重新生成方案；历史记录保留原版本":
    "Inputs updated. Recalculate the plan; historical records retain their original versions.",
  "已切换方案，图表与解释同步更新":
    "Plan selected; charts and explanations updated",
  "碳因子缺失，生成已阻断": "Missing carbon factors; generation blocked",
  "已记录人工审阅 · 未下发设备指令":
    "Human review recorded; no equipment commands sent",
  请先恢复碳因子并生成原计划:
    "Restore carbon factors and generate the original plan first",
  报告已生成并下载: "Report generated and downloaded",
  请先生成方案: "Generate a plan first",
  请先生成方案再进入报告: "Generate a plan before opening reports",
  请先生成正常方案: "Generate a normal plan first",
  请先注入事件并生成恢复建议:
    "Inject an event and generate a recovery suggestion first",
  请先选择恢复反馈: "Select recovery feedback first",
  已恢复初始演示状态: "Demo reset to its initial state",
  该日期没有有效预测窗口: "No valid forecast window for that date",
  "费用增幅上限应为0—30%": "Cost-increase cap must be between 0 and 30%",
  "查询完成，共24个时段": "Query complete: 24 hourly intervals",
  "容量应为100—1000 kWh，功率应为20—100 kW":
    "Capacity must be 100-1000 kWh and power must be 20-100 kW",
  "碳因子或电价数据不完整，未输出":
    "Carbon factors or prices are incomplete; no output generated",
  文件不能超过5MB: "File must not exceed 5 MB",
  暂未启用该结果类型: "This result type is not enabled",
  结果已导入: "Result imported",
  "导入失败：": "Import failed: ",
  模型资产参数与当前配置不一致:
    "Model asset parameters do not match the current configuration",
  时间轴必须为递增秒序列:
    "Time must be a strictly increasing sequence in seconds",
  稳定性曲线长度或数值无效: "Invalid stability-series length or values",
});

Object.assign(translations, { "待生成方案。": "Plan not generated yet." });

Object.assign(translations, {
  "预览数据，尚未生成记录": "Preview data; no saved record yet",
});

Object.assign(translations, { 尚未生成计划: "No plan generated yet" });

Object.assign(translations, {
  "请先生成一个方案，查看有记录的检查结果。":
    "Generate a plan first to view recorded verification results.",
});
