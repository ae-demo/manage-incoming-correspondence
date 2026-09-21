import type { APIRequestContext } from "@playwright/test";
import { target } from "./targets";

// Setup-only helpers: seed data directly against the deployed correspondence-api
// so criteria that assume "a correspondence item already exists" can be verified
// independently of AC-001-a (logging a physical item through the UI), which is
// reported separately as broken. Using an arbitrary scannedDocumentUrl string is
// legitimate here — the API's own schema accepts any string; it never validates
// that the URL points at a real uploaded file.
const API = target("correspondence-api");

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export interface Department {
  id: string;
  name: string;
  status: string;
  defaultTurnaroundDays: number;
}

export interface Correspondence {
  id: string;
  senderName: string;
  category: string;
  status: string;
  departmentId: string | null;
  dueDate: string | null;
  overdue: boolean;
}

export async function createDepartment(
  request: APIRequestContext,
  adminToken: string,
  name: string,
  defaultTurnaroundDays = 10,
): Promise<Department> {
  const res = await request.post(`${API}/departments`, {
    headers: headers(adminToken),
    data: { name, defaultTurnaroundDays },
  });
  if (!res.ok()) throw new Error(`createDepartment failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function deactivateDepartment(
  request: APIRequestContext,
  adminToken: string,
  departmentId: string,
): Promise<Department> {
  const res = await request.post(`${API}/departments/${departmentId}/deactivate`, {
    headers: headers(adminToken),
  });
  if (!res.ok()) throw new Error(`deactivateDepartment failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function logCorrespondence(
  request: APIRequestContext,
  registryToken: string,
  senderName: string,
  category = "Complaint",
): Promise<Correspondence> {
  const res = await request.post(`${API}/correspondence`, {
    headers: headers(registryToken),
    data: { senderName, category, scannedDocumentUrl: `https://example.com/seed-${Date.now()}.pdf` },
  });
  if (!res.ok()) throw new Error(`logCorrespondence failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function routeCorrespondence(
  request: APIRequestContext,
  registryToken: string,
  id: string,
  departmentId: string,
): Promise<Correspondence> {
  const res = await request.post(`${API}/correspondence/${id}/route`, {
    headers: headers(registryToken),
    data: { departmentId },
  });
  if (!res.ok()) throw new Error(`routeCorrespondence failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function onboardUser(
  request: APIRequestContext,
  adminToken: string,
  userId: string,
  departmentId: string,
  role: "RegistryOfficer" | "DepartmentOfficer" | "Supervisor",
): Promise<void> {
  const res = await request.post(`${API}/users/onboard`, {
    headers: headers(adminToken),
    data: { userId, departmentId, role },
  });
  if (!res.ok()) throw new Error(`onboardUser failed: ${res.status()} ${await res.text()}`);
}
