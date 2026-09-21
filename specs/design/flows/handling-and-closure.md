# Handling and Closure

A Department Officer is notified of a newly assigned item, works it, records
a response, and closes it once resolved.

```mermaid
sequenceDiagram
    actor DepartmentOfficer as Department Officer
    participant correspondenceapi as correspondence-api
    participant emailservice as email-service
    participant smsservice as sms-service
    participant correspondenceweb as correspondence-web

    correspondenceapi->>emailservice: send assignment email
    correspondenceapi->>smsservice: send assignment SMS
    correspondenceapi->>correspondenceweb: in-app notification

    DepartmentOfficer->>correspondenceweb: open assigned item
    correspondenceweb->>correspondenceapi: get item
    DepartmentOfficer->>correspondenceweb: update status (in progress)
    correspondenceweb->>correspondenceapi: update status

    DepartmentOfficer->>correspondenceweb: record response + attachment
    correspondenceweb->>correspondenceapi: save response

    alt response recorded
        DepartmentOfficer->>correspondenceweb: close item
        correspondenceweb->>correspondenceapi: close item
        correspondenceapi-->>correspondenceweb: closed
    else no response yet
        correspondenceapi-->>correspondenceweb: refused (response required)
    end
```

