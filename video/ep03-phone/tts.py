import json,sys,os
rows=[l.rstrip('\n').split('\t') for l in open('segments.tsv')]
done=set(l.split()[0] for l in open('audio_done.tsv')) if os.path.exists('audio_done.tsv') else set()
skip=set(sys.argv[2:]); n=int(sys.argv[1])
out=[]
for r in rows:
    i=r[0]
    if i in done or i in skip: continue
    out.append({'index':int(i),'params':{'model':'text2speech_v2','variant':'elevenlabs','voice_id':'573e5163-59b3-4926-aab1-951ef2985f81','voice_type':'preset','prompt':r[2]}})
    if len(out)==n: break
print(json.dumps(out))
