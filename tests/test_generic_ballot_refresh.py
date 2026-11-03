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
class AdditionalDirectPublisherTests(unittest.TestCase):
 def test_ddhq_direct_aggregate(self):
  h="<html><h1>Generic Congressional Ballot</h1><p>Candidate Democrat</p><p>51.50%</p><p>Candidate Republican</p><p>42.70%</p></html>"
  self.assertEqual(m.parse_ddhq(h)["marginD"],8.8)
 def test_ddhq_rejects_impossible_shares(self):
  self.assertIsNone(m.parse_ddhq("Candidate Democrat 65.00% Candidate Republican 49.50%"))
 def test_silver_uses_unadjusted_average_not_likely_voter_adjustment(self):
  h="<h1>Updated November 2, 2026</h1><p>After hitting a new high of D +9.2, the lead dropped slightly to D +8.9.</p><p>Likely voter adjustment benefits Democrats to D +9.2</p>"
  self.assertEqual(m.parse_silver(h),{"marginD":8.9,"published":"2026-11-02"})
 def test_silver_undated_chart_is_not_a_verifiable_average(self):
  self.assertIsNone(m.parse_silver("<p>D +8.9, D +9.2</p>"))
if __name__=="__main__":unittest.main()
