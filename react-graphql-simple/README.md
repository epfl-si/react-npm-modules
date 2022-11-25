# `@epfl-si/react-graphql-simple`

A nothing-up-our-sleeves binding for [`graphql-request`](https://www.npmjs.com/package/graphql-request) in a React application.

- Optionally provides authentication (only with bearer tokens for now); when using this feature, GraphQL requests are delayed until login is successful.

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

## Perform GraphQL requests within the context

The `<GraphQLProvider>` component provides a [React context](https://reactjs.org/docs/context.html), meaning that within its children elements, any component may call `useGraphQLRequest` to perform GraphQL requests (either queries or mutations) against the configured endpoint with the configured authentication. `useGraphQLRequest` is implemented in terms of [`graphql-request`](https://www.npmjs.com/package/graphql-request) with no frills, caches, cache models, abstractions, bells or whistles.

Here is an example React component that initiates a GraphQL query as soon as that is possible (i.e. as soon as the component is mounted *and* the first authentication token is available, if bearer authentication was configured):

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
