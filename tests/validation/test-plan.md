# Validation test plan — manage-incoming-correspondence (issue #17)

Explored live against the deployed endpoints in `tests/e2e/targets.json` using
`playwright-cli`, signed in as each of the 5 test accounts from the roles gate
ticket (issue #11). Findings that shape every section below:

- **The app's own root-URL sign-in never completes.** Visiting `/` while
  signed out hangs forever on "Checking your session…" — the SPA's client-side
  OIDC discovery fetch (`GET /.well-known/openid-configuration` on the IdP) is
  blocked by CORS (no `Access-Control-Allow-Origin` on that endpoint, confirmed
  with `curl`), and the SPA has no fallback UI. `/auth/login` is a working,
  separate redirect straight to the IdP's hosted sign-in page (bypasses the
  broken discovery fetch entirely) and completes sign-in normally. Every spec
  below signs in via `/auth/login` (`lib/auth.ts`) — this is a real, working
  part of the deployed system, not a workaround. The root-URL hang is reported
  as its own finding (not tied to a numbered AC, since none of the 37 asserts
  the auto-redirect behavior of `/`).
- **Attachment upload is broken**: `POST /api/correspondence/attachment-upload-url`
  500s with `"attachment storage unavailable: aws-s3 is not configured"` for
  every signed-in role. The UI's "Log Physical Item" form requires a chosen
  file before Save enables, and Save always calls this endpoint — so no
  correspondence item can be logged through the deployed UI at all. This
  blocks AC-001-a/b directly. For every *other* criterion that merely assumes
  "a correspondence item exists," specs seed it directly via
  `POST /correspondence` with an arbitrary `scannedDocumentUrl` string (the
  API schema doesn't validate the URL points at a real upload — confirmed
  working with `curl`) — this is test setup, not a claim that AC-001-a passes.
- No due date can be produced in the past through ordinary use (`receivedDate`
  is always "now," set server-side). `defaultTurnaroundDays` accepts negative
  values, which is what AC-010-a's setup uses to produce a due date in the
  past without an admin UI control that says "backdate this."
- **List screens have no pagination and do not reliably sort by recency.**
  The Supervisor Dashboard fetches `GET /correspondence?limit=50` once, with
  no way to page further; the Admin Departments screen fetches
  `GET /departments?limit=100`, also with no pagination control. Neither
  response is ordered by creation/received time (older rows observed after
  newer ones in the same page). As this validation run itself logged more
  correspondence items and departments — both grow without bound and there
  is no delete endpoint for either — newly created rows on both screens
  stopped reliably appearing at all once each list's total crossed its fetch
  cap (61+ correspondence items, 150+ departments by the end of this run).
  For a running correspondence-tracking system this is a when-not-if
  condition, not an artifact specific to this validation session. This
  blocks AC-009-a, AC-009-b, AC-010-a, AC-010-b, AC-011-a (Supervisor
  Dashboard) and AC-015-b (Departments screen) — every one of which depends
  on a freshly created row appearing on a list screen that has since crossed
  its cap. Each spec's own seed step unavoidably adds to that count, so this
  gets strictly worse on every re-run, including a future re-validation of
  this same environment.

## AC-001-a — create a correspondence item with sender, category, and a scanned attachment
- Target: correspondence-web (Registry Officer)
- Steps: sign in; go to Log Physical Item; fill sender name; pick a category;
  choose a file; click Save.
- Assert: item is created (no error) and attachment is attached.
- Live result: **fails genuinely** — Save triggers the upload-url call, which
  500s. Spec drives the real flow and asserts success; it fails honestly.

## AC-001-b — a logged physical item appears immediately after saving
- Target: correspondence-web (Registry Officer)
- Steps: same as AC-001-a, then check the item appears in the Inbox list.
- Assert: sender name visible in the New Correspondence table right after save.
- Live result: **fails genuinely** (cascades from AC-001-a — save never
  completes, so nothing to appear).

## AC-003-a — Registry Officer views new/unrouted items
- Steps: seed one unrouted item via API; sign in as Registry Officer; open Inbox.
- Assert: seeded sender name row visible in the New Correspondence table.

## AC-003-b — Registry Officer assigns a newly logged item to a department
- Steps: seed a department + unrouted item; sign in; open its detail page;
  pick the department in the Route card; click Route.
- Assert: redirected to Inbox and the routed item is no longer in Inbox's list.

## AC-003-c — after assignment, item shows the routed department
- Steps: continue from AC-003-b's item; reopen its detail page.
- Assert: department name shown in the "Received … · <Department>" line and
  in the movement history's "routed → <dept>" row.

## AC-004-a — Registry Officer reassigns an already-routed item
- Steps: seed dept A + dept B + item routed to A; sign in as Registry Officer;
  open detail; use the Reassign card to move it to B.
- Assert: detail page now shows department B; history has a "reassigned" row.

## AC-005-a — Department Officer sees their department's correspondence
- Steps: seed dept + item routed to it; onboard the dept-officer test user into
  that dept; sign in as Department Officer; open My Queue.
- Assert: seeded sender visible in the table.

## AC-005-b — Department Officer does not see another department's items
- Steps: seed dept A (onboard dept-officer-2 into it) + dept B + item routed to
  B only; sign in as dept-officer-2; open My Queue.
- Assert: the dept-B-only sender is NOT present in dept-officer-2's queue.

## AC-006-a — Department Officer changes an item's status
- Steps: seed + route + onboard as above; sign in as Department Officer; open
  item detail; set Status to "In Progress"; click Update Status.
- Assert: header badge reads "In Progress".

## AC-006-b — the updated status is visible to other users
- Steps: continue from AC-006-a; sign in as a different user (Registry
  Officer, who holds read-all) in a second browser context; open Search.
- Assert: the item's Status column reads "In Progress" for that other user.

## AC-007-a — Department Officer records a response (note and/or attachment)
- Steps: seed + route + onboard; sign in as Department Officer; open detail;
  fill Response note (attachment path is skip — blocked by the same S3 issue
  as AC-001-a, not re-tested here); click Save Response.
- Assert: header badge becomes "Responded" and Close Item becomes enabled.

## AC-007-b — the recorded response is retrievable afterward
- Steps: continue from AC-007-a; reload the detail page.
- Assert: the response note text is shown somewhere on the page.
- Live result: **fails genuinely** — reload clears the note field to empty,
  the movement history only logs a bare "responded" event with no note text,
  and there is no GET endpoint for a recorded response (`.../response` 404s).
  The note is unrecoverable through the deployed system once saved.

## AC-008-a — Department Officer closes an item with a recorded response
- Steps: continue from AC-007-a (or fresh seed+respond); click Close Item.
- Assert: header badge becomes "Closed".

## AC-008-b — a closed item no longer appears in the active/open queue
- Steps: continue from AC-008-a; reload My Queue.
- Assert: the closed sender is absent from the queue table.
- Live result: **fails genuinely** — the closed item remains listed in "My
  Department's Correspondence" alongside open ones; the queue applies no
  active/open filter.

## AC-008-c — an item with no recorded response cannot be closed
- Steps: seed + route + onboard, do NOT respond; open detail.
- Assert: Close Item button is disabled.

## AC-009-a — Supervisor dashboard lists items from every department
- Steps: seed two departments, one item routed to each; sign in as Supervisor;
  open Dashboard.
- Assert: both seeded senders appear in the dashboard table.
- Live result: **fails genuinely** (as of this run) — see the dashboard
  pagination/ordering note above. Passed earlier in this same run while the
  environment held fewer correspondence items; now fails as the accumulated
  count exceeds the dashboard's fetch cap.

## AC-009-b — each dashboard item shows its current status
- Steps: continue from AC-009-a.
- Assert: each seeded row's Status cell matches its known status ("Routed").
- Live result: **fails genuinely**, same cause as AC-009-a.

## AC-010-a — an overdue item is flagged
- Steps: seed a department with a negative `defaultTurnaroundDays`; route a
  fresh item to it (due date lands in the past); open Supervisor Dashboard.
- Assert: that row's Overdue cell reads "Yes".
- Live result: **fails genuinely**, same cause as AC-009-a.

## AC-010-b — a not-yet-due item is not flagged
- Steps: seed a department with a positive turnaround; route a fresh item;
  open Supervisor Dashboard.
- Assert: that row's Overdue cell reads "No".
- Live result: **fails genuinely**, same cause as AC-009-a.

## AC-011-a — Supervisor reassigns an item between departments
- Steps: seed dept A + dept B + item routed to A; sign in as Supervisor; open
  Dashboard; select the item's checkbox; click Reassign Selected; pick dept B;
  click Reassign.
- Assert: detail page now shows department B.
- Live result: **fails genuinely**, same cause as AC-009-a — the seeded item's
  checkbox is never reachable because the row itself isn't rendered.

## AC-012-a — filter correspondence by sender
- Steps: seed two items with distinct sender names; sign in as Registry
  Officer; open Search; type one sender's name into the Sender filter.
- Assert: only that sender's row is shown.

## AC-012-b — filter correspondence by department
- Steps: seed two departments, one item routed to each; open Search; pick one
  department from the Department filter.
- Assert: only the row for that department is shown.

## AC-012-c — filter correspondence by status
- Steps: seed + route + close one item, seed + route (leave open) another;
  open Search; pick "Closed" in the Status filter.
- Assert: only the closed row is shown.

## AC-012-d — filter correspondence by date
- Steps: open Search; set the Date filter to a date with no items received.
- Assert: table shows "No matches".

## AC-013-a — movement history lists who it was routed to and when
- Steps: seed + route an item; open its detail page.
- Assert: History table has a "routed" row naming the destination department
  and a non-empty timestamp.

## AC-013-b — movement history lists the actions taken
- Steps: continue: route, then update status; reopen detail.
- Assert: History table includes both a "routed" row and a "status:…" row.

## AC-015-a — Admin creates a department
- Steps: sign in as Admin; open Departments; New Department; fill Name +
  turnaround; Save.
- Assert: new department row appears in the Departments table as Active.

## AC-015-b — Admin renames a department
- Steps: continue from AC-015-a; open it; change Name; Save.
- Assert: Departments table shows the new name.
- Live result: **fails genuinely** (as of this run) — see the list-screen
  pagination/ordering note above. Passed earlier in this run while the
  environment held fewer departments; now the freshly created department is
  never found in the table to click into and rename.

## AC-015-c — Admin deactivates a department
- Steps: continue; open it; click Deactivate.
- Assert: Departments table shows its Status as "Deactivated".

## AC-015-d — a deactivated department is unavailable for routing
- Steps: continue from AC-015-c; seed an unrouted item; open its detail page;
  open the Route department dropdown.
- Assert: the deactivated department's name is not among the options.

## AC-016-a — Admin onboards a user into a department + role
- Steps: sign in as Admin; open Users; Onboard User; fill username, pick a
  department, pick a role; Onboard.
- Assert: Users table shows the new row with that department and role.

## AC-016-b — the onboarded user can access relevant correspondence
- Steps: continue from AC-016-a (department officer role); seed + route an
  item to that department; sign in as that user; open My Queue.
- Assert: the seeded sender is visible.

## AC-017-a — the SLA dashboard is reachable without signing in
- Target: public-sla-dashboard
- Steps: fresh (unauthenticated) browser context; goto the dashboard root.
- Assert: "Department SLA Performance" heading visible, no login redirect.

## AC-017-b — dashboard shows SLA performance per department
- Steps: seed + route + respond + close one item in a fresh department (so it
  has resolved SLA data); open the public dashboard.
- Assert: a row for that department with numeric Average/Best/Worst cells.

## AC-017-c — dashboard shows no individual correspondence detail
- Steps: continue from AC-017-b.
- Assert: the seeded sender's name is not present anywhere on the page.

## AC-018-a — Admin configures an organization-wide default intake mailbox
- Steps: sign in as Admin; search the Departments screen and its own
  create/edit form for any organization-level (not per-department) mailbox
  control; also checked for a `/settings` route and any org-level API path.
- Assert: such a control exists and can be saved.
- Live result: **fails genuinely** — no such control exists anywhere in the
  deployed app. The only mailbox field is per-department
  ("leave blank to use the organization default"); there is no admin surface,
  screen, or API endpoint to set what that default actually is.

## AC-018-b — Admin configures a separate mailbox for one department
- Steps: sign in as Admin; open a department; fill the Intake mailbox field;
  Save.
- Assert: Departments table shows that department's Mailbox column as the
  configured address instead of "Organization default".

## Manual criteria (rendered as a checklist in the report, not automated)
- AC-002-a — email received at intake mailbox auto-logs a correspondence item.
- AC-014-a — Department Officer is notified on new assignment.
- AC-018-c — email at a department's own mailbox is captured for that department.

## Re-validation (issue #17, run of 2026-09-23)

Regression-only run: all 37 e2e criteria already had committed specs, none
needed authoring. Result: 28/37 passing (up from 26/37 on 2026-09-21).

- **AC-009-a, AC-009-b, AC-010-a, AC-010-b now pass** — previously failed
  because the Supervisor Dashboard's uncapped, unpaginated `GET
  /correspondence?limit=50` had been pushed past its cap by this validation
  suite's own accumulated test data. That data has apparently rotated out
  (or the cap/sort was fixed) since the 2026-09-21 run; re-verify on the next
  cycle since the underlying "no pagination" defect noted then was never
  fixed in the code, only in the data's current shape.
- **New failures this run, not seen on 2026-09-21: AC-003-b, AC-004-a,
  AC-011-a, AC-015-b.** Root cause confirmed live: `GET
  /api/departments?limit=100` (used by every department picker/list in the
  Admin and routing/reassignment UIs) is alphabetically sorted with a hard
  100-row cap, and the deployed environment now has 190+ departments
  accumulated across validation runs (none can be deleted — no delete
  endpoint exists). A department created by these specs sorts past position
  100 more often than not, so the picker never shows it and the option/row
  click times out. This is the same defect class the 2026-09-21 run
  reported for the Supervisor Dashboard and Admin Departments *screens*
  (`GET /departments?limit=100`, `GET /correspondence?limit=50` — no
  pagination) — now also confirmed to break the department *picker*
  controls used mid-flow (route/reassign/rename dialogs), not just list
  screens. Confirmed via direct API query: e.g. `E2E Route Dept
  1790162919269` sorts to index 144 of 190 departments, `E2E Rename Before
  1790164132277` to index 129 of 192 — both past the 100-row cap.
- **AC-005-a failed once (full-suite run) then passed on an isolated
  re-run** with no spec change — live re-drive of the exact sign-in
  confirmed the app itself works; the first failure was transient
  contention from running 34 specs sequentially against the same
  deployment, not a defect. Treated as brittle/transient per
  `references/healing.md`; no heal needed since nothing in the spec was
  wrong.
- **AC-001-a/b, AC-007-b, AC-008-b, AC-018-a re-confirmed still genuinely
  failing**, same root causes as 2026-09-21 (attachment upload still 500s
  live — reconfirmed via a fresh manual drive of the Log Physical Item form
  through playwright-cli; recorded response still not retrievable; closed
  items still remain in the active queue; no org-wide mailbox admin control
  exists).
