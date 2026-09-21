# Admin Onboarding

An Admin manages the department directory — including each department's
intake mailbox — and onboards users into a department and role.

```mermaid
sequenceDiagram
    actor Admin
    participant correspondenceweb as correspondence-web
    participant correspondenceapi as correspondence-api

    Admin->>correspondenceweb: create department
    correspondenceweb->>correspondenceapi: create department
    Admin->>correspondenceweb: configure department mailbox
    correspondenceweb->>correspondenceapi: set mailbox config

    Admin->>correspondenceweb: onboard user
    correspondenceweb->>correspondenceapi: assign user to department + role
    correspondenceapi-->>correspondenceweb: onboarded

    alt department deactivated
        Admin->>correspondenceweb: deactivate department
        correspondenceweb->>correspondenceapi: deactivate department
        correspondenceapi-->>correspondenceweb: removed from routing options
    end
```

