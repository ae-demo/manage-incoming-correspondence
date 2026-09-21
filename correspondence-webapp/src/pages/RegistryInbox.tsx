import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Chip, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { correspondenceApi } from "../api";
import { STATUS_LABEL, statusColor, type Correspondence } from "../lib/correspondence";
import { Can } from "../authz/gates";

export function RegistryInboxPage(): ReactElement {
  const navigate = useNavigate();
  const [items, setItems] = useState<Correspondence[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    correspondenceApi
      .GET("/correspondence", { params: { query: { status: "new", limit: 50 } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError || !data) {
          setError("Could not load the inbox.");
          return;
        }
        setItems(data.data);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>New Correspondence</PageTitle.Header>
        <PageTitle.SubHeader>New and unrouted correspondence waiting to be routed</PageTitle.SubHeader>
        <Can op="POST /correspondence">
          <PageTitle.Actions>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate("/log")}>
              Log Physical Item
            </Button>
          </PageTitle.Actions>
        </Can>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Sender</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Received</ListingTable.Cell>
              <ListingTable.Cell>Source</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(items ?? []).map((item) => (
              <ListingTable.Row
                key={item.id}
                clickable
                onClick={() => navigate(`/correspondence/${item.id}`)}
              >
                <ListingTable.Cell>{item.senderName ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{item.category ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{item.receivedDate}</ListingTable.Cell>
                <ListingTable.Cell>{item.source === "physical" ? "Physical" : "Email"}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={STATUS_LABEL[item.status]} color={statusColor(item.status)} size="small" />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {items !== null && items.length === 0 && (
          <ListingTable.EmptyState
            title="Nothing waiting"
            description={error ?? "No new correspondence to route right now."}
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
