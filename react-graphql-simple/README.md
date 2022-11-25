# `@epfl-si/react-graphql-simple`

A nothing-up-our-sleeves binding for [`graphql-request`](https://www.npmjs.com/package/graphql-request) in a React application.

- No frills, cache, cache model, auto-reload, bells or whistles — The request starts as soon as your component calls the function that `useGraphQLRequest` returns, and is never retried unless and until you `restart()` it.
- (therefore) Works indifferently for GraphQL queries and mutations.
- Optionally provides authentication (only bearer tokens are supported for now); when using this feature, GraphQL requests will be delayed until the first authentication token is received.
- If you want more (i.e. pagination and infinite queries), see [`@epfl-si/react-graphql-paginated`](https://www.npmjs.com/package/@epfl-si/react-graphql-paginated).

## Provide a GraphQL context

The `<GraphQLProvider>` React component takes a GraphQL endpoint URL and an optional authentication mechanism as parameters.

Here is an example where the authentication part is handled using [`@epfl-si/react-appauth`](https://www.npmjs.com/@epfl-si/react-appauth):

```tsx

import { OIDCContext, useOpenIDConnectContext } from "@epfl-si/react-appauth";
import { GraphQLProvider } from "@epfl-si/react-graphql-simple";

function App() {
      const oidcContextProps = { authServerUrl, ... }

      return <OIDCContext { ...oidcContextProps }>
        <GraphQLProvider endpoint="/graphql" authentication={
          { bearer: () => useOpenIDConnectContext().accessToken }
        }>
          <MoreComponentsForYourApp/>
        </GraphQLProvider>
      </OIDCContext>
}
```

## Perform GraphQL requests from within the context

The `<GraphQLProvider>` component provides a [React context](https://reactjs.org/docs/context.html), meaning that within its children elements, any component may call `useGraphQLRequest` to perform GraphQL requests against the configured endpoint and wielding credentials from the configured authentication (if any).

Except for the part where it waits for authentication to succeed before sending the request, `useGraphQLRequest` is implemented in terms of plain [`graphql-request`](https://www.npmjs.com/package/graphql-request) with no further ado.

Here is an example of a functional React component that calls `useGraphQLRequest`:

```tsx
import * as React from "react";
import { gql } from 'graphql-request';
import { useGraphQLRequest } from '@epfl-si/react-graphql-simple';

type Item = { id : number, title : string, description : string };

export function MyGraphQLCapableComponent() {
 const { loading, data, error } = useGraphQLRequest<{ items: Item[] }>(gql`
{
  items {
     id
     title
     description
  }
}`);

    if (loading) return <Throbber/>;
    if (error) return <p className="error">{error.toString()}</p>;
    return <>{ items.map((item) => <p className="item">{item.title}</p>) }</>;
}
```
