import csv,io,urllib.request
sites={
 "electionsinusa":"https://electionsinusa.com/data/candidates.csv",
 "deepsyte":"https://deepsyte.app/data/candidates-2026.csv",
 "ballotbrief":"https://theballotbrief.com/candidates/us-house",
 "civicarchive":"https://thecivicarchive.org/ballot/us/",
 "electionsinusa_html":"https://electionsinusa.com/2026/house/",
}
for label,u in sites.items():
 try:
  req=urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36","Accept":"text/html,text/csv;q=0.9,*/*;q=0.8"})
  with urllib.request.urlopen(req,timeout=12) as r:
   b=r.read(1000000);print(label,"STATUS",r.status,"MIME",r.headers.get("content-type"),"LENGTH",len(b),"SAMPLE",repr(b[:180]))
   if '.csv' in u and b:
    x=csv.DictReader(io.StringIO(b.decode('utf-8-sig')))
    print(label,"COLUMNS",x.fieldnames,"FIRST",next(x,None))
 except Exception as e:print(label,"ERROR",str(e)[:180])
