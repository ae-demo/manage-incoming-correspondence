# correspondence-web

The internal workspace: logging and routing incoming correspondence, working
assigned items, the supervisor dashboard, and department/user administration.
Signs in through Thunder; nothing here is reachable unauthenticated.

Roles and what they see are derived from `specs/design/security.json`; the
generated map lives in `mock/authz/roles.gen.ts`.

## Why this directory is not `correspondence-webapp`

The component name is part of the Kubernetes label OpenChoreo stamps on every
resource it applies (`openchoreo.dev/rendered-release-name`, which holds
`{project}-{component}-{environment}`). Label values cap at 63 bytes, and
`manage-incoming-correspondence-correspondence-webapp-development` is 64 — one
byte over, which made the deployment fail with `ResourceApplyFailed` and
produced no Deployment, Service or HTTPRoute at all.

`correspondence-web` is 18 characters and renders to 61. Renaming this
directory or the `name` in `workload.yaml` to anything longer than 20
characters will break deployment again.
