import type { JSX } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  Header,
  Sidebar,
  Footer,
  UserMenu,
  ColorSchemeToggle,
  Divider,
} from "@wso2/oxygen-ui";
import {
  Inbox,
  Search,
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  User,
  LogOut,
} from "@wso2/oxygen-ui-icons-react";
import { Can, useAuthz, useHeldRoles } from "../authz/gates";
import { signOut } from "../authz/session";
import { APP_NAME } from "../appName";

interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly op: Parameters<typeof Can>[0]["op"];
  readonly icon: JSX.Element;
  readonly isActive: (pathname: string) => boolean;
}

// The union of every sidebar item any wireframe screen draws. Each is gated on
// the operation it leads to (never a role name), so a caller sees exactly the
// picture their scopes earn them, and a caller holding two roles sees the
// union — the case no single wireframe can draw.
const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "inbox",
    label: "Inbox",
    path: "/inbox",
    op: "GET /correspondence",
    icon: <Inbox size={18} />,
    isActive: (p) => p === "/inbox",
  },
  {
    id: "search",
    label: "Search",
    path: "/search",
    op: "GET /correspondence",
    icon: <Search size={18} />,
    isActive: (p) => p === "/search",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    op: "GET /correspondence",
    icon: <LayoutDashboard size={18} />,
    isActive: (p) => p === "/dashboard",
  },
  {
    id: "my-queue",
    label: "My Queue",
    path: "/my-queue",
    op: "GET /me/department/correspondence",
    icon: <ClipboardList size={18} />,
    isActive: (p) => p === "/my-queue",
  },
  {
    id: "departments",
    label: "Departments",
    path: "/departments",
    op: "GET /departments",
    icon: <Building2 size={18} />,
    isActive: (p) => p.startsWith("/departments"),
  },
  {
    id: "users",
    label: "Users",
    path: "/users",
    op: "GET /users",
    icon: <Users size={18} />,
    isActive: (p) => p.startsWith("/users"),
  },
];

export function AppShell(): JSX.Element {
  const { pathname } = useLocation();
  const { username } = useAuthz();
  const roles = useHeldRoles();
  const active = NAV_ITEMS.find((item) => item.isActive(pathname))?.id;
  const roleLabel = roles.length > 0 ? roles.join(" / ") : undefined;

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Signed in"} />
              <UserMenu.Header
                name={username || "Signed in"}
                email={roleLabel ?? ""}
                role={roleLabel}
              />
              <UserMenu.Item icon={<User />} label="Profile" onClick={() => {}} />
              <UserMenu.Logout icon={<LogOut />} onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {NAV_ITEMS.map((item) => (
                <Can op={item.op} key={item.id}>
                  <Sidebar.Item id={item.id} link={<Link to={item.path} />}>
                    <Sidebar.ItemIcon>{item.icon}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{item.label}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                </Can>
              ))}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
