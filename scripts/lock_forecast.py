#!/usr/bin/env python3
"""Produce an immutable evidence snapshot for the noon Election Day forecast.
Run after validated final polling refresh. Exit without overwriting an existing lock.
"""
import datetime as dt
import json
import os
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"final"/"forecast-final.json"
STATUS=ROOT/"final"/"status.json"
FILES=["counties-watch/forecast-baselines.json","governors/data.json",
       "house/ervin-forecast-2026-11-02.json","research/governor-same-office-2014-2024.json"]
def main():
 if OUT.exists():
  existing=json.loads(OUT.read_text())
  assert existing.get("lockedAt") and len(existing.get("data",{}))==4, "Existing lock corrupt; manual recovery required"
  print("Existing final forecast stays immutable:",existing["lockedAt"])
  return
 now=dt.datetime.now(dt.timezone.utc)
 assert now>=dt.datetime(2026,11,3,14,30,tzinfo=dt.timezone.utc),"Do not lock before Nov 3, 09:30 ET"
 data={p:json.loads((ROOT/p).read_text()) for p in FILES}
 assert len(data[FILES[0]]["states"])==17 and len(data[FILES[1]]["races"])==36 and len(data[FILES[2]]["races"])==435
 sha=subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
 lock={"schema":1,"lockedAt":now.isoformat(timespec="seconds"),"sourceCommit":sha,
       "officeRule":"Senate and governor close margins under 1.5 points are Toss-up",
       "data":data,"message":"This is a pre-election forecast, not actual voting returns. Do not overwrite."}
 OUT.parent.mkdir(parents=True,exist_ok=True)
 tmp=OUT.with_suffix(".json.tmp")
 tmp.write_text(json.dumps(lock,ensure_ascii=False,separators=(",",":"))+"\n")
 os.replace(tmp,OUT)
 status=json.loads(STATUS.read_text())
 status["finalLockedAt"]=lock["lockedAt"]
 STATUS.write_text(json.dumps(status,indent=2)+"\n")
 print("Locked Senate, governor, House and calibration historical inputs:",lock["lockedAt"],sha)
if __name__=="__main__":main()
