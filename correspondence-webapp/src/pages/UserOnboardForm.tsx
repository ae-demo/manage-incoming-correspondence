import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Form, MenuItem, PageContent, PageTitle, Stack, TextField } from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import { useDepartments } from "../lib/departments";

const ROLES = ["RegistryOfficer", "DepartmentOfficer", "Supervisor"] as const;

export function UserOnboardFormPage(): ReactElement {
  const navigate = useNavigate();
  const { active: activeDepartments } = useDepartments();
  const [userId, setUserId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number] | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSave = userId.trim().length > 0 && departmentId.length > 0 && role.length > 0;

  async function handleSave(): Promise<void> {
    if (!canSave || !role) return;
    setBusy(true);
    setError(null);
    try {
      const { error: apiError } = await correspondenceApi.POST("/users/onboard", {
        body: { userId, departmentId, role },
      });
      if (apiError) throw new Error("Could not onboard this user.");
      navigate("/users");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContent maxWidth={640}>
      <PageTitle>
        <PageTitle.Header>Onboard User</PageTitle.Header>
      </PageTitle>

      <Form.Section>
        <Form.Stack>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="User (Thunder identity)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            fullWidth
          >
            {activeDepartments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
            fullWidth
          >
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/users")}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canSave || busy} onClick={() => void handleSave()}>
          Onboard
        </Button>
      </Stack>
    </PageContent>
  );
}
