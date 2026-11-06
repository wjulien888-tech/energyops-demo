"""Export trained output only, no raw SQL or model weights, for EnergyOps."""
import csv,json,hashlib,argparse
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--research-root',required=True);args=parser.parse_args()
ROOT=Path(args.research_root).resolve()
OUT=Path(__file__).resolve().parent.parent/'dist/load-forecast-data.js'
bundle={'schema_version':1,'timezone':'Asia/Shanghai','interval_minutes':15,'point_count':96,'meter_id':'SE4-ZALGL1','models':{},'metadata':{'data_type':'model_forecast','reference_type':'hourly_energy_preserving_resample','integration':'offline_prediction_artifact','dispatch_interval_minutes':60,'source_observed_hour_energy_conserving':True}}
for model,folder,display in [('PatchTST','dorm_patchtst_15min','DormPatch-96'),('DLinear','dorm_dlinear_15min','DormLinear-96')]:
 p=ROOT/'projects'/folder/'results';rows=[r for r in csv.DictReader(open(p/'predictions96.csv',encoding='utf-8-sig')) if r['split']=='test' and r['method']==model];protocol=json.load(open(p/'protocol.json'));metrics=[r for r in csv.DictReader(open(p/'metrics.csv',encoding='utf-8-sig')) if r['split']=='test' and r['method']==model];days={}
 for origin in sorted(set(r['origin'] for r in rows)):
  a=sorted([r for r in rows if r['origin']==origin],key=lambda r:int(r['step']));assert len(a)==96
  days[origin[:10]]={'issued_at':origin.replace(' ','T')+'+08:00','start_time':a[0]['target_time'].replace(' ','T')+'+08:00','timestamps':[r['target_time'].replace(' ','T')+'+08:00' for r in a],'load_kw':[float(r['pred_power_conditional_kw']) for r in a],'reference_kw':[float(r['derived_actual_power_conditional_kw']) if r['derived_from_observed_hour']=='1' else None for r in a],'reference_observed':[r['derived_from_observed_hour']=='1' for r in a]}
 bundle['models'][model]={'id':model,'name':display,'architecture':model,'version':f'{display}-20261104-seed42','best_epoch':protocol['best_epoch'],'metrics':{r['resolution']:{'mae_kw':float(r['mae_conditional_kw']),'rmse_kw':float(r['rmse_conditional_kw'])} for r in metrics},'prediction_sha256':hashlib.sha256((p/'predictions96.csv').read_bytes()).hexdigest(),'days':days}
OUT.write_text('/* Generated from versioned trained forecast artifacts. */\nwindow.EnergyOpsLoadForecastData = '+json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print(OUT,OUT.stat().st_size,'bytes')
