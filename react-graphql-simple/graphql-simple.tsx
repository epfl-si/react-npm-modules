/**
 * Authenticate (asynchronously) once, perform many GraphQL requests.
 */

import * as React from "react";
import { ReactNode, FC, createContext, useContext, useRef, useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { GraphQLClient, gql as gqlConstructor, Variables } from 'graphql-request';
import Resolvable from 'resolvable-promise';

type GQL = ReturnType<typeof gqlConstructor>;

type Context = () => PromiseLike<GraphQLClient>;

const context = createContext<Context>(
  () => new Promise((_resolve, reject) => reject(new Error("Please call useGraphQLRequest() from inside a <GraphQLProvider/> element"))));

/**
 * Allows your library code to await authentication before issuing GraphQL requests.
 *
 * It is possible, although clunky, to call this directly from a React
 * functional component. Consider using @link useGraphQLRequest
 * instead, which will save you the `useAsyncEffect` / `useRef`
 * hassle.
 *
 * This function must be (indirectly) called from a functional
 * component that is a descendant of a `<GraphQLProvider>`. The code
 * looks like this:
 *
 *   const client = await useGraphQLClient();
 */
export function useGraphQLClient() {
  return useContext<Context>(context)();
}

/**
 * Allows your functional React component to perform authenticated
 * GraphQL requests (either queries or mutations).
 *
 * This function must be called from a functional component that is a
 * descendant of a `<GraphQLProvider>`. The code looks like this:
 *
 *   const { loading, error, data, restart } = useGraphQLRequest(gql`...`, variables);
 */
export function useGraphQLRequest<T = any, V = Variables> (gql : GQL, variables ?: V[])
: { loading : boolean, error ?: Error, data ?: T, restart: () => void } {
  const clientPromise = useGraphQLClient();
  const [loading, setLoading] = useState<boolean>(true);
  const { current } = useRef<{ data?: T, error?: Error }>({});
  
  useAsyncEffect(async (isStillLive) => {
    if (! loading) return;    // Load once, wait for restart
    const client = await clientPromise;
    try {
      current.data = await client.request(gql, variables);
    } catch (e) {
      current.error = e;
    }
    if (isStillLive()) {
      setLoading(false);
       // Will cause the calling component to repaint, which means it
       // should call us again to obtain `data` and `error`
    }
  });
  return { loading, restart() { setLoading(false) }, ...current };
}

export interface ContextProps {
  endpoint: string;
  authentication?: {
    bearer: () => string|undefined;
  };
  children?: ReactNode;
}

/**
 * Provider for `useGraphQLClient` and `useGraphQLRequest`.
 *
 * Wrap your entire app in a `<GraphQLProvider>` so that bearer-token
 * authentication is dealt with in a single point in your code.
 */
export const GraphQLProvider : FC<ContextProps> =
  ({ endpoint, authentication, children }) => {

    type AuthRef = {
      authenticated: Resolvable<GraphQLClient>;
      client: GraphQLClient;
      accessToken ?: string;
    }
    const { current } = useRef<AuthRef>({
      authenticated: new Resolvable<GraphQLClient>(),
      client: new GraphQLClient(endpoint, { headers })
    });
    function headers() {
      if (current.accessToken) {
        return { authorization: `Bearer ${current.accessToken}` };
      } else {
        return {};
      }
    }

    if (! authentication?.bearer) {
      // 🎸 🎵 We do need no authentication... 🎶
      current.authenticated.resolve(current.client);
    } else {
      const accessToken = authentication.bearer();  // Might call a React useSomethingSomething() hook
      if (accessToken) {
        current.accessToken = accessToken;
        current.authenticated.resolve(current.client);
      }
    }

    return <context.Provider value={ () => current.authenticated }>{children}</context.Provider>;
};
