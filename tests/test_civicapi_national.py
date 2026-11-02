import datetime as dt
import importlib.util
import json
from pathlib import Path
import unittest
P=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("civic_national",P/"scripts/civicapi_national.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
UTC=dt.timezone.utc
class ElectionReporting(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,4,3,tzinfo=UTC)
  self.search={"id":87214,"province":"MI","country":"US","election_name":"Michigan US Senate","election_type":"US Senate","election_scope":"General","election_date":"2026-11-03"}
  self.detail={"election_name":"Michigan US Senate","election_type":"US Senate","election_scope":"General","election_date":"2026-11-03","province":"MI","country":"US","last_updated":"2026-11-04T02:30:00Z","test_data":False,"candidates":[{"name":"Candidate D","party":"Democratic","votes":12000},{"name":"Candidate R","party":"Republican","votes":11000}],"percent_reporting":25.0}
 def test_registry_488(self):
  x=m.targets();self.assertEqual(len(x),488)
  self.assertEqual(sum(v["office"]=="house" for v in x.values()),435)
  self.assertEqual(sum(v["office"]=="senate" for v in x.values()),17)
  self.assertEqual(sum(v["office"]=="governor" for v in x.values()),36)
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
  early=dt.datetime(2026,11,4,1,58,tzinfo=UTC)
  self.assertIsNone(m.normalize("MI-SENATE",self.search,self.detail,early,87214))
 def test_no_zeros(self):
  d={**self.detail,"candidates":[{"name":"D","votes":0},{"name":"R","votes":0}]}
  self.assertIsNone(m.normalize("MI-SENATE",self.search,d,self.now,87214))
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
