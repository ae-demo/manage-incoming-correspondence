import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Chip, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { useDepartments } from "../lib/departments";
import { Can, useAuthz } from "../authz/gates";
import { canCall } from "../authz/core";
import { OPERATIONS } from "../authz/operations.gen";

export function DepartmentAdminPage(): ReactElement {
  const navigate = useNavigate();
  const { departments, loading } = useDepartments();
  const { scopes, signedIn } = useAuthz();
  const canManage = canCall(OPERATIONS["POST /departments"], scopes, signedIn);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Departments</PageTitle.Header>
        <Can op="POST /departments">
          <PageTitle.Actions>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate("/departments/new")}>
              New Department
            </Button>
          </PageTitle.Actions>
        </Can>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Name</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
              <ListingTable.Cell>Default Turnaround</ListingTable.Cell>
              <ListingTable.Cell>Mailbox</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {departments.map((d) => (
              <ListingTable.Row
                key={d.id}
                clickable={canManage}
                onClick={canManage ? () => navigate(`/departments/${d.id}/edit`, { state: { department: d } }) : undefined}
              >
                <ListingTable.Cell>{d.name}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip
                    label={d.status === "active" ? "Active" : "Deactivated"}
                    color={d.status === "active" ? "success" : "default"}
                    size="small"
                  />
                </ListingTable.Cell>
                <ListingTable.Cell>{d.defaultTurnaroundDays} days</ListingTable.Cell>
                <ListingTable.Cell>{d.mailboxConfig ?? "Organization default"}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {!loading && departments.length === 0 && <ListingTable.EmptyState title="No departments yet" />}
      </ListingTable.Container>
    </PageContent>
  );
}
