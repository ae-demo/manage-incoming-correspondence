import { useEffect, useState } from "react";
import { correspondenceApi } from "../api";
import type { components } from "../generated/correspondence-api";

export type Department = components["schemas"]["Department"];

export interface DepartmentsState {
  /** Every department the caller may see. */
  readonly departments: readonly Department[];
  /**
   * Active departments only — the set any routing/reassignment picker must
   * use. A deactivated department stays visible in `departments` (its past
   * items still name it) but never appears here.
   */
  readonly active: readonly Department[];
  readonly byId: ReadonlyMap<string, Department>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
}

/** GET /departments — held by every role in security.json, so this is safe
 *  to call from any screen that needs a department name or a picker. */
export function useDepartments(): DepartmentsState {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    correspondenceApi
      .GET("/departments", { params: { query: { limit: 100 } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError || !data) {
          setError("Could not load departments.");
          return;
        }
        setDepartments(data.data);
      })
      .catch(() => {
        if (live) setError("Could not load departments.");
      });
    return () => {
      live = false;
    };
  }, [generation]);

  const list = departments ?? [];
  return {
    departments: list,
    active: list.filter((d) => d.status === "active"),
    byId: new Map(list.map((d) => [d.id, d])),
    loading: departments === null && error === null,
    error,
    reload: () => setGeneration((g) => g + 1),
  };
}
