const assert = require("node:assert/strict");
const { boot } = require("./harness.cjs");
let checks = 0;
function readyFlow(parametersFirst = false) {
  const w = boot();
  assert.equal(w.run("S.page"), "forecast");
  assert.equal(w.run("dispatchReady()"), false);
  assert.equal(w.run('go("dispatch")'), false);
  assert.equal(w.run("runPlan()"), false);
  assert.equal(w.run("injectFault()"), false);
  assert.equal(w.run("S.records.length"), 0);
  assert.ok(!w.nodes.get("#app").innerHTML.includes("运行场景"));
  w.field("#cap", 320);
  w.field("#power", 60);
  w.run(parametersFirst ? "saveAssets()" : "outputForecast()");
  assert.equal(w.run("dispatchReady()"), false, "one output is insufficient");
  w.run(parametersFirst ? "outputForecast()" : "saveAssets()");
  assert.equal(w.run("dispatchReady()"), true, "both outputs unlock dispatch");
  w.run('go("dispatch")');
  assert.equal(w.run("S.page"), "dispatch");
  assert.equal(w.run("runPlan()"), true);
  assert.equal(w.run("S.records.length"), 1);
  w.run('injectFault(); diagnose(); feedback("partial"); replan()');
  assert.equal(
    w.run("S.records.length"),
    2,
    "recovery remains available after valid output",
  );
  assert.equal(w.run("S.fault.newId"), "EO-002");
  checks += 14;
  return w;
}
const w = readyFlow();
readyFlow(true);
w.run('go("parameters"); invalidateOutputs("parameters")');
assert.equal(
  w.run("forecastReady()"),
  true,
  "battery edit preserves the independent forecast",
);
assert.equal(w.run("dispatchReady()"), false);
assert.equal(w.run("runPlan()"), false);
assert.equal(w.run("replan()"), false);
w.field("#cap", 480);
w.run("saveAssets()");
assert.equal(w.run("dispatchReady()"), true);
assert.equal(w.run("S.capacity"), 480);
w.run("invalidateOutputs()");
w.field("#day", "2026-02-20");
w.run("applyFilters(true)");
assert.equal(w.run("forecastReady()"), false);
assert.equal(w.run("parametersReady()"), false);
w.run("outputForecast()");
assert.equal(w.run("dispatchReady()"), false);
w.run("saveAssets()");
assert.equal(w.run("dispatchReady()"), true);
w.run("toggleMissingInput()");
assert.equal(w.run("dispatchReady()"), false);
w.run("toggleMissingInput()");
assert.equal(
  w.run("dispatchReady()"),
  false,
  "restoring data does not replace explicit output",
);
w.run("saveAssets()");
assert.equal(w.run("dispatchReady()"), true);
w.run("resetDemo()");
assert.equal(w.run("dispatchReady()"), false);
assert.equal(w.run("S.page"), "forecast");
checks += 15;
const invalid = boot();
invalid.run("data.pv[5]=NaN");
assert.equal(invalid.run("outputForecast()"), false);
invalid.field("#cap", 0);
invalid.field("#power", 60);
invalid.run("saveAssets()");
assert.equal(invalid.run("parametersReady()"), false);
invalid.field("#cap", 320);
invalid.run("data.carbon[4]=null;saveAssets()");
assert.equal(invalid.run("parametersReady()"), false);
for (const page of ["overview", "forecast", "parameters", "fault", "reports"]) {
  invalid.run(`go('${page}')`);
  assert.ok(!invalid.nodes.get("#app").innerHTML.includes("运行场景"), page);
}
console.log(
  `Workflow gates passed: both output orders, all entry points, invalidation, recovery, invalid data, reset and scenario filter removal (${checks}+ checks).`,
);

const display = boot();
let html = display.nodes.get("#app").innerHTML;
assert.ok(
  !html.includes('data-output-results="forecast"'),
  "prediction results absent before output",
);
assert.ok(!html.includes('class="prediction-layout"'));
assert.ok(!html.includes("平均绝对误差"));
display.field("#day", "2026-02-19");
display.run("outputForecast()");
html = display.nodes.get("#app").innerHTML;
assert.ok(html.includes('data-output-results="forecast"'));
assert.ok(html.includes('class="prediction-layout"'));
assert.ok(html.includes("平均绝对误差"));
display.run('go("parameters")');
html = display.nodes.get("#app").innerHTML;
assert.ok(html.includes('id="cap"'), "inputs remain editable before output");
assert.ok(!html.includes('data-output-results="parameters"'));
assert.ok(!html.includes("设备参数结果"));
assert.ok(!html.includes("分时碳因子"));
display.field("#cap", 320);
display.field("#power", 60);
display.run("saveAssets()");
html = display.nodes.get("#app").innerHTML;
assert.ok(html.includes('data-output-results="parameters"'));
assert.ok(html.includes("设备参数结果"));
assert.ok(html.includes("分时碳因子"));
display.run('invalidateOutputs("parameters");render()');
assert.ok(
  !display.nodes
    .get("#app")
    .innerHTML.includes('data-output-results="parameters"'),
);
display.run('go("forecast")');
assert.ok(
  display.nodes
    .get("#app")
    .innerHTML.includes('data-output-results="forecast"'),
  "unrelated parameter edit preserves prediction output",
);
display.run("invalidateOutputs();render()");
assert.ok(
  !display.nodes
    .get("#app")
    .innerHTML.includes('data-output-results="forecast"'),
);
for (const unit of ["kW", "%", "kgCO₂/kWh", "元/kWh"]) {
  const rendered = display.run(
    `chart([{name:"测试曲线",values:data.load,color:"#1677ff"}],${JSON.stringify(unit)})`,
  );
  const legend = rendered.match(/<div class="legend">([\s\S]*?)<\/div>/)[1];
  assert.ok(!legend.includes(unit), "units do not appear in legends");
  assert.ok(rendered.includes('class="axis-unit"'));
  assert.ok(rendered.includes(`>${unit}</text>`), "units appear on y axis");
  assert.ok(rendered.includes("rotate(-90"));
}
console.log(
  "Output visibility and y-axis units passed: initial, output, invalidation and all four unit types.",
);


// Simulated feedback runs through the regular dispatch page and freezes each elapsed hour.
const rolling = boot();
rolling.field("#cap", 320);
rolling.field("#power", 60);
rolling.run('outputForecast(); saveAssets(); go("dispatch"); runPlan()');
assert.match(rolling.nodes.get("#app").innerHTML, /推进 1 小时/);
const dayAhead = rolling.run("JSON.stringify(S.current.plan)");
rolling.run("advanceHourlyFeedback(); advanceHourlyFeedback()");
assert.equal(rolling.run("S.current.hourlyFeedback.history.length"), 2);
const executed = rolling.run("JSON.stringify(S.current.hourlyFeedback.history)");
assert.equal(rolling.run(`(() => {
  const { history, plan } = S.current.hourlyFeedback;
  return history[1].actual.load !== history[1].planned.load
    && plan.rows[2].load !== S.current.plan.rows[2].load
    && Math.abs(plan.rows[2].energy - (history[1].actual.energy
      + plan.rows[2].charge * 0.95 - plan.rows[2].discharge / 0.95)) < 1e-6;
})()`), true);
rolling.run("advanceHourlyFeedback(true); advanceHourlyFeedback()");
assert.equal(rolling.run("S.current.hourlyFeedback.history.length"), 24);
assert.equal(rolling.run("JSON.stringify(S.current.hourlyFeedback.history.slice(0, 2))"), executed);
assert.equal(rolling.run("JSON.stringify(S.current.plan)"), dayAhead);
assert.equal(rolling.run("Engine.verify(S.current.hourlyFeedback.plan).ok"), true);
rolling.run('choose("green")');
assert.equal(rolling.run("S.current.hourlyFeedback"), undefined);
console.log("Hourly rolling simulation: feedback, SOC continuity and frozen history passed.");


function testPromptDispatch() {
  const w = boot();
  const parse = (message) => JSON.parse(w.run(`JSON.stringify(parseMockDispatchIntent(${JSON.stringify(message)}))`));
  for (const language of ["zh", "en"]) {
    w.run(`interfaceLanguage = "${language}"`);
    w.field("#dispatch-prompt", "");
    for (const [index, objective, limit] of [
      [0, "economic", null], [1, "green", null], [2, "balanced", 3], [3, "balanced", 5],
    ]) {
      w.run(`selectDispatchPrompt(${index})`);
      assert.deepEqual(parse(w.nodes.get("#dispatch-prompt").value), {
        objective, max_cost_increase_pct: limit,
      });
    }
  }
  assert.deepEqual(parse("尽量减碳，电费涨幅不超过 ７.５％"), {
    objective: "balanced", max_cost_increase_pct: 7.5,
  });
  assert.equal(parse("低碳优先，电费最多增加 31%"), null);
  assert.equal(parse("低碳优先，电费不能超过 100 元"), null);
  assert.equal(parse("优先减碳，同时允许馈电"), null);
  assert.equal(parse("经济优先，也要低碳优先"), null);
  w.run('interfaceLanguage = "zh"');

  w.field("#cap", 320);
  w.field("#power", 60);
  w.run('outputForecast(); saveAssets(); go("dispatch"); runPlan()');
  assert.equal((w.nodes.get("#app").innerHTML.match(/class="scheme-row /g) || []).length, 3);
  w.field("#dispatch-prompt", "低碳优先，费用最多增加 3%");
  w.run('globalThis.fetch = () => { throw new Error("The mock must not use the network"); }');
  w.run("generateFromPrompt()");
  assert.equal(w.run("S.current.plan.key"), "balanced");
  assert.equal(w.run("S.current.config.budget"), 3);
  assert.doesNotMatch(w.nodes.get("#app").innerHTML, /class="scheme-row /);
  assert.match(w.nodes.get("#app").innerHTML, /3\.00%/);
  w.run("advanceHourlyFeedback()");
  assert.equal(w.run("S.current.hourlyFeedback.plan.key"), "balanced");

  const id = w.run("S.current.id");
  w.field("#dispatch-prompt", "允许馈电");
  w.run("generateFromPrompt()");
  assert.equal(w.run("S.current.id"), id);
  assert.equal(w.run("S.current.hourlyFeedback.history.length"), 1);
  console.log("Prompt dispatch: offline mock, bilingual presets, single plan, hourly feedback and rejected intent passed.");
}
testPromptDispatch();
