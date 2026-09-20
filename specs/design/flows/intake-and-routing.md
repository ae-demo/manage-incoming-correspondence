# Intake and Routing

A Registry Officer logs physical correspondence, or the system captures it
automatically from a configured mailbox, and the Registry Officer routes each
new item to the responsible department.

```mermaid
sequenceDiagram
    actor RegistryOfficer as Registry Officer
    participant correspondencewebapp as correspondence-webapp
    participant correspondenceapi as correspondence-api
    participant emailintake as email-intake

    emailintake->>correspondenceapi: incoming email correspondence
    correspondenceapi->>correspondenceapi: log item (status new)

    RegistryOfficer->>correspondencewebapp: log physical item + scanned copy
    correspondencewebapp->>correspondenceapi: create correspondence
    correspondenceapi-->>correspondencewebapp: created (status new)

    RegistryOfficer->>correspondencewebapp: review new items
    correspondencewebapp->>correspondenceapi: list correspondence (unrouted)
    RegistryOfficer->>correspondencewebapp: route to department
    correspondencewebapp->>correspondenceapi: route item
    correspondenceapi-->>correspondencewebapp: routed (due date set)
```