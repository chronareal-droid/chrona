# usage: bash half.sh START END OUTNAME UPLOADURL
set -e
S=$1; E=$2; O=$3; U=$4
mkdir -p w && cd w
B=https://d8j0ntlcm91z4.cloudfront.net/user_3FtauoFfi4aiT2rOZozLFkzeELN/
awk -v s=$S -v e=$E '$1>=s && $1<=e' ../m.tsv > m_$O.tsv
cat m_$O.tsv | xargs -P 8 -L 1 sh -c 'x=$(echo $1 | sed "s/.*\.//"); [ -s "i$0.$x" ] || curl -sSfL --retry 3 -o "i$0.$x" "'$B'$1"; [ -s "a$0.mp3" ] || curl -sSfL --retry 3 -o "a$0.mp3" "'$B'$2"'
echo "dl $O"
: > list_$O.txt
while read -r i img aud; do
  x=${img##*.}
  ad=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "a$i.mp3")
  d=$(python3 -c "print(round($ad+0.75,3))")
  fr=$(python3 -c "import math;print(math.ceil($d*30))")
  if [ $((i%2)) -eq 0 ]; then Z="1.0+0.07*on/$fr"; else Z="1.07-0.07*on/$fr"; fi
  [ -s "c$i.mp4" ] || ffmpeg -nostdin -v error -y -loop 1 -framerate 30 -i "i$i.$x" -i "a$i.mp3" -filter_complex "[0:v]scale=2720:-2,zoompan=z='$Z':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$fr:s=1920x1080:fps=30,format=yuv420p,trim=end_frame=$fr,setpts=PTS-STARTPTS[v];[1:a]aresample=48000,adelay=250:all=1,apad,atrim=0:$d,asetpts=PTS-STARTPTS[a]" -map "[v]" -map "[a]" -c:v libx264 -preset veryfast -crf 20 -r 30 -c:a aac -b:a 192k -ac 2 -t $d "c$i.mp4"
  echo "file 'c$i.mp4'" >> list_$O.txt
  echo "clip $i $d $(date +%T)"
done < m_$O.tsv
ffmpeg -nostdin -v error -y -f concat -safe 0 -i list_$O.txt -c copy -movflags +faststart $O.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 $O.mp4
curl -s -o /dev/null -w "UPLOAD $O %{http_code}\n" -X PUT -H "Content-Type: video/mp4" --upload-file $O.mp4 "$U"
echo "DONE $O"
