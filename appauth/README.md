# @epfl-si/appauth

An unopinionated state machine for OpenID-Connect that wraps `@openid/appauth` in a browser-, developer- and GDPR-friendly way.

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
