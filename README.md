# @epfl-si/react-appauth

An unopinionated React binding for [@openid/appauth](https://www.npmjs.com/package/@openid/appauth)

## Feature Overview

- Browser-side OpenID-Connect implementation for all OAuth2 steps until the browser holds the access and renew tokens
- Supports cookie-less, local-storage-less operation (this is in fact the default)
- OAuth2 connect flow
  - Redirects (navigates) to authentication server
  - After being redirected back, consumes and cleans out `code=`, `state=`, `error=` and `session_state=` from URL bar
  - Obtain OAuth2 tokens [using `fetch`, not jQuery](https://github.com/openid/AppAuth-JS/issues/191#issuecomment-944210147)
  - (Untested, currently stubbed-out) support for PKCE
- [Demo app](https://github.com/epfl-si/rails.starterkit) with
  - Hermetic Keycloak-in-a-Docker-compose
  - Ruby back-end (but painless enough — It doesn't insist on installing gems globally)
- Tested with Keycloak (see above)

## How to use

```jsx

import { OIDCContext } from "@epfl-si/react-appauth";

export function MyReactComponent() {
  return <OIDCContext authServer = { "http://localhost:8080/realm/myrealm/" }
               debug = { true }
               client = { { clientId: "myclient",
                            redirectUri: "http://localhost:3000/" } }
               onNewToken={({ token }) => setGraphQLHeader("Authorization", `Bearer ${token}`)}
               onLogout={() => setGraphQLHeader("Authorization", null)}>
      <LoginButton/>
      </OIDCContext>;
}
```

You could write `<LoginButton/>` like this:

```jsx
import { useOpenIDConnectContext, StateEnum as OIDCState } from "@epfl-si/react-appauth";

export function LoginButton () {
  const oidc = useOpenIDConnectContext();

  if (oidc.state === OIDCState.InProgress) {
    return <button title="Please wait..." disabled>⌛</button>;
  }

  const loggedIn = oidc.state === OIDCState.LoggedIn,
  action = loggedIn ? "Logout" : "Login",
  label = (oidc.error === undefined) ? action : [action, <sup>⚠</sup>],
  tooltip = oidc.error             ? `${oidc.error}` :
    loggedIn ? "Log out" : "Log in with OpenID-Connect";

  function onClick() {
    if (loggedIn) {
      oidc.logout();
    } else {
      oidc.login();
    }
  }

    return <button title={tooltip} onClick={onClick}>{label}</button>;
}
```

## Reference manual

There, um, isn't one currently. But there is [some JSDoc in the source code](./src/OpenIDConnect.tsx).
