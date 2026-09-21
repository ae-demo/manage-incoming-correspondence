// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. Each row names the API
// operation the screen exists to perform; the gate follows from whether the
// caller may call it (src/authz/operations.gen.ts, generated from
// correspondence-api's openapi.yaml). No handle, scope or role is typed
// anywhere else — security.json carries no screen table at all.
//
// CorrespondenceDetail (wireframes.dsl) is walked by three different roles at
// two different reaches: a Registry Officer / Supervisor opens it from an
// every-row list (GET /correspondence/{id}, correspondence:read-all) and a
// Department Officer opens it from their own department's queue
// (GET /me/department/correspondence/{id}, correspondence:read). Those are two
// different operations, so this table carries two routes for the one wireframe
// screen — "correspondence-detail" and "my-department-correspondence-detail" —
// both rendered by the same page component (src/pages/CorrespondenceDetail.tsx),
// which reads which reach it is on from the route and shows only the actions
// (`<Can>`) the caller's scopes unlock.
//
// DepartmentForm (create/rename/deactivate) is one wireframe screen reached two
// ways — "New Department" and a row click to edit — so it gets two routes too,
// both gated on the same departments:manage-backed operation.

import { canCall } from "./core";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  readonly public?: boolean;
}

/** YOUR screens, in RAIL ORDER — the order wireframes.dsl draws them. */
export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "registry-inbox", label: "Inbox", path: "/inbox", loads: "GET /correspondence" },
  { key: "log-correspondence", label: "Log Physical Item", path: "/log", loads: "POST /correspondence" },
  {
    key: "correspondence-detail",
    label: "Correspondence",
    path: "/correspondence/:id",
    loads: "GET /correspondence/{correspondenceId}",
  },
  { key: "search", label: "Search", path: "/search", loads: "GET /correspondence" },
  {
    key: "my-department-queue",
    label: "My Queue",
    path: "/my-queue",
    loads: "GET /me/department/correspondence",
  },
  {
    key: "my-department-correspondence-detail",
    label: "Correspondence",
    path: "/me/department/correspondence/:id",
    loads: "GET /me/department/correspondence/{correspondenceId}",
  },
  { key: "supervisor-dashboard", label: "Dashboard", path: "/dashboard", loads: "GET /correspondence" },
  { key: "department-admin", label: "Departments", path: "/departments", loads: "GET /departments" },
  {
    key: "department-form-new",
    label: "New Department",
    path: "/departments/new",
    loads: "POST /departments",
  },
  {
    key: "department-form-edit",
    label: "Department",
    path: "/departments/:id/edit",
    loads: "POST /departments",
  },
  { key: "user-admin", label: "Users", path: "/users", loads: "GET /users" },
  {
    key: "user-onboard-form",
    label: "Onboard User",
    path: "/users/onboard",
    loads: "POST /users/onboard",
  },
];

for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some(
    (screen) => !screen.public && screen.loads !== null,
  );
}
