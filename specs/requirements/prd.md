# Manage Incoming Correspondence — PRD

## Problem Statement

A government organization receives correspondence — letters, petitions,
requests, complaints — through the post and by email, in volumes that make
manual tracking unreliable. Today, items are logged (if at all) in registers
or spreadsheets, handed physically or informally to the department that
should act on them, and then tracked by memory or ad-hoc follow-up. Items
get lost between departments, nobody can say at a glance what is overdue,
and there is no single record of who has handled an item or how it was
finally resolved.

## Solution

A correspondence-tracking application that gives the organization a single
system of record for every incoming item, from the moment it is logged
(physically or by email) through routing to the responsible department,
handling, response, and closure. Every item carries a visible status and a
full movement history, so registry staff, department officers, and
supervisors can all see where an item stands and who is responsible for it
next.

## Actors

- **Registry Officer** — logs incoming correspondence (physical and email),
reviews each item, and routes it to the department responsible for
handling it; can reassign misrouted items and search/track any item.
- **Department Officer** — works the correspondence assigned to their
department: updates its status, records the response issued, and closes
it once resolved.
- **Supervisor** — oversees correspondence across all departments: monitors
a dashboard of status and overdue items, reassigns items to rebalance or
correct workload, and can review the full history of any item.
- **Admin** — manages the organization's department/unit directory (create,
rename, deactivate) and onboards users into those departments, assigning
each the app role (Registry Officer, Department Officer, or Supervisor)
they hold.
- **Public Viewer** — an unauthenticated visitor who can view the public
SLA-performance dashboard showing each department's turnaround
compliance, with no access to individual correspondence records.

## User Stories

1. As a Registry Officer, I want to log incoming correspondence received
physically, attaching a scanned copy, so that it is captured in the
system from the moment it arrives.
2. As a Registry Officer, I want incoming correspondence sent by email to be
captured into the system automatically, so that email correspondence is
tracked the same way as physical mail.
3. As a Registry Officer, I want to review each newly logged item and assign
it to the department responsible for handling it, so that it reaches the
right part of the organization.
4. As a Registry Officer, I want to reassign an item to a different
department if I routed it incorrectly, so that misrouted correspondence
is corrected quickly.
5. As a Department Officer, I want to see all correspondence assigned to my
department, so that I know what is waiting for action.
6. As a Department Officer, I want to update the status of an item (e.g., in
progress) as I work on it, so that its progress is visible to others.
7. As a Department Officer, I want to record the response issued for a
correspondence item, including an attached response document, so that
there is a record of how it was resolved.
8. As a Department Officer, I want to close a correspondence item once it
has been responded to, so that it is marked resolved and removed from
the active queue.
9. As a Supervisor, I want to see a dashboard of all correspondence across
departments with their current status, so that I can monitor overall
workload and progress.
10. As a Supervisor, I want to see items that are overdue against their
expected turnaround, so that I can escalate or intervene.
11. As a Supervisor, I want to reassign correspondence between departments
or officers, so that workload can be rebalanced or corrected.
12. As a Registry Officer or Supervisor, I want to search and filter
correspondence by sender, department, status, or date, so that I can
find any item quickly.
13. As a Registry Officer, Department Officer, or Supervisor, I want to see
the full movement history of a correspondence item — who it was routed
to, when, and what actions were taken — so that its handling is
auditable end to end.
14. As a Department Officer, I want to be notified when a new item is
assigned to me, so that I don't miss incoming work.
15. As an Admin, I want to create, rename, and deactivate departments/units,
so that the routing list reflects the organization's real structure.
16. As an Admin, I want to onboard a user into a department and assign them
a role (Registry Officer, Department Officer, or Supervisor), so that
they can access the correspondence relevant to their responsibilities.
17. As a Public Viewer, I want to see a public dashboard of each
department's SLA performance against its turnaround targets, so that
the organization's responsiveness is transparent.

## Product Decisions

- **Sign-in**: all users sign in via SSO through Thunder, the platform IDP
(organization default).
- **Routing**: routing is a manual judgment call made by the Registry
Officer for every item — no automatic or rule-based routing.
- **Intake channels**: correspondence enters the system either by manual
entry (physical mail, logged by the Registry Officer with a scanned
attachment) or by automatic capture of incoming email.
- **File storage**: scanned documents and response attachments are stored
via the organization's registered S3 file storage, following its
presigned-URL upload/download pattern.
- **Organizational structure**: the app's department/unit list is managed by
the Admin role (create, rename, deactivate) rather than being a fixed,
pre-set list; correspondence is still assigned to exactly one department
at a time.
- **Department deactivation**: a deactivated department is removed from
future routing/assignment options, but correspondence already assigned to
it keeps that historical reference. *assumed*
- **User onboarding**: Admin assigns an existing Thunder-authenticated
identity to a department and one of the three operational roles
(Registry Officer, Department Officer, Supervisor) within this app;
Admin does not create identities in Thunder itself — account
provisioning stays with Thunder. A user holds membership in exactly one
department at a time. *assumed*
- **Turnaround &amp; escalation**: each correspondence item receives a due date
based on a configurable default turnaround period, which may vary by
category; an item past its due date is flagged as overdue for the
Supervisor to see and act on.
- **Public SLA dashboard**: a public, unauthenticated dashboard shows each
department's SLA/turnaround performance (e.g., share of items resolved
within target, by category). It is aggregate-only — it never exposes
individual correspondence content, sender details, or the status of a
specific item. *assumed*
- **Closure requires a recorded response**: an item can only be marked
closed once a response (text note and/or attached document) has been
recorded against it. *assumed*
- **Assignment notifications**: a Department Officer is notified when an
item is newly assigned to them, and a Supervisor is notified when an item
becomes overdue, delivered on all three channels — email, SMS, and
in-app — via the organization's registered `email-service` and
`sms-service`. SMS is sent to the phone number on the user's Thunder
profile attributes; a user with no phone number on file simply does not
receive the SMS leg. *assumed*
- **Email ingestion**: incoming email correspondence is captured
automatically. The specific mailbox/provider to monitor is not yet
decided — see Open Questions.

## Out of Scope

- A public-facing portal for external senders (citizens, other agencies) to
check the status of their correspondence. (The public SLA dashboard is
aggregate performance data only and does not let anyone look up an
individual item.)
- Outbound correspondence unrelated to responding to a tracked incoming item
(e.g., general outgoing mail campaigns or bulk notices).
- Automated OCR or data-extraction from scanned physical documents — a
scanned copy is stored as an attachment, not parsed.
- Multi-level sign-off or approval chains on a response beyond a Department
Officer recording and closing it.

## Open Questions

1. Which email account/mailbox should the system monitor for incoming
correspondence?

