import datetime as dt
import importlib.util, pathlib, unittest
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("probe",root/"scripts/civicapi_probe.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class TestCivic(unittest.TestCase):
 def setUp(self):
  self.search={"id":42,"name":"Alabama US House 7","date":"2026-11-03","type":"General","state":"Alabama"}
  self.detail={"name":"Alabama US House 7","type":"General","date":"2026-11-03","updated_at":"2026-11-04T01:20:00Z",
    "total_votes":200,"candidates":[{"name":"A","votes":110,"party":"D"},{"name":"B","votes":90,"party":"R"}]}
  self.current=dt.datetime(2026,11,4,2,tzinfo=dt.timezone.utc)
 def test_verified(self): self.assertIsNotNone(m.normalize("AL-07",self.search,self.detail,self.current))
 def test_wrong_district(self): self.assertFalse(m.match("AL-07",{**self.search,"name":"Alabama US House 6"}))
 def test_wrong_date(self): self.assertIsNone(m.normalize("AL-07",self.search,{**self.detail,"date":"2024-11-05"},self.current))
 def test_primary(self): self.assertIsNone(m.normalize("AL-07",self.search,{**self.detail,"type":"Primary"},self.current))
 def test_missing_timestamp(self): self.assertIsNone(m.normalize("AL-07",self.search,{**self.detail,"updated_at":None},self.current))
 def test_unsupported_total(self): self.assertIsNone(m.normalize("AL-07",self.search,{**self.detail,"total_votes":500},self.current))
 def test_before_poll_close(self): self.assertIsNone(m.normalize("AL-07",self.search,self.detail,dt.datetime(2026,11,3,23,tzinfo=dt.timezone.utc)))
if __name__=="__main__": unittest.main()
