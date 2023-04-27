## 0.8.0

## 0.9.0

### Minor Changes

- Make `requestUri` optional

  This lets applications keep their URI through the login process, provided the OIDC authorization server is OK with that. (For Keycloak: Clients → your client → Settings → Valid Redirect URIs should end with `*`)

## 0.8.2

### Patch Changes

- Fix typing problem: `onInitialAuthComplete` is optional

## 0.8.1

### Patch Changes

- Documentation updates

### Minor Changes

- Parse ID token (not access token) with JWT

## Version 0.7.0 - 2022-10-21

- `useOpenIDConnectContext` return value now has a `.accessToken` field
- New dependency on [`resolvable-promise`](https://www.npmjs.com/package/resolvable-promise)

## Version 0.6.0 - 2022-10-21

- Crude ability to mute the `console.log` stream of `@openid/appauth`

## Version 0.5.1 - 2022-10-13

- Correct the TS type of “a bunch of React nodes”, used in various places

## Version 0.5.0 - 2022-10-13

- Introduce sundry React widgets such as `<LoginButton/>` and `<IfOIDCState is={ StateEnum.LoggedIn }>...</IfOIDCState>`

## Version 0.4.1 - 2022-10-12

- Bugfix: missing `import * as React from "react";` in a `.tsx` file

## Version 0.4.0 - 2022-10-12

- `onNewToken` now takes a plain string as its sole parameter

## Version 0.3.0 - 2022-10-12

- Rename `authServer` prop of `<OIDCContext>` to `authServerUrl`, discarding the old name

## Version 0.2.2 - 2022-10-12

- Fix: support multiple children to the `<OIDCContext>` React element (for real this time)

## Version 0.2.1 - 2022-10-11

- Fix: support multiple children to the `<OIDCContext>` React element

## Version 0.2.0 - 2022-10-11

- PKCE support
- Ability to consume the (parsed) ID token in the React UI (e.g. for the “hello, ${user}!” widget)

## Version 0.1.6 - 2022-10-11

- Make this package useable from non-TypeScript projects
- Stop shipping source code as part of the npm package
- Correct usage of the `core-js` polyfill library
- Fix harmless TypeScript warnings about JSX
- Touch up documentation

## Version 0.1.5 - 2022-10-10

- Earn the TypeScript sticker

## Version 0.1.4 - 2022-10-10

- Add README.md

## Version 0.1.3 - 2022-10-10

- Fix more dependencies
- Fix warning at `yarn add` time about `@babel/polyfill` being deprecated

## Version 0.1.2 - 2022-10-10

- Rename `Context` to `OIDCContext`
- Add `index.ts`

## Version 0.1.1 - 2022-10-10

- Remove `yarn.lock` from source control
- Fix run-time dependencies

## Version 0.1.0 - 2022-10-10

- Initial release
