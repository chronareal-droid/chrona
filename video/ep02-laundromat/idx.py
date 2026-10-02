exec(open('scenes.py').read())
order=['s22','c4','s81','s115','s28']+[k for k in SC if k not in ('s22','c4','s81','s115','s28')]
import sys
for a in sys.argv[1:]:
    i,j=a.split('=');print(order[int(i)-1],j)
