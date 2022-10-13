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
