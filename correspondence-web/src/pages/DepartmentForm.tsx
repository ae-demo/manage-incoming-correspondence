import { useState, type ReactElement } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Form, PageContent, PageTitle, Stack, TextField } from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import { useDepartments, type Department } from "../lib/departments";

export function DepartmentFormPage({ mode }: { mode: "create" | "edit" }): ReactElement {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { byId } = useDepartments();

  const existing: Department | undefined =
    (location.state as { department?: Department } | null)?.department ??
    (id ? byId.get(id) : undefined);

  const [name, setName] = useState(existing?.name ?? "");
  const [turnaround, setTurnaround] = useState(existing ? String(existing.defaultTurnaroundDays) : "");
  const [mailbox, setMailbox] = useState(existing?.mailboxConfig ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSave = name.trim().length > 0;

  async function handleSave(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const defaultTurnaroundDays = turnaround ? Number(turnaround) : undefined;
      if (mode === "create") {
        const { error: apiError } = await correspondenceApi.POST("/departments", {
          body: { name, defaultTurnaroundDays },
        });
        if (apiError) throw new Error("Could not create the department.");
      } else if (id) {
        const { error: apiError } = await correspondenceApi.PATCH("/departments/{departmentId}", {
          params: { path: { departmentId: id } },
          body: { name, defaultTurnaroundDays, mailboxConfig: mailbox || undefined },
        });
        if (apiError) throw new Error("Could not save the department.");
      }
      navigate("/departments");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(): Promise<void> {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const { error: apiError } = await correspondenceApi.POST("/departments/{departmentId}/deactivate", {
        params: { path: { departmentId: id } },
      });
      if (apiError) throw new Error("Could not deactivate the department.");
      navigate("/departments");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContent maxWidth={640}>
      <PageTitle>
        <PageTitle.Header>Department</PageTitle.Header>
      </PageTitle>

      <Form.Section>
        <Form.Stack>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            label="Default turnaround (days)"
            type="number"
            value={turnaround}
            onChange={(e) => setTurnaround(e.target.value)}
            fullWidth
          />
          <TextField
            label="Intake mailbox (optional — leave blank to use the organization default)"
            value={mailbox}
            onChange={(e) => setMailbox(e.target.value)}
            fullWidth
          />
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        {mode === "edit" && (
          <Button variant="outlined" color="error" disabled={busy} onClick={() => void handleDeactivate()}>
            Deactivate
          </Button>
        )}
        <Button variant="contained" disabled={!canSave || busy} onClick={() => void handleSave()}>
          Save
        </Button>
      </Stack>
    </PageContent>
  );
}
