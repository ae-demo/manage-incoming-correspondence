import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/correspondence-api";

type Correspondence = components["schemas"]["Correspondence"];
type Department = components["schemas"]["Department"];
type Movement = components["schemas"]["Movement"];
type UserOnboarding = components["schemas"]["UserOnboarding"];
type ResponseRecord = components["schemas"]["Response"];

// Every request handler here answers what a real service would answer for the
// path's reach. Whether the caller may call the operation AT ALL is
// mock/authz/gateway.ts's job, read from the contract — nothing here re-checks
// a scope.
//
// The mock Department Officer's "my department" is fixed to Permits: the mock
// session (mock/authz/session.ts) carries scopes only, no department claim, so
// there is nothing per-caller to resolve it from. A row outside it is a 404
// under /me/…, never a 403 — the same rule the real API applies.
const MY_DEPARTMENT_ID = "dept-permits";

let departments: Department[] = [
  { id: "dept-permits", name: "Permits", status: "active", mailboxConfig: null, defaultTurnaroundDays: 10 },
  { id: "dept-licensing", name: "Licensing", status: "active", mailboxConfig: null, defaultTurnaroundDays: 7 },
  {
    id: "dept-legal",
    name: "Legal Affairs",
    status: "deactivated",
    mailboxConfig: "legal@example.gov",
    defaultTurnaroundDays: 14,
  },
];

let correspondence: Correspondence[] = [
  {
    id: "corr-1",
    source: "physical",
    senderName: "Jane Doe",
    category: "Complaint",
    status: "new",
    departmentId: null,
    receivedDate: "2026-09-18",
    dueDate: null,
    overdue: false,
    scannedDocumentUrl: "https://mock-bucket.test/scan-1.pdf",
  },
  {
    id: "corr-2",
    source: "email",
    senderName: "Acme Corp",
    category: "Petition",
    status: "new",
    departmentId: null,
    receivedDate: "2026-09-19",
    dueDate: null,
    overdue: false,
    scannedDocumentUrl: null,
  },
  {
    id: "corr-3",
    source: "physical",
    senderName: "Jane Doe",
    category: "Complaint",
    status: "in-progress",
    departmentId: "dept-permits",
    receivedDate: "2026-09-18",
    dueDate: "2026-09-25",
    overdue: false,
    scannedDocumentUrl: "https://mock-bucket.test/scan-3.pdf",
  },
  {
    id: "corr-4",
    source: "email",
    senderName: "Acme Corp",
    category: "Petition",
    status: "routed",
    departmentId: "dept-permits",
    receivedDate: "2026-09-19",
    dueDate: "2026-09-26",
    overdue: false,
    scannedDocumentUrl: null,
  },
  {
    id: "corr-5",
    source: "physical",
    senderName: "River Assoc.",
    category: "Petition",
    status: "routed",
    departmentId: "dept-licensing",
    receivedDate: "2026-08-15",
    dueDate: "2026-09-15",
    overdue: true,
    scannedDocumentUrl: "https://mock-bucket.test/scan-5.pdf",
  },
];

let movements: Movement[] = [
  {
    id: "mv-1",
    correspondenceId: "corr-3",
    fromDepartmentId: null,
    toDepartmentId: null,
    action: "Logged",
    actorUserId: "mock-registry-officer",
    occurredAt: "2026-09-18T09:00:00Z",
  },
  {
    id: "mv-2",
    correspondenceId: "corr-3",
    fromDepartmentId: null,
    toDepartmentId: "dept-permits",
    action: "Routed",
    actorUserId: "mock-registry-officer",
    occurredAt: "2026-09-18T09:05:00Z",
  },
];

let users: UserOnboarding[] = [
  { id: "user-1", userId: "jane@example.gov", departmentId: "dept-permits", role: "DepartmentOfficer" },
  { id: "user-2", userId: "sam@example.gov", departmentId: "dept-licensing", role: "RegistryOfficer" },
];

const responses = new Map<string, ResponseRecord>();

let nextId = 100;
const freshId = (prefix: string) => `${prefix}-${String(nextId++)}`;

function paginate<T>(rows: T[], url: URL): { count: number; data: T[] } {
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const offset = Number(url.searchParams.get("offset") ?? "0");
  return { count: rows.length, data: rows.slice(offset, offset + limit) };
}

export const handlers = [
  // ── Every-row correspondence (correspondence:read-all / correspondence:log) ──
  http.get("/api/correspondence", ({ request }) => {
    const url = new URL(request.url);
    const sender = url.searchParams.get("sender");
    const departmentId = url.searchParams.get("departmentId");
    const status = url.searchParams.get("status");
    const overdue = url.searchParams.get("overdue");
    let rows = correspondence;
    if (sender) rows = rows.filter((c) => c.senderName?.toLowerCase().includes(sender.toLowerCase()));
    if (departmentId) rows = rows.filter((c) => c.departmentId === departmentId);
    if (status) rows = rows.filter((c) => c.status === status);
    if (overdue !== null) rows = rows.filter((c) => c.overdue === (overdue === "true"));
    return HttpResponse.json(paginate(rows, url));
  }),

  http.post("/api/correspondence", async ({ request }) => {
    const body = (await request.json()) as { senderName?: string; category?: string; scannedDocumentUrl?: string };
    if (!body.senderName || !body.category || !body.scannedDocumentUrl) {
      return HttpResponse.json({ code: 400, message: "senderName, category and scannedDocumentUrl are required" }, { status: 400 });
    }
    const created: Correspondence = {
      id: freshId("corr"),
      source: "physical",
      senderName: body.senderName,
      category: body.category,
      status: "new",
      departmentId: null,
      receivedDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      overdue: false,
      scannedDocumentUrl: body.scannedDocumentUrl,
    };
    correspondence = [created, ...correspondence];
    movements = [
      ...movements,
      {
        id: freshId("mv"),
        correspondenceId: created.id,
        fromDepartmentId: null,
        toDepartmentId: null,
        action: "Logged",
        actorUserId: "mock-registry-officer",
        occurredAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/correspondence/:id/movements", ({ params }) => {
    const item = correspondence.find((c) => c.id === params.id);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    return HttpResponse.json({ count: movements.filter((m) => m.correspondenceId === item.id).length, data: movements.filter((m) => m.correspondenceId === item.id) });
  }),

  http.get("/api/correspondence/:id", ({ params }) => {
    const item = correspondence.find((c) => c.id === params.id);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post("/api/correspondence/:id/route", async ({ params, request }) => {
    const item = correspondence.find((c) => c.id === params.id);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    const { departmentId } = (await request.json()) as { departmentId?: string };
    const dept = departments.find((d) => d.id === departmentId && d.status === "active");
    if (!dept) return HttpResponse.json({ code: 400, message: "invalid department" }, { status: 400 });
    item.departmentId = dept.id;
    item.status = "routed";
    movements = [
      ...movements,
      {
        id: freshId("mv"),
        correspondenceId: item.id,
        fromDepartmentId: null,
        toDepartmentId: dept.id,
        action: "Routed",
        actorUserId: "mock-registry-officer",
        occurredAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(item);
  }),

  http.post("/api/correspondence/:id/reassign", async ({ params, request }) => {
    const item = correspondence.find((c) => c.id === params.id);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    const { departmentId } = (await request.json()) as { departmentId?: string };
    const dept = departments.find((d) => d.id === departmentId && d.status === "active");
    if (!dept) return HttpResponse.json({ code: 400, message: "invalid department" }, { status: 400 });
    const previous = item.departmentId;
    item.departmentId = dept.id;
    movements = [
      ...movements,
      {
        id: freshId("mv"),
        correspondenceId: item.id,
        fromDepartmentId: previous,
        toDepartmentId: dept.id,
        action: "Reassigned",
        actorUserId: "mock-supervisor",
        occurredAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(item);
  }),

  // ── The caller's department (correspondence:read / …) — MY_DEPARTMENT_ID's
  // rows only; anything else is 404, never 403, matching the real API's /me/ rule.
  http.get("/api/me/department/correspondence", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let rows = correspondence.filter((c) => c.departmentId === MY_DEPARTMENT_ID);
    if (status) rows = rows.filter((c) => c.status === status);
    return HttpResponse.json(paginate(rows, url));
  }),

  http.get("/api/me/department/correspondence/:id/movements", ({ params }) => {
    const item = correspondence.find((c) => c.id === params.id && c.departmentId === MY_DEPARTMENT_ID);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    const rows = movements.filter((m) => m.correspondenceId === item.id);
    return HttpResponse.json({ count: rows.length, data: rows });
  }),

  http.get("/api/me/department/correspondence/:id", ({ params }) => {
    const item = correspondence.find((c) => c.id === params.id && c.departmentId === MY_DEPARTMENT_ID);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.patch("/api/me/department/correspondence/:id/status", async ({ params, request }) => {
    const item = correspondence.find((c) => c.id === params.id && c.departmentId === MY_DEPARTMENT_ID);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    const { status } = (await request.json()) as { status?: Correspondence["status"] };
    if (!status) return HttpResponse.json({ code: 400, message: "status is required" }, { status: 400 });
    item.status = status;
    movements = [
      ...movements,
      {
        id: freshId("mv"),
        correspondenceId: item.id,
        fromDepartmentId: null,
        toDepartmentId: null,
        action: `Status -> ${status}`,
        actorUserId: "mock-department-officer",
        occurredAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(item);
  }),

  http.post("/api/me/department/correspondence/:id/response", async ({ params, request }) => {
    const item = correspondence.find((c) => c.id === params.id && c.departmentId === MY_DEPARTMENT_ID);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    const body = (await request.json()) as { note?: string; attachmentUrl?: string };
    if (!body.note && !body.attachmentUrl) {
      return HttpResponse.json({ code: 400, message: "note or attachmentUrl is required" }, { status: 400 });
    }
    const record: ResponseRecord = {
      correspondenceId: item.id,
      note: body.note ?? null,
      attachmentUrl: body.attachmentUrl ?? null,
      recordedAt: new Date().toISOString(),
    };
    responses.set(item.id, record);
    item.status = "responded";
    movements = [
      ...movements,
      {
        id: freshId("mv"),
        correspondenceId: item.id,
        fromDepartmentId: null,
        toDepartmentId: null,
        action: "Responded",
        actorUserId: "mock-department-officer",
        occurredAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(record, { status: 201 });
  }),

  http.post("/api/me/department/correspondence/:id/close", ({ params }) => {
    const item = correspondence.find((c) => c.id === params.id && c.departmentId === MY_DEPARTMENT_ID);
    if (!item) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    if (!responses.has(item.id) && item.status !== "responded") {
      return HttpResponse.json({ code: 400, message: "no response recorded yet" }, { status: 400 });
    }
    item.status = "closed";
    movements = [
      ...movements,
      {
        id: freshId("mv"),
        correspondenceId: item.id,
        fromDepartmentId: null,
        toDepartmentId: null,
        action: "Closed",
        actorUserId: "mock-department-officer",
        occurredAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(item);
  }),

  // ── Uploads: any signed-in caller. The mock never touches real storage —
  // it hands back a same-origin "presigned" URL this handler also answers. ──
  http.post("/api/correspondence/attachment-upload-url", async ({ request }) => {
    const { fileName } = (await request.json()) as { fileName?: string };
    if (!fileName) return HttpResponse.json({ code: 400, message: "fileName is required" }, { status: 400 });
    return HttpResponse.json(
      { uploadUrl: `/api/mock-upload/${encodeURIComponent(fileName)}`, fileUrl: `https://mock-bucket.test/${encodeURIComponent(fileName)}` },
      { status: 201 },
    );
  }),
  http.put("/api/mock-upload/:name", () => new HttpResponse(null, { status: 200 })),

  // ── Departments ──
  http.get("/api/departments", ({ request }) => HttpResponse.json(paginate(departments, new URL(request.url)))),

  http.post("/api/departments", async ({ request }) => {
    const body = (await request.json()) as { name?: string; defaultTurnaroundDays?: number };
    if (!body.name) return HttpResponse.json({ code: 400, message: "name is required" }, { status: 400 });
    const created: Department = {
      id: freshId("dept"),
      name: body.name,
      status: "active",
      mailboxConfig: null,
      defaultTurnaroundDays: body.defaultTurnaroundDays ?? 10,
    };
    departments = [...departments, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch("/api/departments/:id", async ({ params, request }) => {
    const dept = departments.find((d) => d.id === params.id);
    if (!dept) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    const body = (await request.json()) as Partial<Pick<Department, "name" | "mailboxConfig" | "defaultTurnaroundDays">>;
    Object.assign(dept, body);
    return HttpResponse.json(dept);
  }),

  http.post("/api/departments/:id/deactivate", ({ params }) => {
    const dept = departments.find((d) => d.id === params.id);
    if (!dept) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    dept.status = "deactivated";
    return HttpResponse.json(dept);
  }),

  // ── Users ──
  http.get("/api/users", ({ request }) => HttpResponse.json(paginate(users, new URL(request.url)))),

  http.post("/api/users/onboard", async ({ request }) => {
    const body = (await request.json()) as { userId?: string; departmentId?: string; role?: UserOnboarding["role"] };
    if (!body.userId || !body.departmentId || !body.role) {
      return HttpResponse.json({ code: 400, message: "userId, departmentId and role are required" }, { status: 400 });
    }
    const created: UserOnboarding = {
      id: freshId("user"),
      userId: body.userId,
      departmentId: body.departmentId,
      role: body.role,
    };
    users = [...users, created];
    return HttpResponse.json(created, { status: 201 });
  }),
];
