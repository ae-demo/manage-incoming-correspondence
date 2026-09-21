import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Form,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { correspondenceApi } from "../api";
import { CATEGORIES } from "../lib/correspondence";
import { uploadFile } from "../lib/upload";

export function LogCorrespondencePage(): ReactElement {
  const navigate = useNavigate();
  const [senderName, setSenderName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = senderName.trim().length > 0 && category.length > 0 && file !== null;

  async function handleSave(): Promise<void> {
    if (!canSave || !file) return;
    setSaving(true);
    setError(null);
    try {
      const scannedDocumentUrl = await uploadFile(file);
      const { error: apiError } = await correspondenceApi.POST("/correspondence", {
        body: { senderName, category, scannedDocumentUrl },
      });
      if (apiError) throw new Error("The item could not be logged.");
      navigate("/inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The item could not be logged.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContent maxWidth={720}>
      <PageTitle>
        <PageTitle.Header>Log Physical Correspondence</PageTitle.Header>
      </PageTitle>

      <Form.Section>
        <Form.Stack>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Sender name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Scanned copy (upload)
            </Typography>
            <Button variant="outlined" component="label">
              {file ? file.name : "Choose file"}
              <input
                type="file"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Button>
          </Box>
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/inbox")}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canSave || saving} onClick={() => void handleSave()}>
          Save
        </Button>
      </Stack>
    </PageContent>
  );
}
