# manage-incoming-correspondence

WSO2 Labs Agentic Engineer project manage-incoming-correspondence

## Components

| Directory | Type | Purpose |
| --- | --- | --- |
| `correspondence-api` | service | Ballerina backend: intake, routing, handling, closure, admin, SLA aggregate |
| `correspondence-web` | web application | Internal workspace, Thunder SSO gated |
| `public-sla-dashboard` | web application | Public read-only SLA view |

### Component names are capped at 20 characters

OpenChoreo names a component's dataplane RenderedRelease
`{project}-{component}-{environment}` and copies that string into the
`openchoreo.dev/rendered-release-name` label on every resource it applies. A
Kubernetes label value cannot exceed 63 bytes, so for this project the budget is

```
63 - len("manage-incoming-correspondence-") - len("-development") = 20
```

A longer name is accepted everywhere and then fails at apply time with
`ResourceApplyFailed`, producing no Deployment, Service or HTTPRoute at all.
That is why the workspace is `correspondence-web` (18) and not
`correspondence-webapp` (21). `public-sla-dashboard` (20) is exactly at the
limit. Do not lengthen any of these names.
