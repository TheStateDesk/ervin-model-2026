import csv,io,urllib.request
u='https://electionsinusa.com/data/candidates.csv'
r=urllib.request.urlopen(u,timeout=20)
s=r.read().decode('utf-8-sig')
x=csv.DictReader(io.StringIO(s))
print('COLS',x.fieldnames)
print('FIRST',next(x))
