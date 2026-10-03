# Episode 2 — delivery

**Final video (21:08, subtitles, echo-reduced voice, no music):**
https://d2ol7oe51mr4n9.cloudfront.net/user_3FtauoFfi4aiT2rOZozLFkzeELN/cb5e8024-36c4-4eee-9e25-d59f8518a54b.mp4

Clean cut (no subtitles, raw voice; its audio drifts if re-encoded, use only as video source):
https://d2ol7oe51mr4n9.cloudfront.net/user_3FtauoFfi4aiT2rOZozLFkzeELN/62022001-5b74-4a75-9ba4-7eed58a10d48.mp4

Thumbnails (no text):
- T1 loud-vs-quiet split: https://d8j0ntlcm91z4.cloudfront.net/user_3FtauoFfi4aiT2rOZozLFkzeELN/hf_20261003_052139_5ae7a66e-5782-4db4-a317-5df65f3e36b1.png
- T2 arms folded, Tyson's car towed outside: https://d8j0ntlcm91z4.cloudfront.net/user_3FtauoFfi4aiT2rOZozLFkzeELN/hf_20261003_052139_f5836851-29e7-443f-a847-3cbb4d1d134f.png

Title, description and chapter timestamps: see script.md.

## Build notes
- Voice track is rebuilt sample-accurately from the per-line mp3s (each padded to its clip's exact length),
  then cleaned. Concatenating per-clip AAC with `-c copy` and re-encoding adds ~25 ms per clip
  (~4 s drift over 160 clips) — don't do that.
- Continuity fixes during recording: line 83 (Dolores's note was already paid off), line 128
  (Rosa makes the job offer, so Tyson never learns who owns the company), line 138 (Dolores is 85).
