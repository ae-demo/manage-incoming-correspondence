import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Chip, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import { STATUS_LABEL, statusColor, type Correspondence } from "../lib/correspondence";

export function MyDepartmentQueuePage(): ReactElement {
  const navigate = useNavigate();
  const [items, setItems] = useState<Correspondence[] | null>(null);

  useEffect(() => {
    let live = true;
    correspondenceApi
      .GET("/me/department/correspondence", { params: { query: { limit: 50 } } })
      .then(({ data }) => {
        if (live) setItems(data?.data ?? []);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My Department's Correspondence</PageTitle.Header>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Sender</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Received</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
              <ListingTable.Cell>Due</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(items ?? []).map((item) => (
              <ListingTable.Row
                key={item.id}
                clickable
                onClick={() => navigate(`/me/department/correspondence/${item.id}`)}
              >
                <ListingTable.Cell>{item.senderName ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{item.category ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{item.receivedDate}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={STATUS_LABEL[item.status]} color={statusColor(item.status)} size="small" />
                </ListingTable.Cell>
                <ListingTable.Cell>{item.dueDate ?? "—"}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {items !== null && items.length === 0 && (
          <ListingTable.EmptyState title="Nothing assigned" description="Your department has no open correspondence." />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
