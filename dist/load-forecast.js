/* Pure adapter: 96x15min model outputs -> 24x1h dispatch powers. */
(function (root) {
  const finite = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  function validate(bundle, modelId, date) {
    if (bundle?.schema_version !== 1 || bundle.timezone !== 'Asia/Shanghai' || bundle.interval_minutes !== 15 || bundle.point_count !== 96) throw new Error('Invalid forecast schema/timezone/interval');
    const model = bundle.models?.[modelId], day = model?.days?.[date];
    if (!model || !day || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('No model forecast for this date');
    for (const key of ['timestamps', 'load_kw', 'reference_kw', 'reference_observed']) if (!Array.isArray(day[key]) || day[key].length !== 96) throw new Error('Expected exactly 96 forecast points');
    if (!day.load_kw.every(finite)) throw new Error('Invalid forecast power');
    const start = Date.parse(day.start_time);
    if (day.start_time !== date+'T00:00:00+08:00' || day.issued_at !== day.start_time || !Number.isFinite(start)) throw new Error('Invalid forecast origin');
    day.timestamps.forEach((t,i) => {
      if (typeof t !== 'string' || !t.endsWith('+08:00') || Date.parse(t) !== start+i*900000) throw new Error('Irregular forecast timestamps');
      if (typeof day.reference_observed[i] !== 'boolean' || (day.reference_observed[i] ? !finite(day.reference_kw[i]) : day.reference_kw[i] !== null)) throw new Error('Invalid reference mask');
    });
    return {model,day};
  }
  function hourly(values) {
    if (!Array.isArray(values) || values.length !== 96 || !values.every(finite)) throw new Error('Expected 96 nonnegative powers');
    return Array.from({length:24},(_,h)=>values.slice(h*4,h*4+4).reduce((a,b)=>a+b,0)/4);
  }
  function maskedMetrics(pred, actual, mask) {
    const indices=pred.map((_,i)=>i).filter(i=>mask[i] && finite(actual[i]));
    if (!indices.length) return {count:0,mae:null,rmse:null,r2:null};
    const mean=indices.reduce((s,i)=>s+actual[i],0)/indices.length;
    const sse=indices.reduce((s,i)=>s+(pred[i]-actual[i])**2,0),sst=indices.reduce((s,i)=>s+(actual[i]-mean)**2,0);
    return {count:indices.length,mae:indices.reduce((s,i)=>s+Math.abs(pred[i]-actual[i]),0)/indices.length,rmse:Math.sqrt(sse/indices.length),r2:sst>0?1-sse/sst:null};
  }
  function adapt(bundle, modelId, date) {
    const {model,day}=validate(bundle,modelId,date),load=hourly(day.load_kw);
    const actual=Array.from({length:24},(_,h)=>day.reference_observed.slice(h*4,h*4+4).every(Boolean)?day.reference_kw.slice(h*4,h*4+4).reduce((a,b)=>a+b,0)/4:null);
    return {load,actual,meta:{model_id:modelId,model_name:model.name,architecture:model.architecture,model_version:model.version,issued_at:day.issued_at,start_time:day.start_time,interval_minutes:15,point_count:96,dispatch_interval_minutes:60,meter_id:bundle.meter_id,data_type:'model_forecast',reference_type:bundle.metadata.reference_type,prediction_sha256:model.prediction_sha256},series:JSON.parse(JSON.stringify(day)),metrics:maskedMetrics(day.load_kw,day.reference_kw,day.reference_observed)};
  }
  const api={validate,hourly,maskedMetrics,adapt};root.EnergyOpsLoadForecast=api;
  if (typeof module !== 'undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
