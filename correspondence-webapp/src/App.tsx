// ROUTING STRUCTURE, prescribed by thunder-authentication:
//   - NoAccess sits ABOVE the shell route and REPLACES it.
//   - Forbidden sits INSIDE the shell, at /forbidden.
//   - /forbidden is wired into authz/client once, from ForbiddenWiring.
//   - Every gated route is wrapped in <RequireOperation op={screen.loads}>.
//   - /callback is routed OUTSIDE the AuthzProvider.
//   - This app declares no public screen (every flow in wireframes.dsl carries
//     a `role` line), so nothing is routed above the sign-in guard.

import { useEffect, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthzProvider, Forbidden, NoAccess, RequireOperation, useAuthz, useScopes } from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppShell } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { CallbackPage } from "./pages/Callback";
import { RegistryInboxPage } from "./pages/RegistryInbox";
import { LogCorrespondencePage } from "./pages/LogCorrespondence";
import { CorrespondenceDetailPage } from "./pages/CorrespondenceDetail";
import { SearchPage } from "./pages/Search";
import { MyDepartmentQueuePage } from "./pages/MyDepartmentQueue";
import { SupervisorDashboardPage } from "./pages/SupervisorDashboard";
import { DepartmentAdminPage } from "./pages/DepartmentAdmin";
import { DepartmentFormPage } from "./pages/DepartmentForm";
import { UserAdminPage } from "./pages/UserAdmin";
import { UserOnboardFormPage } from "./pages/UserOnboardForm";

/** YOUR pages, keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  "registry-inbox": <RegistryInboxPage />,
  "log-correspondence": <LogCorrespondencePage />,
  "correspondence-detail": <CorrespondenceDetailPage reach="all" />,
  search: <SearchPage />,
  "my-department-queue": <MyDepartmentQueuePage />,
  "my-department-correspondence-detail": <CorrespondenceDetailPage reach="mine" />,
  "supervisor-dashboard": <SupervisorDashboardPage />,
  "department-admin": <DepartmentAdminPage />,
  "department-form-new": <DepartmentFormPage mode="create" />,
  "department-form-edit": <DepartmentFormPage mode="edit" />,
  "user-admin": <UserAdminPage />,
  "user-onboard-form": <UserOnboardFormPage />,
};

export default function App(): ReactElement {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="*"
        element={
          <AuthzProvider fallback={<Splash />}>
            <ForbiddenWiring />
            <SignedIn />
          </AuthzProvider>
        }
      />
    </Routes>
  );
}

/**
 * Hands src/authz/client.ts the route a refusal goes to. ONCE, from inside the
 * router and above every route.
 */
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Checking your session…</p>
    </main>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard. Only a MISSING session starts a sign-in: currentUser()
  // already tried a silent renew, and signing in on a merely expired token
  // re-logs the user in on every visit.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  // NoAccess REPLACES the shell — no rail to wrap it.
  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        {/* Forbidden is INSIDE the shell: the rail the caller can use stays. */}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
