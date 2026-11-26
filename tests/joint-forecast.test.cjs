const assert=require('node:assert/strict');const {boot}=require('./harness.cjs');const h=boot({jointDefault:true});
assert.equal(h.run('S.date'),'2025-09-01');assert.equal(h.run('jointForecastPayload()'),null);assert.equal(h.run('outputForecast()'),true);
let p=JSON.parse(h.run('JSON.stringify(jointForecastPayload())'));assert.equal(p.steps.length,96);assert.equal(p.pv_kwp,6000);assert.equal(p.load_multiplier,100);
const source=JSON.parse(h.run('JSON.stringify(window.EnergyOpsJointForecastData.days[S.date])'));
for(let i=0;i<96;i++){assert.equal(p.steps[i].pv_power_kw,source.pv_kw[i]*6000/20077.2);assert.equal(p.steps[i].load_power_kw,source.load_kw[i]);}
for(const [k,v] of [['pv','pv_kw'],['load','load_kw']])assert.ok(Math.abs(h.run(`data.${k}.reduce((a,b)=>a+b,0)`)-source[v].reduce((a,b)=>a+b,0)*.25*(k==="pv"?6000/20077.2:1))<1e-7);
assert.match(h.run('forecast()'),/导出调度CSV/);h.run("setJointForecastDay('2025-09-02')");assert.equal(h.run('forecastReady()'),false);assert.equal(h.run("setJointForecastDay('2026-11-06')"),false);
h.run('outputForecast()');h.run("interfaceLanguage='en'");assert.match(h.run('forecast()'),/Export dispatch CSV/);h.run("setLoadForecastModel('PatchTST')");assert.equal(h.run('S.jointForecast'),false);
console.log('Paired forecast tests passed.');

h.run("setJointForecastDay('2025-09-01');outputForecast()");h.run("globalThis.captured=[];download=(...a)=>captured.push(a)");assert.equal(h.run("exportJointForecast('csv')"),true);assert.equal(h.run("captured[0][1].trim().split('\\r\\n').length"),97);


// The selected planning scenario is the input to both dispatch and grid validation.
const planning = boot({ jointDefault: true });
assert.equal(planning.run("S.capacity"), 600);
assert.equal(planning.run("S.power"), 250);
planning.run('go("planning"); comparePlanningStorage()');
assert.match(planning.nodes.get("#app").innerHTML, /44 个样本日/);
assert.match(planning.nodes.get("#app").innerHTML, /10,350\.6 kWp/);
assert.match(planning.nodes.get("#app").innerHTML, /9,231 块/);
assert.ok(planning.run("planningComparison.rows[0].curtail > 0"));
assert.ok(planning.run("planningComparison.rows[1].curtail < 1e-6"));
planning.run("selectPlanningStorage(2); outputForecast(); saveAssets(); go('dispatch')");
assert.match(planning.nodes.get("#app").innerHTML, /generateFromForm/);
planning.run("generateFromForm()");
assert.equal(planning.run("S.current.config.pvKwp"), 6000);
assert.equal(planning.run("S.current.config.power"), 300);
assert.equal(planning.run("S.current.config.capacity"), 800);
assert.equal(planning.run("S.current.config.gridLimitKw"), null);
planning.run("advanceHourlyFeedback(); go('fault')");
assert.match(planning.nodes.get("#app").innerHTML, /导出运行点/);
assert.equal(planning.run("stabilityOperatingPoint().plan_id"), planning.run("S.current.id"));
assert.throws(() => planning.run(`acceptSafety({
  ...stabilityOperatingPoint(), kind: "stability-result", hour: 2,
  time_s: [0, 1], voltage_V: [400, 399],
}, "test.json")`), /匹配当前计划/);
planning.run(`acceptSafety({
  ...stabilityOperatingPoint(), kind: "stability-result",
  time_s: [0, 1], voltage_V: [400, 399],
}, "test.json"); render()`);
assert.match(planning.nodes.get("#app").innerHTML, /test.json/);
planning.run(`S.stabilityHour = 0; acceptSafety({
  ...stabilityOperatingPoint(), kind: "stability-result", model_version: "test",
  time_s: [0, 1], voltage_V: [400, 399], battery_available_kW: 80,
}, "test.json")`);
const historical = planning.run("JSON.stringify(S.current.hourlyFeedback.history[0])");
planning.run("applyStabilityFeedback(); advanceHourlyFeedback()");
assert.equal(planning.run("S.current.hourlyFeedback.limits.availablePower"), 80);
assert.equal(planning.run("JSON.stringify(S.current.hourlyFeedback.history[0])"), historical);
assert.ok(planning.run("S.current.hourlyFeedback.plan.rows.slice(1).every(r => Math.max(r.charge, r.discharge) <= 80 + 1e-6)"));

planning.run("go('planning'); changePlanningPv(20077.2)");
assert.equal(planning.run("forecastReady()"), false);
assert.equal(planning.run("parametersReady()"), false);
assert.equal(planning.run("S.current"), null);
assert.equal(planning.run("data.jointForecast.pv_kwp"), 20077.2);
console.log("Planning, 44-day comparison, dispatch and grid operating-point binding passed.");

planning.run("changePlanningPv(7500); outputForecast()");
assert.equal(planning.run("jointForecastPayload().pv_kwp"), 7500);
assert.ok(planning.run(`jointForecastPayload().steps.every((row, i) =>
  Math.abs(row.pv_power_kw - window.EnergyOpsJointForecastData.days[S.date].pv_kw[i] * 7500 / 20077.2) < 1e-7)`));
planning.run("saveAssets(); go('dispatch'); generateFromForm(); advanceHourlyFeedback(); selectHour(0)");
assert.match(planning.nodes.get("#app").innerHTML, /电池充放电逻辑/);
assert.match(planning.nodes.get("#app").innerHTML, /模拟执行结果/);
assert.equal(planning.run("S.current.hourlyFeedback.history[0].actual.startSoc"), 50);

// Edited planning and parameter values flow through the normal output and dispatch buttons.
const updated = boot({ jointDefault: true });
updated.run("outputForecast(); go('parameters'); saveAssets(); go('dispatch'); generateFromForm()");
const originalPlan = JSON.parse(updated.run("JSON.stringify(S.current)"));
assert.equal(originalPlan.config.pvKwp, 6000);
updated.run("go('planning')");
updated.field("#custom-pv", 9000);
updated.run("comparePlanningStorage()");
assert.match(updated.nodes.get("#app").innerHTML, /9 MWp 装机依据/);
assert.match(updated.nodes.get("#app").innerHTML, /87\.0%/);
assert.match(updated.nodes.get("#app").innerHTML, /13,846 块/);
assert.doesNotMatch(updated.nodes.get("#app").innerHTML, /6 MWp 装机依据/);
assert.equal(updated.run("planningComparison.pvKwp"), 9000);
assert.equal(updated.run("dispatchReady()"), false);
updated.run("selectPlanningStorage(1); outputForecast(); go('parameters'); saveAssets(); go('dispatch'); generateFromForm()");
const resizedPv = JSON.parse(updated.run("JSON.stringify(S.current)"));
assert.equal(resizedPv.config.pvKwp, 9000);
assert.equal(resizedPv.config.power, originalPlan.config.power);
assert.ok(resizedPv.plan.rows.every((row, hour) => Math.abs(row.pv - 1.5 * originalPlan.plan.rows[hour].pv) < 1e-7));
assert.notEqual(resizedPv.plan.cost, originalPlan.plan.cost);

updated.run("go('parameters')");
assert.doesNotMatch(updated.nodes.get("#app").innerHTML, /id="cap"[^>]*readonly/);
assert.doesNotMatch(updated.nodes.get("#app").innerHTML, /id="power"[^>]*readonly/);
updated.field("#cap", 450);
updated.field("#power", 125);
updated.run("invalidateOutputs('parameters')");
assert.equal(updated.run("dispatchReady()"), false);
updated.run("saveAssets(); go('dispatch'); generateFromForm()");
const resizedBattery = JSON.parse(updated.run("JSON.stringify(S.current)"));
assert.equal(resizedBattery.config.capacity, 450);
assert.equal(resizedBattery.config.power, 125);
assert.equal(resizedBattery.plan.initial, 225);
assert.ok(resizedBattery.plan.rows.every(row => row.powerLimit === 125));
assert.notEqual(resizedBattery.plan.cost, resizedPv.plan.cost);
assert.equal(updated.run("Engine.verify(S.current.plan).ok"), true);
assert.equal(updated.run("S.records[0].config.pvKwp"), 6000);
updated.run("go('planning'); changePlanningPv(20077.2)");
assert.match(updated.nodes.get("#app").innerHTML, /20\.0772 MWp 装机依据/);
assert.match(updated.nodes.get("#app").innerHTML, /超出图纸屋顶规划容量约 9,726\.6 kWp/);
console.log("Dynamic PV basis, edited storage limits, and fresh dispatch results passed.");
