import json,sys,os
exec(open('scenes.py').read())
REF={'Y':'8f16b2df-731a-46e8-9e4a-59ca79b77f3e','S':'42ffee57-79fd-4ab8-b75f-3ae734abace2','J':'30ad41f4-248e-4eb6-aa4a-0214c9654f4c','T':'53e00779-4698-42b5-9dca-6d384bb085a8','M':'81811a94-86d0-4c52-bc81-a9e1cd0c3718','O':'f600fcd1-a829-4eff-a9d1-7e7abe276997','D':'9e733468-6df2-42c0-8caa-29754efee71b'}
done=set(l.split('\t')[0] for l in open('img_done.tsv')) if os.path.exists('img_done.tsv') else set()
n=int(sys.argv[1]); skip=set(sys.argv[2:]); out=[]
for i in sorted(SC):
    if str(i) in done or str(i) in skip: continue
    p,refs=SC[i]
    for nm,d in [('Jay','Jay (curly hair, red bomber jacket, gold chain)'),('Tasha','Tasha (box braids, yellow jacket)'),('Marco','Marco (round glasses, green beanie)'),('Mr. Okafor','Mr. Okafor (older man, grey beard, brown cardigan)'),('Danny','Danny (buzz cut, black t-shirt, headphones)')]:
        if nm in p: p=p.replace(nm,d,1)
    if 'S' not in refs: refs=['S']+refs
    pre="Bright clean 2D cartoon infographic, same style as the references, crisp large readable labels exactly as written. " if 'nfographic' in p else STYLE
    out.append({'index':i,'params':{'model':'gpt_image_2_5','quality':'low','resolution':'1k','aspect_ratio':'16:9','medias':[{'role':'image_references','value':REF[r]} for r in refs],'prompt':pre+p}})
    if len(out)==n: break
print(json.dumps(out))
