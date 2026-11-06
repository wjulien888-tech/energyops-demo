const assert=require('node:assert/strict');const {boot}=require('./harness.cjs');const h=boot({jointDefault:true});
assert.equal(h.run('S.date'),'2025-09-01');assert.equal(h.run('jointForecastPayload()'),null);assert.equal(h.run('outputForecast()'),true);
let p=JSON.parse(h.run('JSON.stringify(jointForecastPayload())'));assert.equal(p.steps.length,96);assert.equal(p.pv_kwp,20077.2);assert.equal(p.load_multiplier,100);
const source=JSON.parse(h.run('JSON.stringify(window.EnergyOpsJointForecastData.days[S.date])'));
for(let i=0;i<96;i++){assert.equal(p.steps[i].pv_power_kw,source.pv_kw[i]);assert.equal(p.steps[i].load_power_kw,source.load_kw[i]);}
for(const [k,v] of [['pv','pv_kw'],['load','load_kw']])assert.ok(Math.abs(h.run(`data.${k}.reduce((a,b)=>a+b,0)`)-source[v].reduce((a,b)=>a+b,0)*.25)<1e-7);
assert.match(h.run('forecast()'),/导出调度CSV/);h.run("setJointForecastDay('2025-09-02')");assert.equal(h.run('forecastReady()'),false);assert.equal(h.run("setJointForecastDay('2026-11-06')"),false);
h.run('outputForecast()');h.run("interfaceLanguage='en'");assert.match(h.run('forecast()'),/Export dispatch CSV/);h.run("setLoadForecastModel('PatchTST')");assert.equal(h.run('S.jointForecast'),false);
console.log('Paired forecast tests passed.');

h.run("setJointForecastDay('2025-09-01');outputForecast()");h.run("globalThis.captured=[];download=(...a)=>captured.push(a)");assert.equal(h.run("exportJointForecast('csv')"),true);assert.equal(h.run("captured[0][1].trim().split('\\r\\n').length"),97);
