import sys
B='https://d8j0ntlcm91z4.cloudfront.net/user_3FtauoFfi4aiT2rOZozLFkzeELN/hf_'
with open('img_done.tsv','a') as f:
    for a in sys.argv[1:]:
        i,s=a.split(':',1); f.write(f"{i}\t{B}{s}.png\n")
