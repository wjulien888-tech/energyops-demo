/* Offline trained-load artifacts: no server-side inference in this static demo. */
(function(){
 const A=window.EnergyOpsLoadForecast,B=window.EnergyOpsLoadForecastData;
 const t=(zh,en)=>interfaceLanguage==='en'?en:zh,active=()=>S.loadModel&&S.loadModel!=='demo',dates=(m=S.loadModel)=>Object.keys(B.models[m]?.days||{}).sort(),get=()=>A.adapt(B,S.loadModel,S.date),num=(v,n=2)=>v===null?'—':fmt(v,n);
 const old={forecast,queryBar,applyFilters,validDate,forecastInputKey,rememberOutput,resetDemo,reportText,showEvidence,outputHistory,resetFilters,overview};
 function apply(){const f=get();data.load=f.load;data.actual=f.actual;data.loadForecast={...f.meta,...f.series};draft=Engine.plans(data,S);return f;}
 globalThis.setLoadForecastModel=function(m){
  if(m!=='demo'&&!B.models[m])return false;
  const date=m==='demo'?nextDay():dates(m).includes(S.date)?S.date:dates(m)[0];if(m!=='demo')A.validate(B,m,date);
  const changed=date!==S.date;S.loadModel=m;S.date=date;invalidateOutputs(changed?'all':'forecast');S.dataVersion++;data=Engine.dataset(S.scenario);if(active())apply();else draft=Engine.plans(data,S);render();return true;
 };
 globalThis.setLoadForecastDay=function(d){if(!active()||!dates().includes(d)){toast(t('该日期没有模型输出','No model output for this date'));return false;}A.validate(B,S.loadModel,d);if(d!==S.date){invalidateOutputs();S.date=d;S.dataVersion++;data=Engine.dataset(S.scenario);apply();}render();return true;};
 validDate=d=>active()?dates().includes(d):old.validDate(d);
 forecastInputKey=()=>JSON.stringify([old.forecastInputKey(),data.loadForecast||null]);
 applyFilters=function(silent=false){
  if(!active())return old.applyFilters(silent);
  const d=$('#day')?.value||S.date,b=$('#budget')?Number($('#budget').value):S.budget,o=$('#objective')?.value||S.objective;
  if(!validDate(d)){toast(t('该日期没有模型输出','No model output for this date'));return false;}
  if(!Number.isFinite(b)||b<0||b>30){toast(t('费用增幅上限应为0—30%','Budget must be between 0 and 30%'));return false;}
  if(d!==S.date){invalidateOutputs();S.date=d;S.dataVersion++;data=Engine.dataset(S.scenario);}
  if(b!==S.budget||o!==S.objective){S.current=null;S.fault=null;}S.budget=b;S.objective=o;apply();render();if(!silent)toast(t('负荷模型查询完成','Load model query completed'));return true;
 };
 queryBar=function(extra='',run=false){let h=old.queryBar(extra,run);if(!active())return h;return h.replace(`min="${MEETING.first}" max="${MEETING.last}"`,`min="${dates()[0]}" max="${dates().at(-1)}"`).replace('<div class="readonly">模拟数据</div>',`<div class="readonly">${t('负荷模型输出 / 光伏演示','Load model / demo PV')}</div>`);};
 rememberOutput=function(kind){const r=old.rememberOutput(kind);if(active()&&kind==='forecast'){const f=get();r.issuedAt=f.meta.issued_at;r.version=f.meta.model_version;r.source='trained_load+synthetic_pv';r.loadModel=copyData(f.meta);}return r;};
 resetDemo=function(){S.loadModel='demo';return old.resetDemo();};
 resetFilters=function(){if(!active())return old.resetFilters();return setLoadForecastDay(dates()[0]);};
 overview=function(){let h=old.overview();return active()?h.replace('模拟负荷 · 24个时段','模型负荷 · 24个时段').replace('校园负荷案例、光伏150 kWp和储能均为合成演示假设','负荷来自归档模型输出；光伏150 kWp和储能仍为演示假设'):h;};
 function sourcePanel(){return `<section class="card load-source-card"><div class="load-source-fields"><div class="field"><label for="load-model">${t('负荷模型','Load model')}</label><select id="load-model" onchange="setLoadForecastModel(this.value)"><option value="demo" ${!active()?'selected':''}>${t('演示负荷','Demo load')}</option>${Object.values(B.models).map(m=>`<option value="${m.id}" ${S.loadModel===m.id?'selected':''}>${m.name} · ${m.architecture}</option>`).join('')}</select></div>${active()?`<div class="field"><label for="load-model-day">${t('归档预测日期','Archived forecast date')}</label><select id="load-model-day" onchange="setLoadForecastDay(this.value)">${dates().map(d=>`<option ${d===S.date?'selected':''}>${d}</option>`).join('')}</select></div><div class="load-source-summary"><strong>SE4-ZALGL1</strong><span>15 min · 96 ${t('步','steps')} → 24 × 1 h</span></div>`:`<div class="load-source-summary"><strong>${t('已接入训练结果','Trained results available')}</strong><span>DormPatch-96 / DormLinear-96</span></div>`}</div></section>`;}
 function curve(f){
  const W=760,H=300,L=62,R=18,T=18,BT=36,w=W-L-R,ph=H-T-BT,mx=Math.max(1,...f.series.load_kw,...f.series.reference_kw.filter(v=>v!==null))*1.15,x=i=>L+(i+.5)*w/96,y=v=>T+ph*(1-v/mx);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('96步负荷预测曲线','96-step load forecast')}"><text x="12" y="20" font-size="11" fill="#667085">kW</text>`;
  for(let j=0;j<5;j++){const v=mx*j/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#edf0f5"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="#667085">${fmt(v,0)}</text>`;}
  for(let h=0;h<=24;h+=3)s+=`<text x="${L+h*w/24}" y="${H-12}" text-anchor="middle" font-size="10" fill="#667085">${String(h).padStart(2,'0')}:00</text>`;
  function lines(values,color,dash){let current=[],groups=[];values.forEach((v,i)=>{if(v===null){if(current.length)groups.push(current);current=[];}else current.push(`${x(i)},${y(v)}`);});if(current.length)groups.push(current);return groups.map(p=>`<polyline points="${p.join(' ')}" fill="none" stroke="${color}" stroke-width="2.2" ${dash?'stroke-dasharray="5 4"':''}/>`).join('');}
  s+=lines(f.series.reference_kw,'#8b97a8',true)+lines(f.series.load_kw,'#1677ff',false);
  f.series.load_kw.forEach((v,i)=>{s+=`<rect x="${L+i*w/96}" y="${T}" width="${w/96}" height="${ph}" fill="transparent"><title>${String(Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')} · ${f.meta.model_name} ${fmt(v,2)} kW · ${t('参考值','Reference')} ${num(f.series.reference_kw[i])}</title></rect>`;});
  return `<div class="legend"><span><i style="background:#1677ff"></i>${f.meta.model_name}</span><span><i style="background:#8b97a8"></i>${t('负荷参考曲线','Load reference')}</span></div><div class="chart">${s}</svg></div>`;
 }
 forecast=function(){
  if(!active())return sourcePanel()+old.forecast();
  const f=get(),ready=forecastReady();
  if(UI.forecast==='pv'&&ready)return sourcePanel()+old.forecast().replace('正式研究模型待接入。',t('负荷模型已接入，光伏仍为演示序列。','Trained load connected; PV remains a demo series.'));
  const header=`${sourcePanel()}${queryBar()}<section class="card"><div class="cardhead"><h3>${t('负荷与光伏预测','Load & PV Forecasts')}</h3><div class="actions">${btn(t('模型详情','Model details'),"showEvidence('forecast')",'small',!ready)}${btn(t('输出预测数据','Generate forecast'),"outputForecast()",'primary small')}${btn(t('导出96步','Export 96 steps'),"exportLoadForecast96()",'small',!ready)}${btn(t('参数配置','Asset settings'),"go('parameters')",'small')}${btn(t('进入调度','Open dispatch'),"go('dispatch')",'small primary')}</div></div>`;
  if(!ready)return header+outputEmpty('forecast')+'</section>';
  return header+`<div data-output-results="forecast"><div class="tabline"><div class="tabs"><button class="tab active" onclick="UI.forecast='load';render()">${t('负荷预测','Load forecast')}</button><button class="tab" onclick="UI.forecast='pv';render()">${t('光伏预测','PV forecast')}</button></div><span class="sub">${f.meta.model_name} · ${S.date} · 15 min / 96</span></div><div class="prediction-layout"><div class="hour-table"><table><thead><tr><th>${t('时段','Time')}</th><th>${t('预测','Forecast')} (kW)</th><th>${t('参考','Reference')} (kW)</th></tr></thead><tbody>${f.series.load_kw.map((v,i)=>`<tr><td>${String(Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')}</td><td>${fmt(v,2)}</td><td>${num(f.series.reference_kw[i])}</td></tr>`).join('')}</tbody></table></div><div class="prediction-chart">${curve(f)}<div class="kpis prediction-stats">${kpi('MAE',num(f.metrics.mae),'kW',t('本日参考时段','Referenced intervals'))}${kpi('RMSE',num(f.metrics.rmse),'kW',t('本日参考时段','Referenced intervals'))}${kpi('R²',num(f.metrics.r2,3),'',`${f.metrics.count} / 96`)}</div><div class="note-line">${t('归档训练结果；调度使用四点均值后的24小时负荷。光伏、电价和碳因子仍为演示数据。','Archived trained output; dispatch uses 24 hourly means. PV, prices and carbon factors remain demo data.')}</div></div></div></div></section>`;
 };
 showEvidence=function(type){if(active()&&['data','forecast'].includes(type)&&forecastReady()){const f=get();modal(t('负荷预测结果接口','Load forecast result interface'),`<pre>${safeText(JSON.stringify({schema_version:1,...f.meta,source:'offline trained artifacts; not live inference',reference_observed_points:f.metrics.count,units_note:'kW assumption subject to meter unit/multiplier confirmation',model_test_metrics:B.models[S.loadModel].metrics,reference_handling:'hourly energy-preserving repeat4; null reference points excluded from metrics',dispatch:'96x15min -> 24x1h mean; PV remains synthetic'},null,2))}</pre>`);return;}return old.showEvidence(type);};
 globalThis.exportLoadForecast96=function(){if(!active()||!forecastReady())return false;const f=get();download(`${f.meta.model_name}-${S.date}-96steps.json`,JSON.stringify({schema_version:1,...f.meta,timezone:'Asia/Shanghai',...f.series},null,2),'application/json;charset=utf-8');return true;};
 reportText=function(r){let text=old.reportText(r);const m=r?.inputs?.data?.loadForecast;if(m&&interfaceLanguage==='en')return text.replace('All default data are synthetic.',`Load: ${m.model_name} / ${m.model_version}; issued ${m.issued_at};96 quarter-hour forecasts averaged to24 hourly powers. PV,price and carbon remain synthetic.`).replace('Production forecasting, carbon-factor and control models remain to be connected.','Offline trained-load outputs are connected; production carbon/control and PV remain pending.');if(m)text=text.replace('全部数据为合成，预测与参考值非实测。',`负荷：${m.model_name} / ${m.model_version}；归档预测起点 ${m.issued_at}；96点×15min，经四点均值用于小时调度。光伏、电价、碳因子仍为合成演示。\n`).replace('正式专业模型待接入。','负荷预测离线结果已接入，其他专业模块待接入。');return text;};
 outputHistory=function(){let html=old.outputHistory();S.archive.forEach(r=>{if(r.loadModel)html=html.replace(`${r.version}</td><td>合成演示`,`${r.version}</td><td>${r.loadModel.model_name}`);});return html;};
 Object.assign(translations,{'模型结果':'Model results','负荷模型结果 · 15分钟展示 / 小时调度':'Trained load · 15-minute display / hourly dispatch','模型负荷 · 24个时段':'Model load · 24 intervals','负荷来自归档模型输出；光伏150 kWp和储能仍为演示假设':'Load uses archived model outputs; PV150kWp and battery remain demo assumptions','负荷模型输出 / 光伏演示':'Load model / demo PV','负荷模型已接入，光伏仍为演示序列。':'Trained load connected; PV remains a demo series.'});
 if(!window.ENERGYOPS_DISABLE_MODEL_DEFAULT)setLoadForecastModel('PatchTST');
})();
