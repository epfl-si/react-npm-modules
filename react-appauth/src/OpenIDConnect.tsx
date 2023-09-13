/**
 * OpenID-Connect state machine as a React context
 */
import * as React from "react";
import { ReactNode, FC, useState, useRef, createContext, useContext } from "react";
import { useAsyncEffect } from "use-async-effect";
import { useTimeout } from "./use_hooks";
import { OpenIDConnect, OpenIDConnectConfig, IdToken } from '@epfl-si/appauth';

export interface ContextProps extends OpenIDConnectConfig {
  onNewToken?: (token: string) => void;
  onLogout?: () => void;
  onInitialAuthComplete?: () => void;
  minValiditySeconds?: number;
  children?: ReactNode;
}

export enum StateEnum {
  LoggedOut = 0,
  InProgress = 1,
  LoggedIn = 2,
  Error = 3
};

let _HACK_KEEP_THIS_JSDOC = 1;

/**
 * @typedef {Object} State
 * The things that `useOpenIDConnectContext` returns.
 *
 * @property { StateEnum } state - One of the `StateEnum` constants, indicating current logged-in status
 * @property { string } error - The last error encountered by `@epfl-si/react-appauth`, as an english-language string
 * @property { Function } login - Call this function to start the login process now
 * @property { Function } logout - Call this function to start the logout process now
 * @property { string } accessToken - The last known OIDC access token (to send to the backend server), or undefined
 *                     if we are currently logged out
 * @property { Object } idToken - The decoded JWT ID token
 */
_HACK_KEEP_THIS_JSDOC = _HACK_KEEP_THIS_JSDOC * 1;

export interface State {
  state: StateEnum;
  error?: string;
  login: () => void;
  logout: () => void;
  accessToken?: string;
  idToken?: IdToken;
}

const context = createContext<State>({
  state: StateEnum.LoggedOut,
  login: () => {},
  logout: () => {}
});

/**
 * OpenID-Connect state machine as a React context.
 *
 * Perform the operations dictated by the OpenID-Connect specification
 * once at the time the component is created, so as to determine
 * logged-in or logged-out status on behalf of {@link
 * useOpenIDConnectContext}. Said operations consist of the following
 * steps:
 *
 * - consume any OpenID-Connect credentials out
 *   of the browser URL bar (`code=`, `state=`, `error=` and
 *   `session_state=`), regardless of whether they are found in the
 *   “query” or “fragment” part
 * - redeem these OpenID-Connect credentials with the authorization
 *   server, in exchange for an authorization token and (optionally) an
 *   ID token
 * - communicate the success or failure of the previous steps through
 *   the `onInitialAuthComplete` callback and either the `onNewToken`
 *   or the `onLogout` callback
 * - arrange for timely token renewal
 *
 * This is a React context, meaning that one may use the matching
 * {@link useOpenIDConnectContext} React hook to consume the
 * authentication state from any descendant component.
 *
 * Note that contrary to a “typical” React component, an
 * `<OIDCContext>` does *not* destroy its state when its props change
 * (even “important” props like `authServerUrl`), as doing so would
 * typically result in logging the user out. If you do want that to
 * happen, you must arrange to call
 * `useOpenIDConnectContext().logout()` by yourself.
 */
export const OIDCContext : FC<ContextProps> =
  ({ debug, authServerUrl, client, storage,
     minValiditySeconds, onNewToken, onLogout, onInitialAuthComplete,
   children }) => {
  if (! minValiditySeconds) minValiditySeconds = 5;

  const [inProgress, setInProgress_] = useState<boolean>(true);
  function setInProgress (newValue : boolean) : void {
    setInProgress_(newValue);
    if (onInitialAuthComplete && newValue === false) {
      onInitialAuthComplete();
      onInitialAuthComplete = undefined;
    }
  }
  const [error, setLastError] = useState<string>();
  const [accessToken, setAccessToken] = useState<string>();
  const [idToken, setIdToken] = useState<IdToken>();

  const oidcActions = useRef<{login: () => void, logout: () => Promise<void>}>();
  const renew = useTimeout();

  useAsyncEffect(async (isActive) => {
    const oidc = new OpenIDConnect(
      { debug, client, authServerUrl, storage, minValiditySeconds },
      { setTimeout: renew.start, clearTimeout: renew.stop });
    oidcActions.current = oidc;

    function onChangeToken (accessToken: string) {
      if (! isActive()) {
        // Too late! React doesn't care anymore.
        return;
      }
      setAccessToken(accessToken);
      if (accessToken === undefined) {
        if (onLogout) onLogout();
      } else {
        setLastError(undefined);
        if (onNewToken) onNewToken(accessToken);
      }
    }

    function onError (error : Error|string) {
      console.error(error);
      if (! isActive()) return;
      setLastError(`${error}`);
    }

    function onIdToken (_ : string, decodedIdToken: IdToken) {
      setIdToken(decodedIdToken);
    }

    await oidc.run({
      accessToken: onChangeToken,
      idToken: onIdToken,
      logout: () => onChangeToken(undefined),
      error: onError
    });
    setInProgress(false);
  },
                 // We *do not* want the `useAsyncEffect` callback above
                 // to re-run willy-nilly, as that will cause the OpenID
                 // process to start over i.e. the user will typically
                 // be logged out. See the OIDCContext docstring, above:
                 []);

  const state = error !== undefined ? StateEnum.Error :
            inProgress ? StateEnum.InProgress :
            accessToken === undefined ? StateEnum.LoggedOut :
                 StateEnum.LoggedIn;

  return <context.Provider value={
    { state,
      error,
      accessToken,
      idToken,
      login() { oidcActions.current && oidcActions.current.login(); },
      async logout() {
        setInProgress(true);
        oidcActions.current && await oidcActions.current.logout();
        setInProgress(false);
      },
    }
  }>{children}</context.Provider>
}

/**
 * React hook to consume the state of the ancestor `<OIDCContext>`.
 *
 * Call this function from a React functional component that has an
 * `<OIDCContext>` as the ancestor (otherwise a dummy, invariable
 * state will be returned). The return value, `state`, is a `State`
 * object containing data indicating whether we are logged in
 * (`state.state`, `state.error`) and who is logged in
 * (`state.idToken`); as well as actuator methods that your UI (e.g.
 * your login button's `onClick`) might want to call (`state.login()`
 * and `state.logout()`).
 *
 * @function useOpenIDConnectContext
 */
export function useOpenIDConnectContext () {
  return useContext<State>(context);
}
