# ep03 build: sample-accurate clips + voice, echo-light cleanup, captions, year cards. usage: bash build.sh UPLOAD_URL
set -e
U="$1"; S=$HF_WORKFLOWS/video-montage/scripts
R=https://raw.githubusercontent.com/chronareal-droid/chrona/claude/inspiring-cerf-d4m918/video/ep03-phone
mkdir -p /home/user/ep3 && cd /home/user/ep3
curl -sSfL -o m.tsv $R/m.tsv; curl -sSfL -o script_manifest.json $R/script_manifest.json
bash $S/fetch_fonts.sh >/dev/null 2>&1 || true
FONT=/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf
cat > clip.sh <<'EOC'
i=$1; img=$2; aud=$3; card=$4; B=https://d8j0ntlcm91z4.cloudfront.net/user_3FtauoFfi4aiT2rOZozLFkzeELN/
FONT=/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf
[ -s "i$i.png" ] || curl -sSfL --retry 3 -o "i$i.png" "$B$img"
[ -s "a$i.mp3" ] || curl -sSfL --retry 3 -o "a$i.mp3" "$B$aud"
ad=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "a$i.mp3")
fr=$(python3 -c "import math;print(math.ceil(($ad+0.45)*30))")
D=$(python3 -c "print($fr/30)")
case $((i%5)) in
 0) Z="1.0+0.12*on/$fr"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)";;
 1) Z="1.12-0.12*on/$fr"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)";;
 2) Z="1.12"; X="(iw-iw/zoom)*on/$fr"; Y="ih/2-(ih/zoom/2)";;
 3) Z="1.12"; X="(iw-iw/zoom)*(1-on/$fr)"; Y="ih/2-(ih/zoom/2)";;
 4) Z="1.04+0.1*on/$fr"; X="iw/2-(iw/zoom/2)"; Y="(ih-ih/zoom)*(0.5-0.3*on/$fr)";;
esac
VF="[0:v]scale=5760:3240:flags=lanczos,zoompan=z='$Z':x='$X':y='$Y':d=$fr:s=1920x1080:fps=30,format=yuv420p"
if [ "$card" != "-" ]; then T=${card//_/ }; VF="$VF,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.35:t=fill:enable='lt(t,1.6)',drawtext=fontfile=$FONT:text='$T':fontsize=150:fontcolor=white:borderw=8:bordercolor=black:x=(w-tw)/2:y=(h-th)/2:alpha='if(lt(t,1.3),1,max(0,1-(t-1.3)/0.3))':enable='lt(t,1.6)'"; fi
ffmpeg -nostdin -v error -y -threads 2 -loop 1 -framerate 30 -i "i$i.png" -filter_complex "$VF,trim=end_frame=$fr,setpts=PTS-STARTPTS[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 20 -r 30 -frames:v $fr "c$i.mp4"
ffmpeg -nostdin -v error -y -i a$i.mp3 -af "aresample=48000,adelay=150:all=1,apad" -ac 2 -ar 48000 -t $D -c:a pcm_s16le w$i.wav
echo "clip $i $D"
EOC
cat m.tsv | xargs -P 6 -L 1 bash clip.sh > clips.log 2>&1 || true
echo "clips $(grep -c ^clip clips.log) $(date +%T)"; grep -v ^clip clips.log | head -5
: > vl.txt; : > wl.txt; for i in $(seq 1 155); do echo "file 'c$i.mp4'" >> vl.txt; echo "file 'w$i.wav'" >> wl.txt; done
ffmpeg -nostdin -v error -y -f concat -safe 0 -i vl.txt -c copy video.mp4
ffmpeg -nostdin -v error -y -f concat -safe 0 -i wl.txt -c copy voice.wav
echo "lens $(ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4) $(ffprobe -v error -show_entries format=duration -of csv=p=0 voice.wav)"
ffmpeg -nostdin -v error -y -i voice.wav -af "highpass=f=80,lowpass=f=12000,afftdn=nr=8:nf=-45,equalizer=f=300:t=q:w=1.2:g=-2,equalizer=f=3500:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=3:attack=10:release=150,loudnorm=I=-15:TP=-1.5:LRA=7,aresample=48000" -ac 2 -c:a pcm_s16le voice_proc.wav
ffmpeg -nostdin -v error -y -i video.mp4 -i voice_proc.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart processed.mp4
ffmpeg -nostdin -v error -y -i video.mp4 -i voice.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest asr.mp4
echo "mux-ok $(date +%T)"
python3 $S/audio_to_captions.py asr.mp4 --srt caps.srt --script script_manifest.json --language en > asr.log 2>&1 || { tail -20 asr.log; exit 1; }
echo "caps-ok $(date +%T) $(grep -c -- '-->' caps.srt)"; tail -4 caps.srt
bash $S/burn_caps_clean.sh --in processed.mp4 --srt caps.srt --out final.mp4 --no-caps --fontsize 15 --outline 1 --shadow 0
echo "burn-ok $(date +%T)"
ffprobe -v error -show_entries stream=codec_type,duration -of compact final.mp4
awk '{print $2,$3}' clips.log | sort -n > durs.txt
curl -s -o resp.txt -w "UPLOAD %{http_code}\n" -X PUT -H "Content-Type: video/mp4" --upload-file final.mp4 "$U"
echo ALLDONE
