import createClient from "openapi-fetch";
import type { paths } from "./generated/correspondence-api";

// Same-origin: nginx proxies /api to the correspondence-api sibling
// (react-webapp's Same-origin API proxy). This app calls exactly one public,
// unauthenticated operation from that contract.
export const correspondenceApi = createClient<paths>({ baseUrl: "/api" });
