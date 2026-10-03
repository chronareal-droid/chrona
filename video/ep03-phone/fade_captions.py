# Word-by-word fade-in captions. Input: words.json from audio_to_captions.py --json.
# Output: words.ass; burn with: ffmpeg -i in.mp4 -vf "ass=words.ass:fontsdir=/usr/share/fonts/truetype/higgsfield" ...
import json
caps=json.load(open('words.json'))['captions']
def ts(t):
    cs=int(round(t*100)); h=cs//360000; m=cs%360000//6000; s=cs%6000//100; c=cs%100
    return f"{h}:{m:02d}:{s:02d}.{c:02d}"
out=["[Script Info]","ScriptType: v4.00+","PlayResX: 1920","PlayResY: 1080","WrapStyle: 2","ScaledBorderAndShadow: yes","",
"[V4+ Styles]","Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
"Style: W,Montserrat ExtraBold,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,3.5,0,2,60,60,80,1","",
"[Events]","Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for k,c in enumerate(caps):
    st,en=c['start'],c['end']
    nxt=caps[k+1]['start'] if k+1<len(caps) else en+1
    end=min(max(en+0.35,st+0.5),nxt) if nxt>st else en
    words=c['text'].replace('{','(').replace('}',')').split()
    span=max(en-st,0.2); tot=sum(len(w)+1 for w in words); acc=0; parts=[]
    for w in words:
        t0=int(1000*span*acc/tot); acc+=len(w)+1
        parts.append("{\\alpha&HFF&\\t(%d,%d,\\alpha&H00&)}%s"%(t0,t0+180,w))
    out.append(f"Dialogue: 0,{ts(st)},{ts(end)},W,,0,0,0,,"+" ".join(parts))
open('words.ass','w').write("\n".join(out)+"\n")
