# `@epfl-si/react-graphql-paginated`

Like [`@epfl-si/react-graphql-simple`](https://www.npmjs.com/package/@epfl-si/react-graphql-simple), but with an extra helping of [`@tanstack/react-query`](https://tanstack.com/query/v4) for `useInfiniteQuery` goodness.

- For now, only [relay-style pagination](https://dev.to/mandiwise/graphql-pagination-primer-offset-vs-cursor-vs-relay-style-pagination-1a60) is provided - Meaning that your GraphQL server must support it.

## Provide a GraphQL context

The `<QueryClientGraphQLProvider>` React component is a mix of [`@tanstack/react-query`](https://tanstack.com/query/v4)'s `<QueryProvider>` and [`@epfl-si/react-graphql-simple`](https://www.npmjs.com/package/@epfl-si/react-graphql-simple)'s `<GraphQLProvider>`:

```tsx

import { OIDCContext, useOpenIDConnectContext } from "@epfl-si/react-appauth";
import { QueryClientGraphQLProvider } from "@epfl-si/react-graphql-paginated";

function App() {
      const oidcContextProps = { authServerUrl, ... }

      return <OIDCContext { ...oidcContextProps }>
        <QueryClientGraphQLProvider endpoint="/graphql" authentication={
          { bearer: () => useOpenIDConnectContext().accessToken }
        }>
          <MoreComponentsForYourApp/>
        </QueryClientGraphQLProvider>
      </OIDCContext>
}
```

## Perform GraphQL requests within the context

A `<QueryClientGraphQLProvider>` component works just the same as a `<GraphQLProvider>` component; in particular, one can call `@epfl-si/react-graphql-simple`'s `useGraphQLRequest` from within it. Additionally, the `useInfiniteGraphQLQuery` React hook may be called from within its children elements:

```tsx
import * as React from "react";
import { gql } from 'graphql-request';
import { useInfiniteGraphQLQuery } from '@epfl-si/react-graphql-paginated';

type Item = { id : number, title : string, description : string };

export function InfiniteItemList() {
  const { data,
          error,
          isFetching,
          hasNextPage,
          fetchNextPage,
          isFetchingNextPage
        } = useInfiniteGraphQLQuery<{ items: { nodes: Item[] } }>(gql`
query Items ($cursor : String) {
  items(first: 10, after : $cursor) {
    nodes {
     id
     title
     description
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}`, relayStylePagination());

  if (isFetching && !isFetchingNextPage) return <Throbber/>;
  if (error) return <p>{error.toString()}</p>;

  return <div><>{(data?.pages || []).map((page) => (
    // Use React keys to prevent excessive DOM destruction / creation
    // (which would also cause your page to scroll back up all the time):
    <React.Fragment key={page.items.nodes[0]?.id}>
      {page.items.nodes.map((item) =>
        <p key={item.id}>{item.title}</p>)}
    </React.Fragment>
  ))}</>
  <button onclick={ () => fetchNextPage }>Moar</button>
  </div>;
```

💡 Instead of (or in addition to) the clickable `<button>` at the end, one could attach a [`react-intersection-observer`](https://www.npmjs.com/package/react-intersection-observer) to a DOM element situated at the end of the list, so that `fetchNextPage()` is called automatically as soon as said DOM element becomes visible within the browser viewport. This would deliver infinite scrolling for your `useInfiniteGraphQLQuery`.
