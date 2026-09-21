# Intake and Routing

A Registry Officer logs physical correspondence, or the system captures it
automatically from a configured mailbox, and the Registry Officer routes each
new item to the responsible department.

```mermaid
sequenceDiagram
    actor RegistryOfficer as Registry Officer
    participant correspondenceweb as correspondence-web
    participant correspondenceapi as correspondence-api
    participant emailintake as email-intake

    emailintake->>correspondenceapi: incoming email correspondence
    correspondenceapi->>correspondenceapi: log item (status new)

    RegistryOfficer->>correspondenceweb: log physical item + scanned copy
    correspondenceweb->>correspondenceapi: create correspondence
    correspondenceapi-->>correspondenceweb: created (status new)

    RegistryOfficer->>correspondenceweb: review new items
    correspondenceweb->>correspondenceapi: list correspondence (unrouted)
    RegistryOfficer->>correspondenceweb: route to department
    correspondenceweb->>correspondenceapi: route item
    correspondenceapi-->>correspondenceweb: routed (due date set)
```