import { AppShell, Header, Footer } from "@wso2/oxygen-ui";
import { Outlet } from "react-router";
import type { JSX } from "react";

// This component is a single, unauthenticated public page — no sign-in, no
// nav rail, no other route (design.json, wireframes.dsl SlaPerformance). The
// wireframe draws a navbar carrying only the title, so this shell has no
// AppShell.Sidebar and no Header.Actions/UserMenu.
export default function PublicLayout(): JSX.Element {
  return (
    <AppShell>
      <AppShell.Navbar>
        <Header minimal>
          <Header.Brand>
            <Header.BrandTitle>Correspondence SLA Performance</Header.BrandTitle>
          </Header.Brand>
        </Header>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </AppShell.Footer>
    </AppShell>
  );
}
