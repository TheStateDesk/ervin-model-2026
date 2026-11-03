#!/usr/bin/env python3
"""Fetch verified 2026 congressional boundaries from the U.S. Census TIGERWeb.

The Census 120th district ArcGIS service reflects 2026 maps in the nine
changed states below. Missouri is deliberately excluded: a 2026 court ruling
restored its prior map after some Census 120th products had been compiled.
Data are rendered as simplified lat/lon GeoJSON for the existing local map
engine; only validated nine-state complete sets are written.

This never copies old CD118 geometry and relabels it CD120.
"""
import datetime
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ENDPOINT="https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query"
SOURCE="https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0"
# FIPS code and fixed Census apportionment; these nine states had new maps
# for the November 2026 elections. The count total is 173 districts.
STATES={
    "AL":("01",7),"CA":("06",52),"FL":("12",28),"LA":("22",6),
    "NC":("37",14),"OH":("39",15),"TN":("47",9),
    "TX":("48",38),"UT":("49",4)
}
assert sum(x[1] for x in STATES.values())==173
HEADERS={"User-Agent":"ErvinModel2026-source-verification/1.0 (https://github.com/geervin/ervin-model-2026)","Accept":"application/geo+json,application/json"}

def rings(geometry):
    if geometry["type"]=="Polygon":return geometry["coordinates"]
    if geometry["type"]=="MultiPolygon":return [ring for polygon in geometry["coordinates"] for ring in polygon]
    raise ValueError("Non-polygon geometry "+str(geometry.get("type")))

def valid_coords(geom):
    count=0
    for ring in rings(geom):
        if len(ring)<4 or ring[0]!=ring[-1]:raise ValueError("Unclosed or underspecified district ring")
        for lon,lat,*z in ring:
            if not(-180<=lon<=180 and -90<=lat<=90) or z:raise ValueError("Invalid geographic lon/lat")
            count+=1
    return count

def download(state,fips,n):
    query={"where":f"STATE='{fips}' AND CD120 <> 'ZZ'","outFields":"STATE,CD120,BASENAME,GEOID","returnGeometry":"true",
           "outSR":"4326","maxAllowableOffset":"0.015","geometryPrecision":"4",
           "f":"geojson","resultRecordCount":"100"}
    url=ENDPOINT+"?"+urllib.parse.urlencode(query)
    last=None
    for attempt in range(3):
        try:
            request=urllib.request.Request(url,headers=HEADERS)
            with urllib.request.urlopen(request,timeout=35) as resp:
                if resp.status!=200:raise ValueError("Census HTTP "+str(resp.status))
                raw=resp.read(12_000_001)
            if len(raw)>12_000_000:raise ValueError("Oversized raw geometry response")
            data=json.loads(raw)
            if data.get("type")!="FeatureCollection" or "error" in data:
                raise ValueError("Not GeoJSON FeatureCollection: "+str(data)[:150])
            found={}
            for f in data["features"]:
                p=f.get("properties") or {}
                cd=str(p.get("CD120") or "").zfill(2)
                sf=str(p.get("STATE") or "").zfill(2)
                if sf!=fips or not cd.isdigit() or not 1<=int(cd)<=n or cd in found:
                    raise ValueError(f"Wrong/duplicate state or district: {state} {sf} {cd}")
                geom=f.get("geometry") or {}
                if valid_coords(geom)<4:raise ValueError("Empty district "+cd)
                found[cd]={"type":"Feature","id":cd,"properties":{"name":"Congressional District "+str(int(cd))},
                           "geometry":geom}
            expected={str(i).zfill(2) for i in range(1,n+1)}
            if set(found)!=expected:raise ValueError(f"Census district coverage {state}: got {sorted(found)} expected {sorted(expected)}")
            obj={"type":"FeatureCollection","state":state,"boundaryYear":2026,"congress":"120th",
                 "source":SOURCE,"sourceMethod":"Census TIGERWeb 120th Congressional Districts, Jan 1 2026 vintage; 0.015-degree cartographic simplification, geometryPrecision 4",
                 "officialCensusMap":True,"electionApplicable2026":True,
                 "description":"Census congressional boundaries submitted by states for the 2026 election. No old 118th geometry used.",
                 "features":[found[k] for k in sorted(found)]}
            print("OFFICIAL CD120",state,n,"features","bytes",len(json.dumps(obj,ensure_ascii=False)),flush=True)
            return obj
        except Exception as exc:
            last=exc
            print("RETRY Census",state,attempt+1,type(exc).__name__,str(exc)[:180],flush=True)
            time.sleep(2+attempt*2)
    raise RuntimeError("Census 2026 district map unavailable "+state+" "+str(last))

def main():
    sets={state:download(state,fips,n) for state,(fips,n) in STATES.items()}
    # Fail closed: not one state is overwritten until all nine downloads and
    # district counts pass independently.
    assert sum(len(x["features"]) for x in sets.values())==173
    for state,collection in sets.items():
        path=ROOT/"geo"/"districts"/(state+".json")
        path.parent.mkdir(parents=True,exist_ok=True)
        text=json.dumps(collection,ensure_ascii=False,separators=(",",":"))+"\n"
        if not path.exists() or path.read_text()!=text:
            path.write_text(text)
    print("ALL NINE 2026 DISTRICT MAPS COMPLETE; 173 congressional polygons; Missouri unchanged pending legal confirmation")

if __name__=="__main__":
    main()
