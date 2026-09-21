import { useEffect, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { handleCallback } from "../authz/session";

// The ONE registered redirect URI serves both the redirect leg and the silent
// renew's hidden iframe, so this route calls handleCallback() (signinCallback)
// which dispatches on request_type — never signinRedirectCallback(), which
// only finishes the redirect leg and leaves a silent renew waiting out its
// full timeout. Resolves to nothing: render from the promise SETTLING.
export function CallbackPage(): ReactElement {
  const navigate = useNavigate();

  useEffect(() => {
    let live = true;
    void handleCallback().finally(() => {
      if (live) navigate("/", { replace: true });
    });
    return () => {
      live = false;
    };
  }, [navigate]);

  return (
    <main>
      <p>Signing in…</p>
    </main>
  );
}
