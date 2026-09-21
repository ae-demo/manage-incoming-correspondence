import { correspondenceApi } from "../api";

/**
 * Uploads go through correspondence-api's presigned-URL endpoint, never
 * through this app's own server: get the presigned URL, then PUT the file
 * straight to it. The PUT itself is a plain `fetch`, not `correspondenceApi` —
 * it targets S3 (or the mock's stand-in), not the gateway, and carries no
 * bearer.
 */
export async function uploadFile(file: File): Promise<string> {
  const { data, error } = await correspondenceApi.POST("/correspondence/attachment-upload-url", {
    body: { fileName: file.name },
  });
  if (error || !data) throw new Error("Could not get an upload URL for this file.");
  const res = await fetch(data.uploadUrl, { method: "PUT", body: file });
  if (!res.ok) throw new Error("The file upload failed.");
  return data.fileUrl;
}
