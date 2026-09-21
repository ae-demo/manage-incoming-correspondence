import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import {
  STATUS_LABEL,
  statusColor,
  UPDATABLE_STATUSES,
  type Correspondence,
  type Movement,
} from "../lib/correspondence";
import { useDepartments } from "../lib/departments";
import { uploadFile } from "../lib/upload";
import { Can } from "../authz/gates";

/**
 * One wireframe screen (CorrespondenceDetail), two reaches: an every-row
 * caller (Registry Officer, Supervisor) opens it from `/correspondence/:id`
 * against `GET /correspondence/{id}`; a Department Officer opens it from their
 * own department's queue at `/me/department/correspondence/:id` against
 * `GET /me/department/correspondence/{id}`. Every action card is additionally
 * gated on the operation it performs, so the page never shows a control the
 * caller's scopes could not back.
 */
export function CorrespondenceDetailPage({ reach }: { reach: "all" | "mine" }): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { active: activeDepartments, byId: departmentsById } = useDepartments();

  const [item, setItem] = useState<Correspondence | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const reload = useCallback(() => setGeneration((g) => g + 1), []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setLoadError(null);
    const detailCall =
      reach === "all"
        ? correspondenceApi.GET("/correspondence/{correspondenceId}", {
            params: { path: { correspondenceId: id } },
          })
        : correspondenceApi.GET("/me/department/correspondence/{correspondenceId}", {
            params: { path: { correspondenceId: id } },
          });
    const movementsCall =
      reach === "all"
        ? correspondenceApi.GET("/correspondence/{correspondenceId}/movements", {
            params: { path: { correspondenceId: id } },
          })
        : correspondenceApi.GET("/me/department/correspondence/{correspondenceId}/movements", {
            params: { path: { correspondenceId: id } },
          });

    void detailCall.then(({ data, error }) => {
      if (!live) return;
      if (error || !data) {
        setLoadError("This correspondence item could not be found.");
        return;
      }
      setItem(data);
    });
    void movementsCall.then(({ data }) => {
      if (live && data) setMovements(data.data);
    });
    return () => {
      live = false;
    };
  }, [id, reach, generation]);

  if (loadError) {
    return (
      <PageContent>
        <Alert severity="error">{loadError}</Alert>
      </PageContent>
    );
  }
  if (!item || !id) {
    return (
      <PageContent>
        <Typography color="text.secondary">Loading…</Typography>
      </PageContent>
    );
  }

  const departmentName = item.departmentId ? departmentsById.get(item.departmentId)?.name ?? item.departmentId : null;

  return (
    <PageContent maxWidth={900}>
      <PageTitle>
        <PageTitle.Header>
          {item.category ?? "Correspondence"}
          {item.senderName ? ` from ${item.senderName}` : ""}
        </PageTitle.Header>
        <PageTitle.Actions>
          <Chip label={STATUS_LABEL[item.status]} color={statusColor(item.status)} />
        </PageTitle.Actions>
      </PageTitle>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Received {item.receivedDate} · {item.source === "physical" ? "Physical" : "Email"}
        {item.dueDate ? ` · Due ${item.dueDate}` : ""}
        {departmentName ? ` · ${departmentName}` : ""}
        {item.overdue ? " · Overdue" : ""}
      </Typography>

      <Stack spacing={3}>
        {!item.departmentId && (
          <Can op="POST /correspondence/{correspondenceId}/route">
            <RouteOrReassignCard
              title="Route"
              actionLabel="Route"
              departments={activeDepartments}
              onSubmit={async (departmentId) => {
                const { error } = await correspondenceApi.POST("/correspondence/{correspondenceId}/route", {
                  params: { path: { correspondenceId: id } },
                  body: { departmentId },
                });
                if (error) throw new Error("Could not route this item.");
                navigate("/inbox");
              }}
            />
          </Can>
        )}
        {item.departmentId && (
          <Can op="POST /correspondence/{correspondenceId}/reassign">
            <RouteOrReassignCard
              title="Reassign"
              actionLabel="Reassign"
              departments={activeDepartments}
              onSubmit={async (departmentId) => {
                const { error } = await correspondenceApi.POST("/correspondence/{correspondenceId}/reassign", {
                  params: { path: { correspondenceId: id } },
                  body: { departmentId },
                });
                if (error) throw new Error("Could not reassign this item.");
                reload();
              }}
            />
          </Can>
        )}

        <Can op="PATCH /me/department/correspondence/{correspondenceId}/status">
          <UpdateStatusCard
            current={item.status}
            onSubmit={async (status) => {
              const { error } = await correspondenceApi.PATCH(
                "/me/department/correspondence/{correspondenceId}/status",
                { params: { path: { correspondenceId: id } }, body: { status } },
              );
              if (error) throw new Error("Could not update the status.");
              reload();
            }}
          />
        </Can>

        <Can op="POST /me/department/correspondence/{correspondenceId}/response">
          <ResponseCard
            hasResponse={item.status === "responded" || item.status === "closed"}
            onSaveResponse={async (note, attachmentUrl) => {
              const { error } = await correspondenceApi.POST(
                "/me/department/correspondence/{correspondenceId}/response",
                { params: { path: { correspondenceId: id } }, body: { note, attachmentUrl } },
              );
              if (error) throw new Error("Could not save the response.");
              reload();
            }}
            onClose={async () => {
              const { error } = await correspondenceApi.POST(
                "/me/department/correspondence/{correspondenceId}/close",
                { params: { path: { correspondenceId: id } } },
              );
              if (error) throw new Error("Could not close this item.");
              reload();
            }}
          />
        </Can>

        <Card>
          <CardHeader title="History" />
          <CardContent>
            <ListingTable.Container disablePaper>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>When</ListingTable.Cell>
                    <ListingTable.Cell>Action</ListingTable.Cell>
                    <ListingTable.Cell>From</ListingTable.Cell>
                    <ListingTable.Cell>To</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {movements.map((m) => (
                    <ListingTable.Row key={m.id}>
                      <ListingTable.Cell>{new Date(m.occurredAt).toLocaleString()}</ListingTable.Cell>
                      <ListingTable.Cell>{m.action}</ListingTable.Cell>
                      <ListingTable.Cell>
                        {m.fromDepartmentId ? departmentsById.get(m.fromDepartmentId)?.name ?? m.fromDepartmentId : "-"}
                      </ListingTable.Cell>
                      <ListingTable.Cell>
                        {m.toDepartmentId ? departmentsById.get(m.toDepartmentId)?.name ?? m.toDepartmentId : "-"}
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ))}
                </ListingTable.Body>
              </ListingTable>
              {movements.length === 0 && <ListingTable.EmptyState title="No history yet" />}
            </ListingTable.Container>
          </CardContent>
        </Card>
      </Stack>
    </PageContent>
  );
}

function RouteOrReassignCard({
  title,
  actionLabel,
  departments,
  onSubmit,
}: {
  title: string;
  actionLabel: string;
  departments: readonly { id: string; name: string }[];
  onSubmit: (departmentId: string) => Promise<void>;
}): ReactElement {
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            sx={{ maxWidth: 360 }}
          >
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>
          <Box>
            <Button
              variant="contained"
              disabled={!departmentId || busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onSubmit(departmentId);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Something went wrong.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {actionLabel}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function UpdateStatusCard({
  current,
  onSubmit,
}: {
  current: Correspondence["status"];
  onSubmit: (status: string) => Promise<void>;
}): ReactElement {
  const [status, setStatus] = useState<string>(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader title="Update Status" />
      <CardContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ maxWidth: 360 }}
          >
            {UPDATABLE_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </MenuItem>
            ))}
          </TextField>
          <Box>
            <Button
              variant="outlined"
              disabled={busy || status === current}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onSubmit(status);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Something went wrong.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Update Status
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ResponseCard({
  hasResponse,
  onSaveResponse,
  onClose,
}: {
  hasResponse: boolean;
  onSaveResponse: (note: string | undefined, attachmentUrl: string | undefined) => Promise<void>;
  onClose: () => Promise<void>;
}): ReactElement {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSaveResponse(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const attachmentUrl = file ? await uploadFile(file) : undefined;
      await onSaveResponse(note || undefined, attachmentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const closeDisabled = busy || !hasResponse;

  return (
    <Card>
      <CardHeader title="Response" />
      <CardContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Response note"
            multiline
            minRows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
          />
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Attachment (upload)
            </Typography>
            <Button variant="outlined" component="label">
              {file ? file.name : "Choose file"}
              <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" disabled={busy || (!note && !file)} onClick={() => void handleSaveResponse()}>
              Save Response
            </Button>
            <Tooltip title={hasResponse ? "" : "Record a response before closing this item."}>
              <span>
                <Button variant="outlined" disabled={closeDisabled} onClick={() => void handleClose()}>
                  Close Item
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
