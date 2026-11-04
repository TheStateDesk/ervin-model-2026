import datetime as dt
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import urllib.error
P=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("civic_national",P/"scripts/civicapi_national.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
UTC=dt.timezone.utc
class ElectionReporting(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,4,3,tzinfo=UTC)
  self.search={"id":87214,"province":"MI","country":"US","election_name":"Michigan US Senate","election_type":"US Senate","election_scope":"General","election_date":"2026-11-03"}
  self.detail={"election_name":"Michigan US Senate","election_type":"US Senate","election_scope":"General","election_date":"2026-11-03","province":"MI","country":"US","last_updated":"2026-11-04T02:30:00Z","test_data":False,"candidates":[{"name":"Candidate D","party":"Democratic","votes":12000},{"name":"Candidate R","party":"Republican","votes":11000}],"percent_reporting":25.0}
 def test_transient_gateway_retries_and_recovers(self):
  error=urllib.error.HTTPError("https://civicapi.org/api/v2/race/123",502,"Bad Gateway",{},None)
  with patch.object(m,"request",side_effect=[error,error,{"ok":True}]) as req,patch.object(m.time,"sleep") as pause:
   self.assertEqual(m.request_with_retry("https://civicapi.org/api/v2/race/123"),{"ok":True})
   self.assertEqual(req.call_count,3)
   self.assertEqual(pause.call_count,2)
 def test_permanent_404_is_not_retried(self):
  error=urllib.error.HTTPError("https://civicapi.org/api/v2/race/123",404,"Not Found",{},None)
  with patch.object(m,"request",side_effect=error) as req,patch.object(m.time,"sleep") as pause:
   with self.assertRaises(urllib.error.HTTPError):m.request_with_retry("https://civicapi.org/api/v2/race/123")
   self.assertEqual(req.call_count,1)
   pause.assert_not_called()
 def test_first_poll_closings_are_district_specific(self):
  first=dt.datetime(2026,11,3,23,0,tzinfo=UTC)
  second=dt.datetime(2026,11,4,0,0,tzinfo=UTC)
  for key in ["IN-02","IN-03","IN-04","IN-05","IN-06","IN-07","IN-09","KY-03","KY-04","KY-05","KY-06","KY-SENATE"]:
   self.assertEqual(m.after_close(key),first,key)
  for key in ["IN-01","IN-08","KY-01","KY-02"]:
   self.assertEqual(m.after_close(key),second,key)
 def test_split_zone_senate_partial_returns(self):
  # Real partial statewide counts may publish once eastern/earliest precincts close.
  for key,hour in [("FL-SENATE",0),("NH-SENATE",0),("MI-SENATE",1),("TX-SENATE",1),("ID-SENATE",3),("AK-SENATE",5)]:
   actual=m.after_close(key)
   wanted=dt.datetime(2026,11,4,hour,0,tzinfo=UTC)
   self.assertEqual(actual,wanted,key)
  # No Senate contest should publish an attributed vote before its first closing.
  search={"province":"KY","country":"US","election_name":"Kentucky US Senate","election_type":"US Senate","election_scope":"General","election_date":"2026-11-03"}
  detail={**search,"last_updated":"2026-11-03T23:05:00Z","candidates":[{"name":"D","party":"Democratic","votes":100},{"name":"R","party":"Republican","votes":200}]}
  self.assertIsNotNone(m.normalize("KY-SENATE",search,detail,dt.datetime(2026,11,3,23,12,tzinfo=UTC),87174))
  self.assertIsNone(m.normalize("KY-SENATE",search,detail,dt.datetime(2026,11,3,22,58,tzinfo=UTC),87174))
 def test_unmapped_wyoming_senate_uses_narrow_retryable_lookup(self):
  import urllib.parse
  queries=[]
  def fake(url,**kwargs):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["query"][0]
   queries.append((q,kwargs))
   return {"results":[{"id":87878,"province":"WY","election_name":"Wyoming US Senate","election_date":"2026-11-03"}]}
  with patch.object(m,"request_with_retry",side_effect=fake):
   matches=m.discover("WY","senate")
  self.assertEqual(len(matches),1)
  self.assertEqual(queries,[("US Senate",{"timeout":10,"max_attempts":3})])
 def test_unmapped_federal_house_fallback_deduplicates(self):
  import urllib.parse
  queries=[]
  def fake(url,**kwargs):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["query"][0]
   queries.append(q)
   return {"results":[]} if q=="US House" else {"results":[{"id":100,"province":"VT","election_name":"Vermont US House At Large","election_date":"2026-11-03"}]}
  with patch.object(m,"request_with_retry",side_effect=fake):
   rows=m.discover("VT","house")
  self.assertEqual(len(rows),1)
  self.assertEqual(queries,["US House","House"])
 def test_worker_capacity_scales_with_national_poll_closings(self):
  self.assertEqual(m.detail_worker_count(0),6)
  self.assertEqual(m.detail_worker_count(82),6)
  self.assertEqual(m.detail_worker_count(300),11)
  self.assertEqual(m.detail_worker_count(506),18)
 def test_unreported_races_are_checked_first_per_chamber(self):
  pending={"GA-SENATE":{},"MI-SENATE":{},"GA-GOVERNOR":{},"FL-03":{},"FL-04":{}}
  stored={"GA-SENATE":{"total":100},"FL-03":{"total":100}}
  ordered=sorted(pending.items(),key=lambda x:m.result_priority(x,stored))
  self.assertEqual([key for key,_ in ordered],["MI-SENATE","GA-SENATE","GA-GOVERNOR","FL-04","FL-03"])
 def test_registry_506(self):
  x=m.targets();self.assertEqual(len(x),506)
  self.assertEqual(sum(v["office"]=="house" for v in x.values()),435)
  self.assertEqual(sum(v["office"]=="senate" for v in x.values()),35)
  self.assertIn("CO-SENATE",x)
  self.assertIn("RI-SENATE",x)
  self.assertEqual(sum(v["office"]=="governor" for v in x.values()),36)
 def test_every_2026_race_has_an_audit_status(self):
  expected=m.targets()
  registry={k:{"office":v["office"]} for k,v in expected.items() if k not in ("WY-SENATE","VT-01")}
  now=dt.datetime(2026,11,4,3,tzinfo=UTC)
  stored={"KY-SENATE":{"verified":True,"total":39201}}
  issues={"GA-SENATE":"fetch_TimeoutError"}
  per_race=m.status_for_each_race(expected,registry,now,stored,issues)
  self.assertEqual(len(per_race),506)
  self.assertEqual(set(per_race),set(expected))
  self.assertEqual(per_race["WY-SENATE"]["status"],"unmapped")
  self.assertEqual(per_race["VT-01"]["status"],"unmapped")
  self.assertEqual(per_race["KY-SENATE"]["status"],"reporting")
  self.assertEqual(per_race["GA-SENATE"]["status"],"source_error")
  self.assertEqual(per_race["CA-01"]["status"],"awaiting_poll_close")
  self.assertEqual(per_race["IN-03"]["status"],"awaiting_valid_vote_report")
  report=m.coverage_by_office(expected,registry,now,stored,issues)
  self.assertEqual({k:r["targeted"] for k,r in report.items()},{"house":435,"senate":35,"governor":36})
  self.assertEqual(sum(r["targeted"] for r in report.values()),506)
  self.assertEqual(sum(r["registered"] for r in report.values()),504)
  self.assertEqual(report["senate"]["missingRegistryIds"],["WY-SENATE"])
  self.assertEqual(report["house"]["missingRegistryIds"],["VT-01"])
  self.assertEqual(report["senate"]["verifiedReports"],1)
  self.assertEqual(report["senate"]["sourceErrors"],1)
  for office,row in report.items():
   self.assertEqual(row["registered"],row["awaitingPollClose"]+row["eligibleForCollection"])
   self.assertEqual(row["eligibleForCollection"],row["verifiedReports"]+row["eligibleWithoutValidVoteReport"])
   self.assertGreaterEqual(row["validationPending"],0)
 def test_accept_valid(self):
  r=m.normalize("MI-SENATE",self.search,self.detail,self.now,87214)
  self.assertEqual(r["total"],23000)
  self.assertEqual(r["office"],"senate")
  self.assertEqual(r["source"],"civicAPI")
  self.assertEqual(r["timestampBasis"],"provider_last_updated")
 def test_provider_geography_scope(self):
  result=m.normalize("MI-SENATE",self.search,{**self.detail,"election_scope":"Statewide"},self.now,87214)
  self.assertIsNotNone(result)
 def test_reject_test_data(self):
  self.assertIsNone(m.normalize("MI-SENATE",self.search,{**self.detail,"test_data":True},self.now,87214))
 def test_reject_primary_or_wrong_office(self):
  self.assertIsNone(m.normalize("MI-SENATE",self.search,{**self.detail,"election_scope":"Primary"},self.now,87214))
  self.assertIsNone(m.normalize("MI-SENATE",self.search,{**self.detail,"election_type":"State Senate","election_name":"Michigan State Senate"},self.now,87214))
 def test_reject_wrong_election_or_province(self):
  self.assertIsNone(m.normalize("MI-SENATE",self.search,{**self.detail,"election_date":"2024-11-05"},self.now,87214))
  self.assertIsNone(m.normalize("MI-SENATE",self.search,{**self.detail,"province":"TX"},self.now,87214))
 def test_no_before_close(self):
  early=dt.datetime(2026,11,3,23,58,tzinfo=UTC)
  self.assertIsNone(m.normalize("MI-SENATE",self.search,self.detail,early,87214))
 def test_no_zeros(self):
  d={**self.detail,"candidates":[{"name":"D","votes":0},{"name":"R","votes":0}]}
  self.assertIsNone(m.normalize("MI-SENATE",self.search,d,self.now,87214))
 def test_preclose_provider_timestamp_never_relabelled_as_fresh(self):
  stale={**self.detail,"last_updated":"2026-11-03T19:00:00Z"}
  self.assertIsNone(m.normalize("MI-SENATE",self.search,stale,self.now,87214))
 def test_future_provider_timestamp_is_rejected(self):
  future={**self.detail,"last_updated":"2026-11-04T03:10:00Z"}
  self.assertIsNone(m.normalize("MI-SENATE",self.search,future,self.now,87214))
 def test_seen_at_when_last_updated_missing(self):
  row=m.normalize("MI-SENATE",self.search,{**self.detail,"last_updated":None},self.now,87214)
  self.assertEqual(row["timestampBasis"],"collector_observed")
 def test_district_scoping(self):
  house={"id":999,"province":"MI","election_date":"2026-11-03","election_name":"Michigan US House 7","election_type":"House of Representatives","election_scope":"General","district":"MI-07"}
  self.assertTrue(m.type_ok("MI-07",house))
  self.assertFalse(m.type_ok("MI-08",house))
  house["election_name"]="Michigan State House 7";self.assertFalse(m.type_ok("MI-07",house))
 def test_same_party_ballot(self):
  r=m.normalize("MI-SENATE",self.search,{**self.detail,"candidates":[{"name":"Dem A","party":"D","votes":550},{"name":"Dem B","party":"D","votes":450}]},self.now,87214)
  self.assertEqual(r["total"],1000)
 def test_at_large_and_special_election(self):
  ak={"province":"AK","election_name":"Alaska US House At Large","district":"AK-AL","election_date":"2026-11-03","election_type":"General"}
  self.assertTrue(m.type_ok("AK-01",ak))
  ohio={"province":"OH","election_name":"Ohio US Senate Special Election","election_date":"2026-11-03","election_type":"Special"}
  self.assertTrue(m.type_ok("OH-SENATE",ohio))
  ohio["election_name"]="Ohio US Senate Special Primary"
  self.assertFalse(m.type_ok("OH-SENATE",ohio))
 def test_governor_false_positives(self):
  base={"province":"MI","election_date":"2026-11-03","election_type":"General"}
  self.assertTrue(m.type_ok("MI-GOVERNOR",{**base,"election_name":"Michigan Governor"}))
  self.assertFalse(m.type_ok("MI-GOVERNOR",{**base,"election_name":"Michigan Wayne State University Board of Governors"}))
  self.assertFalse(m.type_ok("MA-GOVERNOR",{**base,"province":"MA","election_name":"Massachusetts Governor's Council 5"}))
 def test_invalid_vote_type(self):
  for value in (-1,5.5,None,False,"100"):
   rows=[{"name":"A","votes":value},{"name":"B","votes":200}]
   self.assertIsNone(m.candidates({"candidates":rows}))
if __name__=="__main__":unittest.main()
