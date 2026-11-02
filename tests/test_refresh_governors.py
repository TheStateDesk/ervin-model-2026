import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from refresh_governors import verified_page
ROW={"code":"MI","state":"Michigan","dem":"Jocelyn Benson","rep":"John James"}
class GovernorAverageTest(unittest.TestCase):
 def test_verifiable_average(self):
  html="<h1>Michigan governor average</h1><p>Benson vs. James. Benson leads by 9.6 points in the On Point average of 43 public polls. 43 polls Updated Nov 1, 2026</p>"
  self.assertEqual(verified_page(html,ROW),{"margin":9.6,"asOf":"2026-11-01","count":43})
 def test_wrong_race_rejected(self):
  html="<h1>Michigan governor average</h1><p>Hobbs vs. Biggs. Hobbs leads by 9.6 points, 43 polls Updated Nov 1, 2026</p>"
  self.assertIsNone(verified_page(html,ROW))
if __name__=="__main__":unittest.main()
