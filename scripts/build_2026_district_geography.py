#!/usr/bin/env python3
"""Import the official 2026/120th-Congress Census TIGER congressional districts.

Only the nine states that changed lines between the 2024 and 2026 elections,
plus Georgia/New York (which changed between 2022 and 2024), need replacement.
MO is deliberately excluded: the Census' initial 120th files reflected a
Missouri map subsequently barred from the Nov 3, 2026 ballot.

Run intentionally as a one-time reproducible data build (not a runtime fetch).
Dependencies: pyshp, shapely. Source: U.S. Census Bureau, public domain.
"""
from __future__ import annotations
import hashlib
import io
import json
import os
from pathlib import Path
import re
import urllib.request
import zipfile

import shapefile  # pyshp
from shapely.geometry import shape, mapping
from shapely.validation import explain_validity

ROOT=Path(__file__).resolve().parents[1]
REGISTRY=ROOT/"house/data.json"
DEST=ROOT/"geo/districts"
AUDIT=ROOT/"research/2026-district-geography-audit.json"
FIPS={"AL":"01","CA":"06","FL":"12","GA":"13","LA":"22","NC":"37",
      "NY":"36","OH":"39","TN":"47","TX":"48","UT":"49"}
REDRAW={"AL","CA","FL","LA","NC","OH","TN","TX","UT"}
SOURCE_BASE="https://www2.census.gov/geo/tiger/TIGER2026/CD/"
SPLIT_TOLERANCE=0.0035

def download(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Ervin-Model-2026-Official-Census-Geography/1.0","Accept":"application/zip"})
    with urllib.request.urlopen(req,timeout=100) as response:
        if response.status!=200: raise ValueError(f"download HTTP {response.status}: {url}")
        blob=response.read(12_000_001)
    if len(blob)>12_000_000 or len(blob)<1000:raise ValueError(f"Unexpected Census ZIP size: {len(blob)}: {url}")
    return blob

def rounded_geo(value):
    if isinstance(value,float):return round(value,4)
    if isinstance(value,list):return [rounded_geo(x) for x in value]
    if isinstance(value,tuple):return [rounded_geo(x) for x in value]
    if isinstance(value,dict):return {k:rounded_geo(v) for k,v in value.items()}
    return value

def convert(code,zip_bytes,expected):
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        entries={Path(n).suffix.lower():n for n in z.namelist()}
        if not {".shp",".shx",".dbf"}.issubset(entries):
            raise ValueError(f"{code} Census zip is missing shapefile components")
        reader=shapefile.Reader(shp=io.BytesIO(z.read(entries[".shp"])),
                                shx=io.BytesIO(z.read(entries[".shx"])),
                                dbf=io.BytesIO(z.read(entries[".dbf"])),encoding="latin-1")
        fields=[x[0] for x in reader.fields[1:]]
        district_field=next((x for x in ("CD120FP","CD120","CD119FP") if x in fields),None)
        if district_field!="CD120FP":
            raise ValueError(f"{code} source is not the official 120th congressional district shapefile: {fields}")
        features=[]
        for sr in reader.iterShapeRecords():
            data=dict(zip(fields,sr.record))
            raw=str(data[district_field]).strip().zfill(2)
            if not re.fullmatch(r"\d\d",raw):raise ValueError(f"Invalid district {code}: {raw}")
            district="01" if raw=="00" else raw
            geom=shape(sr.shape.__geo_interface__)
            if geom.is_empty:raise ValueError(f"{code}-{district} empty geometry")
            if not geom.is_valid:
                repaired=geom.buffer(0)
                if not repaired.is_valid or repaired.is_empty:
                    raise ValueError(f"{code}-{district} geometry invalid: {explain_validity(geom)}")
                geom=repaired
            geom=geom.simplify(SPLIT_TOLERANCE,preserve_topology=True)
            if geom.geom_type not in ("Polygon","MultiPolygon") or geom.is_empty:
                raise ValueError(f"{code}-{district}: malformed simplified polygon")
            features.append({"type":"Feature","id":district,
                             "properties":{"name":"Congressional District "+str(int(district))},
                             "geometry":rounded_geo(mapping(geom))})
    features.sort(key=lambda x:int(x["id"]))
    ids=[x["id"] for x in features]
    if len(ids)!=expected or len(set(ids))!=expected:
        raise ValueError(f"{code} 2026 Census districts {ids} do not match {expected} House races")
    return {"type":"FeatureCollection","state":code,"boundaryYear":2026,
      "congress":120,"source":"U.S. Census Bureau 2026 TIGER/Line · 120th Congressional Districts",
      "sourceUrl":SOURCE_BASE+f"tl_2026_{FIPS[code]}_cd120.zip",
      "sourceNotice":"Simplified Census Bureau geography for the 2026 election; district polygons, not vote reporting units.",
      "disclaimer":"District lines reflect U.S. Census 120th Congress 2026 official submissions. This map is not a substitute for an address-level official ballot lookup.",
      "features":features}

def main():
    races=json.loads(REGISTRY.read_text())["seats"]
    expected={code:sum(r["code"]==code for r in races) for code in FIPS}
    counts={}
    for code,fips in FIPS.items():
        url=SOURCE_BASE+f"tl_2026_{fips}_cd120.zip"
        payload=download(url)
        output=convert(code,payload,expected[code])
        path=DEST/f"{code}.json"
        path.write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n")
        counts[code]={"districts":len(output["features"]),"zipSha256":hashlib.sha256(payload).hexdigest(),
            "sizeBytes":path.stat().st_size,"boundaryYear":2026,"url":url,
            "new2026Map":code in REDRAW}
        print(f"OFFICIAL 2026 CENSUS MAP {code}: {counts[code]['districts']} districts, {counts[code]['sizeBytes']} bytes",flush=True)
    if sum(x["districts"] for x in counts.values())!=sum(expected.values()):
        raise ValueError("Incomplete district geography")
    AUDIT.write_text(json.dumps({"asOf":"2026-11-03","geometrySource":"U.S. Census Bureau 2026 TIGER/Line CD120 (official public domain)",
       "sourceDirectory":SOURCE_BASE,
       "congress":120,"states":counts,"missouriExcluded":True,
       "missouriReason":"Missouri 2026 Census CD120 files were generated while a subsequently barred map was under litigation; retain the 2024 ballot shape instead.",
       "redrawnStates":sorted(REDRAW),"comparisonStates":["GA","NY"],
       "simplificationToleranceDegrees":SPLIT_TOLERANCE,
       "notes":"Census source polygons are simplified with topology preserved and coordinate rounding; verify district labels/number of expected districts before publication."},
       indent=2)+"\n")
    print("OFFICIAL 2026 CONGRESSIONAL GEOGRAPHY COMPLETE",json.dumps({k:v["districts"] for k,v in counts.items()}))

if __name__=="__main__":main()
