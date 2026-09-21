import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import { STATUS_LABEL, statusColor, type Correspondence } from "../lib/correspondence";
import { useDepartments } from "../lib/departments";

export function SupervisorDashboardPage(): ReactElement {
  const navigate = useNavigate();
  const { byId } = useDepartments();
  const [items, setItems] = useState<Correspondence[] | null>(null);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [overdueCount, setOverdueCount] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    correspondenceApi.GET("/correspondence", { params: { query: { limit: 50 } } }).then(({ data }) => {
      if (live) setItems(data?.data ?? []);
    });
    correspondenceApi.GET("/correspondence", { params: { query: { limit: 1 } } }).then(({ data }) => {
      if (live) setOpenCount(data?.count ?? null);
    });
    correspondenceApi
      .GET("/correspondence", { params: { query: { limit: 1, overdue: true } } })
      .then(({ data }) => {
        if (live) setOverdueCount(data?.count ?? null);
      });
    return () => {
      live = false;
    };
  }, []);

  const departmentCount = new Set((items ?? []).map((i) => i.departmentId).filter(Boolean)).size;

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Correspondence Dashboard</PageTitle.Header>
      </PageTitle>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Open Items
              </Typography>
              <Typography variant="h4">{openCount ?? "—"}</Typography>
              <Typography variant="caption" color="text.secondary">
                across {departmentCount || "—"} departments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Overdue
              </Typography>
              <Typography variant="h4" color="error">
                {overdueCount ?? "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                past due date
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Select</ListingTable.Cell>
              <ListingTable.Cell>Sender</ListingTable.Cell>
              <ListingTable.Cell>Department</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
              <ListingTable.Cell>Due</ListingTable.Cell>
              <ListingTable.Cell>Overdue</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(items ?? []).map((item) => (
              <ListingTable.Row key={item.id} clickable onClick={() => navigate(`/correspondence/${item.id}`)}>
                <ListingTable.Cell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedId === item.id}
                    onChange={() => setSelectedId(selectedId === item.id ? null : item.id)}
                  />
                </ListingTable.Cell>
                <ListingTable.Cell>{item.senderName ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>
                  {item.departmentId ? byId.get(item.departmentId)?.name ?? item.departmentId : "—"}
                </ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={STATUS_LABEL[item.status]} color={statusColor(item.status)} size="small" />
                </ListingTable.Cell>
                <ListingTable.Cell>{item.dueDate ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{item.overdue ? "Yes" : "No"}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {items !== null && items.length === 0 && <ListingTable.EmptyState title="No correspondence yet" />}
      </ListingTable.Container>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="outlined"
          disabled={!selectedId}
          onClick={() => selectedId && navigate(`/correspondence/${selectedId}`)}
        >
          Reassign Selected
        </Button>
      </Box>
    </PageContent>
  );
}
