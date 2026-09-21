import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chip,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  SearchBar,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import { STATUS_LABEL, statusColor, type Correspondence } from "../lib/correspondence";
import { useDepartments } from "../lib/departments";

const STATUS_OPTIONS: Array<Correspondence["status"]> = [
  "new",
  "routed",
  "in-progress",
  "responded",
  "closed",
];

export function SearchPage(): ReactElement {
  const navigate = useNavigate();
  const { departments, byId } = useDepartments();
  const [sender, setSender] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<Correspondence[] | null>(null);

  useEffect(() => {
    let live = true;
    correspondenceApi
      .GET("/correspondence", {
        params: {
          query: {
            limit: 50,
            sender: sender || undefined,
            departmentId: departmentId || undefined,
            status: status || undefined,
          },
        },
      })
      .then(({ data }) => {
        if (!live) return;
        // The contract has no server-side date filter, so a chosen date is
        // applied client-side over the returned page.
        const rows = data?.data ?? [];
        setItems(date ? rows.filter((r) => r.receivedDate === date) : rows);
      });
    return () => {
      live = false;
    };
  }, [sender, departmentId, status, date]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Search Correspondence</PageTitle.Header>
      </PageTitle>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <SearchBar
          placeholder="Sender"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          select
          label="Department"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All departments</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Sender</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Department</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
              <ListingTable.Cell>Received</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(items ?? []).map((item) => (
              <ListingTable.Row key={item.id} clickable onClick={() => navigate(`/correspondence/${item.id}`)}>
                <ListingTable.Cell>{item.senderName ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{item.category ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>
                  {item.departmentId ? byId.get(item.departmentId)?.name ?? item.departmentId : "—"}
                </ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={STATUS_LABEL[item.status]} color={statusColor(item.status)} size="small" />
                </ListingTable.Cell>
                <ListingTable.Cell>{item.receivedDate}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {items !== null && items.length === 0 && (
          <ListingTable.EmptyState title="No matches" description="Try a different filter." />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
