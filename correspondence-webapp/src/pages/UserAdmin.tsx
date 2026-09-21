import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { correspondenceApi } from "../api";
import { useDepartments } from "../lib/departments";
import { Can } from "../authz/gates";
import type { components } from "../generated/correspondence-api";

type UserOnboarding = components["schemas"]["UserOnboarding"];

export function UserAdminPage(): ReactElement {
  const navigate = useNavigate();
  const { byId } = useDepartments();
  const [users, setUsers] = useState<UserOnboarding[] | null>(null);

  useEffect(() => {
    let live = true;
    correspondenceApi.GET("/users", { params: { query: { limit: 100 } } }).then(({ data }) => {
      if (live) setUsers(data?.data ?? []);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Onboarded Users</PageTitle.Header>
        <Can op="POST /users/onboard">
          <PageTitle.Actions>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate("/users/onboard")}>
              Onboard User
            </Button>
          </PageTitle.Actions>
        </Can>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>User</ListingTable.Cell>
              <ListingTable.Cell>Department</ListingTable.Cell>
              <ListingTable.Cell>Role</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(users ?? []).map((u) => (
              <ListingTable.Row key={u.id}>
                <ListingTable.Cell>{u.userId}</ListingTable.Cell>
                <ListingTable.Cell>{byId.get(u.departmentId)?.name ?? u.departmentId}</ListingTable.Cell>
                <ListingTable.Cell>{u.role}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {users !== null && users.length === 0 && <ListingTable.EmptyState title="No users onboarded yet" />}
      </ListingTable.Container>
    </PageContent>
  );
}
