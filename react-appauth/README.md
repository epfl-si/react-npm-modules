# @epfl-si/react-appauth

An unopinionated React binding for [@openid/appauth](https://www.npmjs.com/package/@openid/appauth).

## Feature Overview

- Browser-side OpenID-Connect implementation, meaning all the backend server has left to do is look up bearer tokens with the OIDC identity provider (IdP)
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
  - `useOpenIDConnectContext` React hook to consume “front-office” events (for the appearance of widgets such as the login button and the “hello, ${user}” widget)
  - Fully unmount-proof: when the `<OIDCContext>` unmounts or changes its props, pending token refresh timers get canceled and callbacks stop calling back.
- [Demo app](https://github.com/epfl-si/rails.starterkit)
  - ... With a Ruby back-end. But easy enough to set up with no prior knowledge
  - Comes with Keycloak-in-a-container, fully configured out of the box with test realm and user
- Tested with Keycloak (see above)

## How to Use

The various React components (“widgets”) discussed below must be placed within an `<OIDCContext>` near the top of your app, for instance:

```jsx

import { OIDCContext } from "@epfl-si/react-appauth";

export function App() {
  return <OIDCContext authServerUrl = { "http://localhost:8080/realm/myrealm/" }
               debug = { true }
               client = { { clientId: "myclient",
                            redirectUri: "http://localhost:3000/" } }
               onNewToken={({ token }) => setFetchHeader("Authorization", `Bearer ${token}`)}
               onLogout={() => setFetchHeader("Authorization", null)}>
      <LoginButton/>
      <TheRestOfMyApp/>
      </OIDCContext>;
}

function setFetchHeader (header, value) {
  // ... Integrate with your backend API code here
}

```

`@epfl-si/react-appauth` exports a ready-made `<LoginButton/>` React element, but you could just as well reimplement it like this:

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

If you would like a “hello, user” widget, you will find a couple of building parts in `src/sundry-widgets.tsx` that could come in handy. For instance:

```jsx

import { IfOIDCState, StateEnum, LoggedInUser } from "@epfl-si/react-appauth";

function HelloUser () {
  return <IfOIDCState is={ StateEnum.LoggedIn }>
    <p>Welcome, <LoggedInUser field="preferred_username" />!</p>
  </IfOIDCState>
}

```

But again, you could just implement it yourself out of `useOIDCContext`:

```jsx

function HelloUser () {
  const oidc = useOpenIDConnectContext();
  if (! oidc.idToken) return <></>;
  return <p>Welcome, { oidc.idToken.preferred_username! }</p>
}

```

## Reference manual

There, um, isn't one currently. But there is [some JSDoc in the source code](https://github.com/epfl-si/react-npm-modules/blob/master/react-appauth/src/OpenIDConnect.tsx).
