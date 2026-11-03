import json
import unittest
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import audit_national_county_sources as src
class SourceAuditTest(unittest.TestCase):
 def test_all_counties_audited_and_unlinked_kept_explicit(self):
  geo=src.all_geography()
  reg=json.loads((ROOT/'election-night/county-sources.json').read_text())
  result=src.audit(geo,reg,probe_urls=False)
  self.assertEqual(result['summary']['states'],50)
  self.assertEqual(result['summary']['countyEquivalents'],3143)
  self.assertEqual(result['summary']['countySourcesIndependentlyLinked'],104)
  self.assertEqual(result['summary']['countiesWithoutDirectVerifiedSource'],3039)
  self.assertEqual(result['summary']['machineReadableCountyFeedsConfirmed'],0)
  self.assertEqual(result['states']['MI']['boundaryCount'],83)
  self.assertEqual(result['states']['MI']['linkedCountySources'],83)
  self.assertEqual(result['states']['NJ']['linkedCountySources'],21)
  self.assertEqual(result['states']['NC']['countySources'],{})
  self.assertEqual(result['states']['NC']['authorityRole'],'county-dashboard')
 def test_all_counties_match_geometry_fips(self):
  geo=src.all_geography()
  reg=json.loads((ROOT/'election-night/county-sources.json').read_text())
  for code,state in reg['states'].items():
   names={src.normalized(name) for name in geo[code].values()}
   for name,uri in state['countyLinks'].items():
    self.assertIn(src.normalized(name),names,(code,name))
    self.assertTrue(uri.startswith('https://'),(code,name,uri))
if __name__=='__main__':unittest.main()
