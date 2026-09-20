# Escalation and Reassignment

A Supervisor monitors overall status, sees items flagged overdue, and
reassigns correspondence to rebalance or correct workload.

```mermaid
sequenceDiagram
    actor Supervisor
    participant correspondencewebapp as correspondence-webapp
    participant correspondenceapi as correspondence-api
    participant smsservice as sms-service

    correspondenceapi->>correspondenceapi: flag item overdue (past due date)
    correspondenceapi->>smsservice: send overdue alert

    Supervisor->>correspondencewebapp: open dashboard
    correspondencewebapp->>correspondenceapi: list correspondence (all)
    correspondenceapi-->>correspondencewebapp: items with status + overdue flag

    Supervisor->>correspondencewebapp: reassign item
    correspondencewebapp->>correspondenceapi: reassign department
    correspondenceapi-->>correspondencewebapp: reassigned (movement recorded)
```