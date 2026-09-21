import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/correspondence-api";

type DepartmentSlaPerformance = components["schemas"]["DepartmentSlaPerformance"];

// Seed rows mirror wireframes.dsl's SlaPerformance table verbatim, so the mock
// screen matches the wireframe a reviewer compares it against.
const slaPerformance: DepartmentSlaPerformance[] = [
  { departmentId: "1", departmentName: "Permits", averageDays: 6, bestDays: 2, worstLabel: "9 days" },
  { departmentId: "2", departmentName: "Licensing", averageDays: 5, bestDays: 1, worstLabel: "3+ months" },
  { departmentId: "3", departmentName: "Public Works", averageDays: 8, bestDays: 3, worstLabel: "14 days" },
];

export const handlers = [
  // Public, unauthenticated — security: [] in openapi.yaml, so
  // mock/authz/gateway.ts marks it public and never reaches an auth check.
  // Aggregate rows only: no correspondence content, sender detail, or status.
  http.get("/api/public/departments/sla-performance", () =>
    HttpResponse.json({ data: slaPerformance }),
  ),
];
