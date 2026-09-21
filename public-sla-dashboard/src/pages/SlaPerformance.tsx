import { useEffect, useState, type JSX } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  ListingTable,
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import type { components } from "../generated/correspondence-api";

type DepartmentSlaPerformance = components["schemas"]["DepartmentSlaPerformance"];

// Formats an aggregate day count exactly as the wireframe's demo rows do
// ("6 days", "1 day") — never per-item detail, only the aggregate the public
// endpoint returns.
function formatDays(value: number): string {
  return `${value} ${value === 1 ? "day" : "days"}`;
}

export default function SlaPerformance(): JSX.Element {
  const [rows, setRows] = useState<DepartmentSlaPerformance[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await correspondenceApi.GET("/public/departments/sla-performance");
      if (cancelled) return;
      if (error) {
        setErrorMessage("Could not load SLA performance data. Please try again later.");
        return;
      }
      setRows(data.data);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Department SLA Performance</PageTitle.Header>
      </PageTitle>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Average, best, and worst response time per department over the last 3 months. Items
        still open past 3 months show as 3+ months.
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {!errorMessage && rows === null && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!errorMessage && rows !== null && (
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Department</ListingTable.Cell>
                <ListingTable.Cell>Average</ListingTable.Cell>
                <ListingTable.Cell>Best</ListingTable.Cell>
                <ListingTable.Cell>Worst</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {rows.length === 0 ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={4}>
                    <ListingTable.EmptyState
                      title="No SLA data yet"
                      description="Department SLA performance will appear here once correspondence has been processed."
                    />
                  </ListingTable.Cell>
                </ListingTable.Row>
              ) : (
                rows.map((row) => (
                  <ListingTable.Row key={row.departmentId}>
                    <ListingTable.Cell>{row.departmentName}</ListingTable.Cell>
                    <ListingTable.Cell>{formatDays(row.averageDays)}</ListingTable.Cell>
                    <ListingTable.Cell>{formatDays(row.bestDays)}</ListingTable.Cell>
                    <ListingTable.Cell>{row.worstLabel}</ListingTable.Cell>
                  </ListingTable.Row>
                ))
              )}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      )}
    </PageContent>
  );
}
