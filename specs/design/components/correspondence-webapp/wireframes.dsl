screen RegistryInbox "New and unrouted correspondence waiting to be routed"
  navbar "Correspondence" "Inbox -> RegistryInbox | Search -> Search"
  sidebar "Inbox -> RegistryInbox | Search -> Search | Departments -> DepartmentAdmin | Users -> UserAdmin"
  row
    heading "New Correspondence"
    right
    button "Log Physical Item" primary -> LogCorrespondence
  table "Sender | Category | Received | Source | Status" -> CorrespondenceDetail
    row "Jane Doe | Complaint | 2026-09-18 | Physical | New"
    row "Acme Corp | Petition | 2026-09-19 | Email | New"

screen LogCorrespondence "Log a physically received correspondence item"
  navbar "Correspondence" "Inbox -> RegistryInbox | Search -> Search"
  sidebar "Inbox -> RegistryInbox | Search -> Search | Departments -> DepartmentAdmin | Users -> UserAdmin"
  heading "Log Physical Correspondence"
  input "Sender name"
  select "Category"
  input "Scanned copy (upload)"
  row
    right
    button "Cancel" -> RegistryInbox
    button "Save" primary -> RegistryInbox

screen CorrespondenceDetail "A single correspondence item: status, route, respond, close, history"
  navbar "Correspondence" "Inbox -> RegistryInbox | Search -> Search"
  sidebar "Inbox -> RegistryInbox | Search -> Search | Departments -> DepartmentAdmin | Users -> UserAdmin"
  row
    heading "Complaint from Jane Doe"
    right
    badge "New"
  text "Received 2026-09-18 · Physical · Due 2026-09-25"
  card "Route"
    select "Department"
    button "Route" primary -> RegistryInbox
  card "Update Status"
    select "Status"
    button "Update Status" -> CorrespondenceDetail
  card "Response"
    textarea "Response note"
    input "Attachment (upload)"
    button "Save Response" -> CorrespondenceDetail
    button "Close Item" -> CorrespondenceDetail
  table "When | Action | From | To"
    row "2026-09-18 09:00 | Logged | - | -"
    row "2026-09-18 09:05 | Routed | - | Permits"

screen Search "Search and filter correspondence by sender, department, status, or date"
  navbar "Correspondence" "Inbox -> RegistryInbox | Search -> Search"
  sidebar "Inbox -> RegistryInbox | Search -> Search | Departments -> DepartmentAdmin | Users -> UserAdmin"
  heading "Search Correspondence"
  row
    search "Sender"
    select "Department"
    select "Status"
    input "Date"
  table "Sender | Category | Department | Status | Received" -> CorrespondenceDetail
    row "Jane Doe | Complaint | Permits | Routed | 2026-09-18"

screen MyDepartmentQueue "Correspondence assigned to the Department Officer's department"
  navbar "Correspondence" "My Queue -> MyDepartmentQueue"
  sidebar "My Queue -> MyDepartmentQueue"
  heading "My Department's Correspondence"
  table "Sender | Category | Received | Status | Due" -> CorrespondenceDetail
    row "Jane Doe | Complaint | 2026-09-18 | In Progress | 2026-09-25"
    row "Acme Corp | Petition | 2026-09-19 | Routed | 2026-09-26"

screen SupervisorDashboard "All correspondence across departments, with overdue items flagged"
  navbar "Correspondence" "Dashboard -> SupervisorDashboard"
  sidebar "Dashboard -> SupervisorDashboard"
  heading "Correspondence Dashboard"
  row
    card "Open Items | 128 | across 5 departments"
    card "Overdue | 6 | past due date"
  table "Sender | Department | Status | Due | Overdue" -> CorrespondenceDetail
    row "Jane Doe | Permits | In Progress | 2026-09-25 | No"
    row "River Assoc. | Licensing | Routed | 2026-09-15 | Yes"
  row
    right
    button "Reassign Selected" -> CorrespondenceDetail

screen DepartmentAdmin "Admin manages the department/unit directory and each department's mailbox"
  navbar "Correspondence" "Departments -> DepartmentAdmin | Users -> UserAdmin"
  sidebar "Departments -> DepartmentAdmin | Users -> UserAdmin"
  row
    heading "Departments"
    right
    button "New Department" primary -> DepartmentForm
  table "Name | Status | Default Turnaround | Mailbox" -> DepartmentForm
    row "Permits | Active | 10 days | permits@example.gov"
    row "Licensing | Active | 7 days | Organization default"

screen DepartmentForm "Create, rename, or configure a department's mailbox and turnaround"
  navbar "Correspondence" "Departments -> DepartmentAdmin | Users -> UserAdmin"
  sidebar "Departments -> DepartmentAdmin | Users -> UserAdmin"
  heading "Department"
  input "Name"
  input "Default turnaround (days)"
  input "Intake mailbox (optional — leave blank to use the organization default)"
  row
    right
    button "Deactivate" danger -> DepartmentAdmin
    button "Save" primary -> DepartmentAdmin

screen UserAdmin "Admin onboards a user into a department and role"
  navbar "Correspondence" "Departments -> DepartmentAdmin | Users -> UserAdmin"
  sidebar "Departments -> DepartmentAdmin | Users -> UserAdmin"
  row
    heading "Onboarded Users"
    right
    button "Onboard User" primary -> UserOnboardForm
  table "User | Department | Role"
    row "jane@example.gov | Permits | DepartmentOfficer"
    row "sam@example.gov | Licensing | RegistryOfficer"

screen UserOnboardForm "Assign a user to a department and role"
  navbar "Correspondence" "Departments -> DepartmentAdmin | Users -> UserAdmin"
  sidebar "Departments -> DepartmentAdmin | Users -> UserAdmin"
  heading "Onboard User"
  input "User (Thunder identity)"
  select "Department"
  select "Role"
  row
    right
    button "Cancel" -> UserAdmin
    button "Onboard" primary -> UserAdmin

flow "Log and route correspondence"
  role "Registry Officer"
  description "A Registry Officer logs a physical item and routes new items to a department"
  RegistryInbox
  LogCorrespondence
  CorrespondenceDetail
  Search

flow "Handle and close correspondence"
  role "Department Officer"
  description "A Department Officer works, responds to, and closes an assigned item"
  MyDepartmentQueue
  CorrespondenceDetail

flow "Monitor and reassign"
  role "Supervisor"
  description "A Supervisor monitors overdue items and reassigns correspondence"
  SupervisorDashboard
  CorrespondenceDetail
  Search

flow "Manage departments and onboard users"
  role "Admin"
  description "An Admin manages the department directory, its mailboxes, and onboards users"
  DepartmentAdmin
  DepartmentForm
  UserAdmin
  UserOnboardForm
