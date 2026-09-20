screen SlaPerformance "Public view of each department's SLA/turnaround performance over the trailing 3 months"
  navbar "Correspondence SLA Performance"
  heading "Department SLA Performance"
  text "Average, best, and worst response time per department over the last 3 months. Items still open past 3 months show as 3+ months."
  table "Department | Average | Best | Worst"
    row "Permits | 6 days | 2 days | 9 days"
    row "Licensing | 5 days | 1 day | 3+ months"
    row "Public Works | 8 days | 3 days | 14 days"

flow "View public SLA performance"
  description "Any visitor views the aggregate SLA performance dashboard"
  SlaPerformance
