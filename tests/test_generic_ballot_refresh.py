import importlib.util, pathlib, unittest
p=pathlib.Path(__file__).resolve().parents[1]/"scripts/refresh_generic_ballot.py"
spec=importlib.util.spec_from_file_location("generic",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class GenericBallotTest(unittest.TestCase):
 def test_table_row(self):
  h="<html><table><tr><td>RCP Average</td><td>10/9 - 11/1</td><td>52.0</td><td>43.1</td><td>Democrats+8.9</td></tr></table></html>"
  d=m.parse_rcp(h)
  self.assertEqual(d["marginD"],8.9)
  self.assertEqual(d["fieldEnd"],"2026-11-01")
 def test_wrong_vote_arithmetic_rejected(self):
  self.assertIsNone(m.parse_rcp("RCP Average 10/9 - 11/1 52.0 43.1 Democrats+15.0"))
 def test_no_single_poll_or_unlabeled_summary(self):
  self.assertIsNone(m.parse_rcp("Atlas Intel 10/28 - 11/1 56 41 Democrats+15 RCP Average is popular"))
 def test_future_field_date_rejected(self):
  self.assertIsNone(m.parse_rcp("RCP Average 10/9 - 12/1 52.0 43.1 Democrats+8.9"))
if __name__=="__main__":unittest.main()
