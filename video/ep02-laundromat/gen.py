import json,sys,os
exec(open('scenes.py').read())
REF={'A':A,'I':I,'S':S,'Y':'bf4879ac-4a60-408d-ae36-e9e0d70968b1','D':'adf1a7aa-8042-4b8c-8ca7-198987496702','T':'43d28942-56aa-4243-bb6f-526294335894','R':'a5450628-7745-44d3-9efd-2c27212e3fd4'}
done=dict(l.split() for l in open('done.tsv')) if os.path.exists('done.tsv') else {}
done['D0']='adf1a7aa-8042-4b8c-8ca7-198987496702'
REF['W']=done.get('s22')
order=['s22','c4','s81','s115','s28']+[k for k in SC if k not in ('s22','c4','s81','s115','s28')]
PRE="Clean flat 2D cartoon illustration, same style as the references: bold clean outlines, flat colors, soft light, simple uncluttered backgrounds. Keep any recurring characters exactly as in the references. "
batch=[];n=int(sys.argv[1]) if len(sys.argv)>1 else 4
for k in order:
    if k in done: continue
    p,refs=SC[k]; ids=[]
    ok=True
    for r in refs:
        v=REF.get(r) or done.get(r)
        if not v: ok=False;break
        ids.append(v)
    if not ok: continue
    idx=order.index(k)+1
    batch.append({'index':idx,'params':{'model':'seedream_v5_pro','resolution':'1k','aspect_ratio':'16:9','medias':[{'role':'image_references','value':v} for v in ids],'prompt':PRE+p}})
    if len(batch)==n: break
json.dump(batch,sys.stdout)
