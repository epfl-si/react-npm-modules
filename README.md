# @epfl-si/react-appauth

An unopinionated React binding for [@openid/appauth](https://www.npmjs.com/package/@openid/appauth).

## Feature Overview

- Browser-side OpenID-Connect implementation, meaning all the backend server has left to do is to validate the JWT bearer tokens
  - Redirects the browser to the authorization server for the login operation
  - When redirected back, consumes (and cleans out) the `code=`, `state=`, `error=` and `session_state=` parts from the URL bar, regardless of whether they are found before or after the hash mark and whether the login operation was successful
  - Obtains OAuth2 tokens [using `fetch`, not jQuery](https://github.com/openid/AppAuth-JS/issues/191#issuecomment-944210147)
  - Schedules access token refresh a few seconds before it expires
- Brings out the best in `@openid/appauth`'s underlying feature set
  - Uses the modern and secure [OAuth2 authorization code flow](https://darutk.medium.com/diagrams-of-all-the-openid-connect-flows-6968e3990660)
  - (Untested) Supports `extra` redirect parameters, to activate features such as user consent in authentication servers that support them
  - PKCE support
- **Supports cookie-less, local-storage-less operation**
  - This is in fact the default mode (unlike in `@openid/appauth`)
  - Obviously, this has a cost with respect to security: no `state=` validation, PKCE is disabled
- Straightforward, unopinionated React bindings
  - `<OIDCContext>` to pass in configuration and consume “back-office” events (i.e. access tokens)
  - `useOpenIDConnectContext` React hook to consume “front-office” events (for the appearance of widgets such as the login button)
    - *Planned feature*: ability to do same with the ID token (for the “hello, ${user}” widget)
  - Fully unmount-proof: when the `<OIDCContext>` unmounts or changes its props, pending token refresh timers get canceled and callbacks stop calling back.
- [Demo app](https://github.com/epfl-si/rails.starterkit)
  - ... With a Ruby back-end. But easy enough to set up with no prior knowledge
  - Comes with Keycloak-in-a-container, fully configured out of the box with test realm and user
- Tested with Keycloak (see above)

## How to Use

```jsx

import { OIDCContext } from "@epfl-si/react-appauth";

export function MyReactComponent() {
  return <OIDCContext authServer = { "http://localhost:8080/realm/myrealm/" }
               debug = { true }
               client = { { clientId: "myclient",
                            redirectUri: "http://localhost:3000/" } }
               onNewToken={({ token }) => setFetchHeader("Authorization", `Bearer ${token}`)}
               onLogout={() => setFetchHeader("Authorization", null)}>
      <LoginButton/>
      </OIDCContext>;
}

function setFetchHeader (header, value) {
  // ... Integrate with your backend API code here
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
