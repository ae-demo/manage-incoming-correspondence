import type { components } from "../generated/correspondence-api";

export type Correspondence = components["schemas"]["Correspondence"];
export type Movement = components["schemas"]["Movement"];

/** The organization's fixed intake categories — correspondence-api leaves
 *  `category` free-text, but every wireframe screen drives it from a picker. */
export const CATEGORIES = ["Complaint", "Petition", "Inquiry", "Permit Request", "Other"] as const;

export const STATUS_LABEL: Record<Correspondence["status"], string> = {
  new: "New",
  routed: "Routed",
  "in-progress": "In Progress",
  responded: "Responded",
  closed: "Closed",
};

export function statusColor(
  status: Correspondence["status"],
): "default" | "info" | "warning" | "success" {
  switch (status) {
    case "new":
      return "info";
    case "routed":
    case "in-progress":
      return "warning";
    case "responded":
    case "closed":
      return "success";
    default:
      return "default";
  }
}

/** The statuses a Department Officer may move an item to from Update Status. */
export const UPDATABLE_STATUSES: Array<Correspondence["status"]> = ["in-progress", "responded", "closed"];
