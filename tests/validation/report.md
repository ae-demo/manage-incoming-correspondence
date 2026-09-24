# Validation report

- **Issue:** #17
- **Commit:** 557eca4018574b2d5869d6cf6f969960eaf55514
- **Generated:** 2026-09-24T12:37:46.993Z
- **Playwright:** 1.61.1

## Summary

| Method | Total | Pass | Fail | Not run |
|---|---|---|---|---|
| e2e | 37 | 26 | 11 | 0 |
| manual (human checklist) | 3 | — | — | — |
| scenario (not validated) | 0 | — | — | — |

## E2E results

| Criterion | Must | Status | Spec | Notes |
|---|---|---|---|---|
| AC-001-a | A Registry Officer can create a new correspondence item with sender, category, and a scanned document attachment | ❌ fail | `tests/e2e/specs/AC-001-a.spec.ts` | — |
| AC-001-b | A logged physical item appears in the system immediately after being saved | ❌ fail | `tests/e2e/specs/AC-001-b.spec.ts` | — |
| AC-003-a | A Registry Officer can view a list of newly logged, unrouted correspondence items | ✅ pass | `tests/e2e/specs/AC-003-a.spec.ts` | — |
| AC-003-b | A Registry Officer can assign a newly logged item to a department | ❌ fail | `tests/e2e/specs/AC-003-b.spec.ts` | — |
| AC-003-c | After assignment, the item shows the department it was routed to | ✅ pass | `tests/e2e/specs/AC-003-c.spec.ts` | — |
| AC-004-a | A Registry Officer can change the department assigned to an already-routed correspondence item | ❌ fail | `tests/e2e/specs/AC-004-a.spec.ts` | — |
| AC-005-a | A Department Officer can view a list of correspondence items currently assigned to their own department | ✅ pass | `tests/e2e/specs/AC-005-a.spec.ts` | — |
| AC-005-b | A Department Officer does not see correspondence assigned to a different department in that list | ✅ pass | `tests/e2e/specs/AC-005-b.spec.ts` | — |
| AC-006-a | A Department Officer can change the status of an item assigned to their department (e.g., to in progress) | ✅ pass | `tests/e2e/specs/AC-006-a.spec.ts` | — |
| AC-006-b | The updated status is visible to other users viewing that item | ✅ pass | `tests/e2e/specs/AC-006-b.spec.ts` | — |
| AC-007-a | A Department Officer can record a response note and/or an attached response document against a correspondence item | ✅ pass | `tests/e2e/specs/AC-007-a.spec.ts` | — |
| AC-007-b | The recorded response is retrievable from that correspondence item afterward | ❌ fail | `tests/e2e/specs/AC-007-b.spec.ts` | — |
| AC-008-a | A Department Officer can close a correspondence item that has a recorded response | ✅ pass | `tests/e2e/specs/AC-008-a.spec.ts` | — |
| AC-008-b | A closed item no longer appears in the active/open queue | ❌ fail | `tests/e2e/specs/AC-008-b.spec.ts` | — |
| AC-008-c | An item with no recorded response cannot be closed | ✅ pass | `tests/e2e/specs/AC-008-c.spec.ts` | — |
| AC-009-a | A Supervisor can view a dashboard listing correspondence items from every department | ✅ pass | `tests/e2e/specs/AC-009-a.spec.ts` | — |
| AC-009-b | Each item on the dashboard shows its current status | ✅ pass | `tests/e2e/specs/AC-009-b.spec.ts` | — |
| AC-010-a | An item past its due date is visibly flagged as overdue to the Supervisor | ✅ pass | `tests/e2e/specs/AC-010-a.spec.ts` | — |
| AC-010-b | An item not yet past its due date is not flagged as overdue | ✅ pass | `tests/e2e/specs/AC-010-b.spec.ts` | — |
| AC-011-a | A Supervisor can reassign a correspondence item to a different department | ❌ fail | `tests/e2e/specs/AC-011-a.spec.ts` | — |
| AC-012-a | A Registry Officer or Supervisor can filter correspondence by sender | ✅ pass | `tests/e2e/specs/AC-012-a.spec.ts` | — |
| AC-012-b | A Registry Officer or Supervisor can filter correspondence by department | ✅ pass | `tests/e2e/specs/AC-012-b.spec.ts` | — |
| AC-012-c | A Registry Officer or Supervisor can filter correspondence by status | ✅ pass | `tests/e2e/specs/AC-012-c.spec.ts` | — |
| AC-012-d | A Registry Officer or Supervisor can filter correspondence by date | ✅ pass | `tests/e2e/specs/AC-012-d.spec.ts` | healed ×1 |
| AC-013-a | A correspondence item's movement history lists who it was routed to and when | ✅ pass | `tests/e2e/specs/AC-013-a.spec.ts` | — |
| AC-013-b | A correspondence item's movement history lists the actions taken on it | ✅ pass | `tests/e2e/specs/AC-013-b.spec.ts` | — |
| AC-015-a | An Admin can create a new department | ❌ fail | `tests/e2e/specs/AC-015-a.spec.ts` | — |
| AC-015-b | An Admin can rename an existing department | ❌ fail | `tests/e2e/specs/AC-015-b.spec.ts` | — |
| AC-015-c | An Admin can deactivate a department | ✅ pass | `tests/e2e/specs/AC-015-c.spec.ts` | — |
| AC-015-d | A deactivated department is no longer available as a routing option for new or reassigned items | ✅ pass | `tests/e2e/specs/AC-015-d.spec.ts` | — |
| AC-016-a | An Admin can assign a user to a department and one of the three roles | ❌ fail | `tests/e2e/specs/AC-016-a.spec.ts` | — |
| AC-016-b | After onboarding, the user can access the correspondence relevant to their assigned role and department | ✅ pass | `tests/e2e/specs/AC-016-b.spec.ts` | — |
| AC-017-a | The SLA performance dashboard is reachable without signing in | ✅ pass | `tests/e2e/specs/AC-017-a.spec.ts` | — |
| AC-017-b | The dashboard shows SLA/turnaround performance broken down per department | ✅ pass | `tests/e2e/specs/AC-017-b.spec.ts` | — |
| AC-017-c | The dashboard does not display individual correspondence content, sender details, or the status of a specific item | ✅ pass | `tests/e2e/specs/AC-017-c.spec.ts` | — |
| AC-018-a | An Admin can configure an organization-wide default intake mailbox | ❌ fail | `tests/e2e/specs/AC-018-a.spec.ts` | — |
| AC-018-b | An Admin can configure a separate intake mailbox for an individual department | ✅ pass | `tests/e2e/specs/AC-018-b.spec.ts` | — |

## Failures

### AC-001-a — A Registry Officer can create a new correspondence item with sender, category, and a scanned document attachment

Spec: `tests/e2e/specs/AC-001-a.spec.ts`
Location: `AC-001-a.spec.ts:5`

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/inbox$/
Received string:  "https://http-manage-incomi-development-default-b1694cb5.apps.94.72.97.95.sslip.io/log"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    23 × unexpected value "https://http-manage-incomi-development-default-b1694cb5.apps.94.72.97.95.sslip.io/log"

```

### AC-001-b — A logged physical item appears in the system immediately after being saved

Spec: `tests/e2e/specs/AC-001-b.spec.ts`
Location: `AC-001-b.spec.ts:5`

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('cell', { name: 'E2E Sender 1790252513962' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('cell', { name: 'E2E Sender 1790252513962' })

```

### AC-003-b — A Registry Officer can assign a newly logged item to a department

Spec: `tests/e2e/specs/AC-003-b.spec.ts`
Location: `AC-003-b.spec.ts:6`

```
Test timeout of 90000ms exceeded.
```

### AC-004-a — A Registry Officer can change the department assigned to an already-routed correspondence item

Spec: `tests/e2e/specs/AC-004-a.spec.ts`
Location: `AC-004-a.spec.ts:6`

```
Test timeout of 90000ms exceeded.
```

### AC-007-b — The recorded response is retrievable from that correspondence item afterward

Spec: `tests/e2e/specs/AC-007-b.spec.ts`
Location: `AC-007-b.spec.ts:6`

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Resolved per phone call with sender on the record.')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Resolved per phone call with sender on the record.')

```

### AC-008-b — A closed item no longer appears in the active/open queue

Spec: `tests/e2e/specs/AC-008-b.spec.ts`
Location: `AC-008-b.spec.ts:6`

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('cell', { name: 'E2E QueueClose Sender 1790252873929' })
Expected: not visible
Received: visible
Timeout:  10000ms

Call log:
  - Expect "not toBeVisible" with timeout 10000ms
  - waiting for getByRole('cell', { name: 'E2E QueueClose Sender 1790252873929' })
    24 × locator resolved to <td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium css-1man376">E2E QueueClose Sender 1790252873929</td>
       - unexpected value "visible"

```

### AC-011-a — A Supervisor can reassign a correspondence item to a different department

Spec: `tests/e2e/specs/AC-011-a.spec.ts`
Location: `AC-011-a.spec.ts:6`

```
Test timeout of 90000ms exceeded.
```

### AC-015-a — An Admin can create a new department

Spec: `tests/e2e/specs/AC-015-a.spec.ts`
Location: `AC-015-a.spec.ts:5`

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('row', { name: /E2E New Dept 1790253145233.*Active/ })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('row', { name: /E2E New Dept 1790253145233.*Active/ })

```

### AC-015-b — An Admin can rename an existing department

Spec: `tests/e2e/specs/AC-015-b.spec.ts`
Location: `AC-015-b.spec.ts:6`

```
Test timeout of 90000ms exceeded.
```

### AC-016-a — An Admin can assign a user to a department and one of the three roles

Spec: `tests/e2e/specs/AC-016-a.spec.ts`
Location: `AC-016-a.spec.ts:6`

```
Test timeout of 90000ms exceeded.
```

### AC-018-a — An Admin can configure an organization-wide default intake mailbox

Spec: `tests/e2e/specs/AC-018-a.spec.ts`
Location: `AC-018-a.spec.ts:5`

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /organization.*mailbox/i })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: /organization.*mailbox/i })

```

## Manual checklist

- [ ] **AC-002-a** — An email received at a configured intake mailbox results in a new correspondence item logged automatically, without manual entry
- [ ] **AC-014-a** — A Department Officer receives a notification when a correspondence item is newly assigned to them
- [ ] **AC-018-c** — Email received at a department's own configured mailbox is captured as correspondence for that department

## Healing log

| Criterion | Classification | Change | Commit |
|---|---|---|---|
| AC-012-d | data collision | relative 'yesterday' date (broken once test data spans multiple calendar days across repeated validation runs) -> fixed date '2000-01-01' safely before any test data | `557eca40` |

