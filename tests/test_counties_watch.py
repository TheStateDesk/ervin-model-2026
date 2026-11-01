import datetime as dt
import json
import pathlib
import sys
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from refresh_counties_watch import validate,merge,instant,UTC,ROOT

HISTORY=json.loads((ROOT/"counties-watch/history.json").read_text(encoding="utf-8"))
LOOKUP={st:{u["fips"]:u for u in x["units"]}for st,x in HISTORY["states"].items()}
ELECTION_NOW=dt.datetime(2026,11,4,23,0,tzinfo=UTC)

class CountyWatchTests(unittest.TestCase):
 def test_170_ranked_watch_units_and_histories(self):
  self.assertEqual(len(LOOKUP),17)
  self.assertEqual(sum(map(len,LOOKUP.values())),170)
  for st,units in LOOKUP.items():
   self.assertEqual(len(units),10)
   ids=list(units)
   self.assertEqual(len(ids),len(set(ids)))
   for u in units.values():
    self.assertGreater(u["v24"]["d"]+u["v24"]["r"],0)
    self.assertGreaterEqual(u["benchmarkShare"],1)
    self.assertLessEqual(u["benchmarkShare"],99)
    self.assertGreaterEqual(u["alignment"]["matches"],0)
    self.assertLessEqual(u["alignment"]["matches"],u["alignment"]["cycles"])
    self.assertEqual(u["alignment"]["cycles"],1 if st=="AK" else 3)
 def test_2024_baseline_state_totals(self):
  for st,s in HISTORY["states"].items():
   total=s["stateCycles"]["2024"]
   self.assertGreater(total["d"],0)
   self.assertGreater(total["r"],0)
   self.assertLessEqual(s["selectedBallotShare"],100)
   self.assertGreater(s["selectedBallotShare"],10)
 def sample(self,**kwargs):
  unit=next(iter(LOOKUP["MI"].values()))
  x={"fips":unit["fips"],"county":unit["name"],"dem":19382,"rep":12679,
     "other":845,"asOf":"2026-11-04T02:25:00+00:00",
     "sourceUrl":"https://www.michigan.gov/sos/","reportingStatus":"partial"}
  return dict(x,**kwargs)
 def test_validate_complete_attributed_report(self):
  u=validate(self.sample(),"MI",LOOKUP,ELECTION_NOW)
  self.assertEqual(u["dem"],19382)
  self.assertEqual(u["sourceUrl"],"https://www.michigan.gov/sos/")
 def test_reject_future_and_preclose(self):
  for at in ("2026-11-04T00:30:00+00:00","2026-11-06T02:00:00+00:00"):
   with self.assertRaises(ValueError):validate(self.sample(asOf=at),"MI",LOOKUP,ELECTION_NOW)
 def test_source_and_vote_provenance(self):
  for bad in ("http://example.com","javascript:alert(1)","https://user:pass@example.com"):
   with self.assertRaises(ValueError):validate(self.sample(sourceUrl=bad),"MI",LOOKUP,ELECTION_NOW)
  for bad in (-1,3.14,"10.5","not a count"):
   with self.assertRaises(ValueError):validate(self.sample(dem=bad),"MI",LOOKUP,ELECTION_NOW)
 def test_fips_and_name_join(self):
  with self.assertRaises(ValueError):validate(self.sample(fips="99001"),"MI",LOOKUP,ELECTION_NOW)
  with self.assertRaises(ValueError):validate(self.sample(county="Other"),"MI",LOOKUP,ELECTION_NOW)
 def test_monotonic_snapshot(self):
  old={"states":{"MI":{"counties":[self.sample()]}}}
  older=self.sample(asOf="2026-11-04T01:35:00+00:00",dem=1)
  rows,errors=merge(HISTORY,old,[("MI",older)],ELECTION_NOW)
  self.assertEqual(rows["MI"]["counties"][0]["dem"],19382)
  revised=self.sample(asOf="2026-11-04T02:45:00+00:00",dem=20000)
  rows,errors=merge(HISTORY,old,[("MI",revised)],ELECTION_NOW)
  self.assertEqual(rows["MI"]["counties"][0]["dem"],20000)
 def test_alaska_district_different_geography(self):
  self.assertTrue(all(u["v20"] is None and u["v16"] is None for u in LOOKUP["AK"].values()))
  self.assertTrue(all(u["kind"]=="Alaska House district" for u in LOOKUP["AK"].values()))
if __name__=="__main__":unittest.main()
