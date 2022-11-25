/**
 * A mix of @link ./graphql-provider.ts and `@tanstack/react-query`
 */
import * as React from "react";
import { useRef, FC } from "react";
import { gql as gqlConstructor, Variables } from 'graphql-request';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useInfiniteQuery,
         UseInfiniteQueryOptions, UseInfiniteQueryResult } from "@tanstack/react-query";
import { GraphQLProvider, ContextProps as GraphQLProviderContextProps,
         useGraphQLClient } from "@epfl-si/react-graphql-simple";

type GQL = ReturnType<typeof gqlConstructor>;

export interface ContextProps extends GraphQLProviderContextProps {
  queryClient ?: QueryClient
}

/**
 * A convenient nesting of `<QueryClientProvider>...</QueryClientProvider>` and
 * `<GraphQLProvider>`...`</GraphQLProvider>`
 */
export const QueryClientGraphQLProvider : FC<ContextProps> =
  (props) =>
{
  const { current } = useRef({ queryClient: props.queryClient });
  if (! current.queryClient) current.queryClient = new QueryClient();
  return <GraphQLProvider {...props}>
    <QueryClientProvider client={current.queryClient}>
    {props.children}
    </QueryClientProvider>
    </GraphQLProvider>;
}

/**
 * A convenient mix of `useGraphQLClient` and `useInfiniteQuery`.
 */
export function useInfiniteGraphQLQuery<TQueryFnData = unknown,
                                        TError = unknown, TData = TQueryFnData>
  (gql: GQL, variables ?: Variables,
   opts ?: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryFnData>)
: UseInfiniteQueryResult<TData, TError> {
  if (variables && (opts === undefined) && looksLikeOptions(variables)) {
    opts = variables;
    variables = undefined;
  }
  if (! variables) variables = {};

  // Disable most bells and whistles by default:
  opts = {
    networkMode: 'always',  // 127.0.0.1 is a thing mmkay
    retry: false,
    refetchOnMount : false,
    refetchOnReconnect : false,
    refetchOnWindowFocus : false,
    ...opts
  };

  const clientPromise = useGraphQLClient();
  return useInfiniteQuery([gql, variables], async ({ pageParam = {} }) => {
    const client = await clientPromise;
    try {
      return client.request(gql, { ...variables, ...pageParam });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, opts);
}

function looksLikeOptions(someDict : { [key : string] : any}) {
  return Object.keys(someDict).map((k) => someDict[k]).some((f) => typeof(f) === "function");
}

interface RelayStylePaginationOptions {
  direction?: 'forward' | 'backward' | 'bidirectional'  // Default 'forward'
  cursorVariableName?: string                           // Default 'cursor'
}

export function relayStylePagination(opts ?: RelayStylePaginationOptions)
: UseInfiniteQueryOptions {
  let { direction, cursorVariableName } = opts || {};
  if (! direction) direction = 'forward';
  if (! cursorVariableName) cursorVariableName = 'cursor';

  const api : UseInfiniteQueryOptions = {};
  if (direction === 'forward' || direction === 'bidirectional') {
    api.getNextPageParam = (data : any) => {
      const endCursor = findPageInfo(data).endCursor;
      if (! endCursor) return undefined;
      let retval = {};
      retval[cursorVariableName] = endCursor;
      return retval;
    };
  }
  if (direction === 'backward' || direction === 'bidirectional') {
    api.getPreviousPageParam = (data : any) => {
      const startCursor = findPageInfo(data).startCursor;
      if (! startCursor) return undefined;
      let retval = {};
      retval[cursorVariableName] = startCursor;
      return retval;
    };
  }
  return api;
}

function findPageInfo (someDict: { [key : string] : any }) {
  if (someDict?.pageInfo) return someDict.pageInfo;

  const pageInfos : Array<any> = [];
  for (let k of Object.keys(someDict)) {
    const v = someDict[k];
    if (v && v.pageInfo) {
      pageInfos.push(v.pageInfo);
    }
  }
  if (pageInfos.length === 1) {
    return pageInfos[0];
  } else if (pageInfos.length === 0) {
    throw new Error("Unable to find `pageInfo` in first level of structure");
  } else {
    throw new Error("Found multiple `pageInfo`s in first level of structure");
  }
}
