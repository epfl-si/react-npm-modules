/**
 * OpenID-Connect state machine as a React context
 */
import { AuthorizationNotifier, RedirectRequestHandler,
         AuthorizationRequest, AuthorizationError,
         BaseTokenRequestHandler, TokenRequest,
         FetchRequestor,
         GRANT_TYPE_AUTHORIZATION_CODE, GRANT_TYPE_REFRESH_TOKEN,
         AuthorizationServiceConfiguration, TokenResponse,
         RevokeTokenRequest,
         LocalStorageBackend, StorageBackend, UnderlyingStorage,
         BasicQueryStringUtils, LocationLike } from "@openid/appauth";
import { FC, useState, useRef, createContext, useContext } from "react";
import { useAsyncEffect } from "use-async-effect";
import { useTimeout } from "./use_hooks";

export interface ContextProps extends OpenIDConnectConfig {
  onNewToken?: (opts : {token: string}) => void;
  onLogout?: () => void;
  minValiditySeconds?: number;
  children: JSX.Element;
}

/**
 * The set of information that the client (browser) will send to the
 * OIDC authentication server upon initiation of the OpenID-connect
 * machinery.
 */
export interface ClientConfig {
  /** The name the client is registered as in the OIDC authentication server */
  clientId: string;
  /** A secret that identifies this particular client to the authentication server. */
  clientSecret ?: string;
  /** The URI that the authentication server should redirect to upon successful authentication */
  redirectUri: string;
  /**
   * A keyword or space-separated list of keywords, designating the
   * set of informations that the resource server will want to know
   * about the user. The default value is “openid”.
   */
  scope?: string;
  /**
   * Any nonstandard configuration parameter to tweak the
   * authentication server's behavior. Depending on the server's
   * implementation details, suitable keys could include e.g.
   * `consent` or `access_type`.
   */
  extras?: { [k : string] : any };
}

export enum StateEnum {
  LoggedOut = 0,
  InProgress = 1,
  LoggedIn = 2,
  Error = 3
};

interface State {
  state: StateEnum;
  error?: string;
  login: () => void;
  logout: () => void;
}

const context = createContext<State>({
  state: StateEnum.LoggedOut,
  login: () => {},
  logout: () => {}
});

export const Context : FC<ContextProps> =
  ({ debug, authServer, client, storage,
     minValiditySeconds, onNewToken, onLogout, children }) => {
  if (! minValiditySeconds) minValiditySeconds = 5;

  const [inProgress, setInProgress] = useState<boolean>(true);
  const [error, setLastError] = useState<string>();
  const [token, setToken] = useState<string>();

  const oidcActions = useRef<{login: () => void, logout: () => Promise<void>}>();
  const renew = useTimeout();

  useAsyncEffect (async (isActive) => {
    const oidc = new OpenIDConnect(
      { debug, client, authServer, storage, minValiditySeconds },
      { setTimeout: renew.start, clearTimeout: renew.stop });
    oidcActions.current = oidc;

    function onChangeToken (token: string) {
      if (! isActive()) {
        // Too late! React doesn't care anymore.
        return;
      }
      setToken(token);
      if (token === undefined) {
        if (onLogout) onLogout();
      } else {
        setLastError(undefined);
        if (onNewToken) onNewToken({token});
      }
    }

    function onError (error : Error|string) {
      console.error(error);
      if (! isActive()) return;
      setLastError(`${error}`);
    }

    await oidc.run({auth: onChangeToken, error: onError});
    setInProgress(false);
  }, [client, authServer, minValiditySeconds]);

  const state = error !== undefined ? StateEnum.Error :
            inProgress ? StateEnum.InProgress :
            token === undefined ? StateEnum.LoggedOut :
                 StateEnum.LoggedIn;

  return <context.Provider value={
    { state,
      error,
      login() { oidcActions.current && oidcActions.current.login(); },
      async logout() {
        setInProgress(true);
        oidcActions.current && await oidcActions.current.logout();
        setInProgress(false);
      },
    }
  }>{children}</context.Provider>
}

export function useOpenIDConnectContext () {
  return useContext<State>(context);
}

interface Callbacks {
  /**
   * The callback that informs the caller when a new OAuth2
   * authentication token becomes available. You might want to set
   * `Authentication: Bearer ${token}` in your future API calls.
   *
   *  `token` being `undefined` means that a previous call to the
   *  `logout` method just succeeded.
   */
  auth: (token: string|undefined) => void;
  error: (error: Error|string) => void;
}

interface OpenIDConnectConfig {
  authServer: string;
  client: ClientConfig;
  debug?: boolean;
  storage?: StorageBackend;
  /**
   * If set, enable automatic renewal
   */
  minValiditySeconds?: number;
}

/**
 * Used to inject your frameworky setTimeout / clearTimeout surrogates.
 */
interface InjectTimeoutAPI<InjectedTimeoutHandleT> {
  setTimeout: (callback: () => void, millis: number) => InjectedTimeoutHandleT
  clearTimeout: (timeoutHandle: InjectedTimeoutHandleT) => void
}

/**
 * React-free state machine.
 */
class OpenIDConnect<InjectedTimeoutHandleT> {
  private authServer : string;
  private client : ClientConfig;
  private storage : StorageBackend;
  private fakeStore ?: FakeOAuth2Store;
  private debug : boolean;
  private minValiditySeconds : number | undefined;
  private timeouts: InjectTimeoutAPI<InjectedTimeoutHandleT>;
  private timeout: InjectedTimeoutHandleT | undefined;

  constructor({ authServer, client, storage,
                 debug, minValiditySeconds } : OpenIDConnectConfig,
              timeouts: InjectTimeoutAPI<InjectedTimeoutHandleT>) {
    this.authServer = authServer;
    this.client = client;
    if (storage) {
      this.storage = storage;
    } else {
      // Sighh. The OAuth2 designers obviously think that the `state`
      // and the PKCE `code_verifier` should be in some redirect-proof
      // store, which is fine (in the US), I guess. And then the
      // @openid/appauth guys are like oh, we'll implement OAuth2 with
      // all the bells and whistles, and too bad for users whose
      // regulatory authorities would rather make it so nobody uses
      // browser local storage ever. And here we are to bridge the
      // gap.
      this.fakeStore = new FakeOAuth2Store(window.location);
      this.storage = new LocalStorageBackend(this.fakeStore);
    }
    this.debug = debug;
    this.minValiditySeconds = minValiditySeconds;
    this.timeouts = timeouts;
  }

  private whenConfigured : ResolvablePromise<AuthorizationServiceConfiguration> = new ResolvablePromise();
  private callbacks : Callbacks;
  /**
   * Start the token fetch and renewal process. Awaits the first
   * successful token event if we are currently logged in. That is, if
   * (and only if) `run` is about to return `true`, `callbacks.auth`
   * will be called once before it returns.
   *
   * Additionally, if a `minValiditySeconds` parameter was passed at
   * construction time, schedule automatic token renewal this many
   * seconds before the `expiresInSeconds()` deadline.
   *
   * @returns true if the user is currently logged in; false if
   * not.
   */
  public async run (callbacks: Callbacks) : Promise<boolean> {
    this.callbacks = callbacks;
    try {
      // Start the process to fetch OIDC configuration from the
      // well-known endpoint, even if it turns out that we are not
      // currently logged in - This is to speed up `login()` later.
      AuthorizationServiceConfiguration.fetchFromIssuer(
        this.authServer.replace(/\/+$/, ""),
        new FetchRequestor()
      ).then((config) => {
        this.whenConfigured.resolve(config);
      }).catch((error) => {
        this.callbacks.error(error);
      });

      const code = await this.consumeOAuth22CodeFromBrowserLocation();
      if (! code) return false;

      const { accessToken, refreshToken } = await this.obtainTokens(code);
      this.callbacks.auth(accessToken);

      if (refreshToken) {
        this.scheduleRenewal();
      }

      return true;
    } catch(e) {
      this.callbacks.error(e);
    }
  }

  /**
   * Consume the OAuth2 code if one is present in the browser URL.
   *
   * If we are back from the authentication server with `?code=`,
   * `&state=` and/or `&error=` credentials / error info in the query
   * parameters, then complete the authentication process and return
   * it (`?code=` case) or throw an error (`&error=` case). If not,
   * return undefined.
   *
   * In both cases, remove all four `code=`, `state=`, `error=` and `session_state=`
   * parts from the browser's URL bar.
   *
   * @returns The OAuth2 code (which is not a “token” because it is
   * use-once, for-our-eyes-only), or undefined if there isn't one.
   */
  private async consumeOAuth22CodeFromBrowserLocation () : Promise<string | undefined> {
    const parser = new SmarterQueryStringUtils();
    const notifier = new AuthorizationNotifier();
    const authorizationHandler = new RedirectRequestHandler(this.storage, parser, window.location)
      .setAuthorizationNotifier(notifier);

    let code : string|undefined,
        error: AuthorizationError|undefined;


    notifier.setAuthorizationListener((_request, response, error_string) => {
      if (response) {
        code = response.code;
      } else {
        error = error_string;
      }
    });

    await authorizationHandler.completeAuthorizationRequestIfPossible();
    window.history.replaceState(window.history.state, null, parser.getRemainder(window.location));
    if (code) {
      return code;
    } else if (error) {
      throw error;
    } else {
      return undefined;
    }
  }

  private refreshToken : string;
  private accessTokenExpiresEpoch : number;
  /**
   * Obtain OAuth2 tokens.
   *
   * If an access token is obtained, parse its JWT state (without
   * checking the signature) and update `this.tokenExpiresEpoch`
   * before completing the promise. If a refresh token is obtained,
   * update `this.refreshToken` before completing the promise.
   *
   * @param initialOauth2code The OAuth2 code that was on the
   *                          browser's URL after getting redirected
   *                          back from the authentication server. If
   *                          none is passed, attempt to perform a
   *                          refresh using `this.refreshToken`
   *                          instead.
   */
  private async obtainTokens (initialOauth2code?: string) : Promise<TokenResponse> {
    const config = await this.whenConfigured;

    const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
    const grant_type = initialOauth2code ? GRANT_TYPE_AUTHORIZATION_CODE : GRANT_TYPE_REFRESH_TOKEN;
    const request = new TokenRequest({
        ...this.getClientIdentity(this.client),
        redirect_uri: this.client.redirectUri,
        grant_type,
        ...(initialOauth2code ? { code: initialOauth2code } : {}),
        refresh_token: this.refreshToken,
        extras: await this.getPKCEExtras(),
      });

    const tokens = await tokenHandler.performTokenRequest(config, request);

    if (tokens.accessToken) {
      try {
        const { exp } = decodeJWT(tokens.accessToken);
        if (exp) {
          this.accessTokenExpiresEpoch = parseInt(exp);
        }
      } catch (e) {
        console.error("Unable to parse JWT access token", e);
      }
    }
    if (tokens.refreshToken) {
      this.refreshToken = tokens.refreshToken;
    }

    return tokens;
  }

  private getClientIdentity(client : ClientConfig) {
    return {
      client_id : client.clientId,
      client_secret : client.clientSecret
    };
  }

  /**
   * Start the login process.
   *
   * May navigate away to the OpenID-Connect authentication server, so
   * that the user may log in.
   */
  public login () {
    this.whenConfigured.then((config) => this.redirectForLogin(config));
  }

  /**
   * Redirect to the authentication server to initiate login.
   */
  private async redirectForLogin (config : AuthorizationServiceConfiguration) : Promise<void> {
    const usePkce = ! this.fakeStore;

    const request = new AuthorizationRequest({
      ...this.getClientIdentity(this.client),
      redirect_uri: this.client.redirectUri,
      scope: this.client.scope || "openid",
      response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
      // TODO: given that we handle the `state` rather... poorly when
      // we use the fake storage, we should probably make this
      // accessible to user code somehow.
      state: undefined,
      extras: this.client.extras
    }, /* crypto = */ undefined, /* usePkce = */ usePkce);

    if (usePkce) {
      await request.setupCodeVerifier();
      this.savePKCECodeVerifier(request.internal.code_verifier);
    }

    const authorizationHandler = new RedirectRequestHandler(this.storage);
    authorizationHandler.performAuthorizationRequest(config, request);
  }

  /**
   * Log out asynchrounously.
   */
  public async logout () {
    this.stop();

    try {
      await this.revokeTokens();
    } finally {
      this.refreshToken = undefined;
      this.accessTokenExpiresEpoch = undefined;
      this.callbacks.auth(undefined);
    }
  }

  private async getPKCEExtras () : Promise<{ code_verifier?: string }> {
    const retval = {};
    if (! this.fakeStore) {
        retval["code_verifier"] = await this.loadPKCECodeVerifier();
    }

    return retval;
  }

  private async revokeTokens () : Promise<boolean> {
    const config = await this.whenConfigured;

    const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());

    // Don't bother revoking the access token, as in an OpenID-Connect
    // flow the resource server will typically *not* query the
    // authentication server about its current state.
    const request = new RevokeTokenRequest({
      token: this.refreshToken,
      ...this.getClientIdentity(this.client)
      });

    return tokenHandler.performRevokeTokenRequest(config, request);
  }

  private async loadPKCECodeVerifier () : Promise<string> {
    // See rant above in constructor, and complete it thusly:
    // ...aaaaaand they don't even manage the PKCE stuff in the store.
    throw new Error("UNIMPLEMENTED: loadPKCECodeVerifier");
  }

  private async savePKCECodeVerifier (_code_verifier : string) : Promise<void> {
    throw new Error("UNIMPLEMENTED: savePKCECodeVerifier");
  }

  /**
   * Return the number of seconds before the current token expires.
   *
   * Behavior is undefined if there is no current token.
   */
  public expiresInSeconds(): number {
    return this.accessTokenExpiresEpoch - (new Date().getTime() / 1000);
  }

  private scheduleRenewal() {
    if (! this.minValiditySeconds) return;

    const expiresInSeconds = this.expiresInSeconds(),
    renewalDelay = expiresInSeconds - this.minValiditySeconds;
    if (renewalDelay <= 0) {
        this.callbacks.error(`${this.authServer} returned a token that expires in ${expiresInSeconds} seconds; minValiditySeconds value of ${this.minValiditySeconds} is unattainable! Token renewal is disabled.`);
    }

    if (this.debug) console.log(`Scheduling renewal in ${renewalDelay} seconds`);
    this.stop();
    this.timeout = this.timeouts.setTimeout(async () => {
      try {
        const { accessToken } = await this.obtainTokens();
        this.callbacks.auth(accessToken);
        this.scheduleRenewal();
      } catch (error) {
        this.callbacks.error(error);
      }
    }, renewalDelay * 1000);
  }

  /**
   * Stop the renewal timer.
   *
   * No-op if no such timer is currently set.
   */
  public stop () { if (this.timeout) this.timeouts.clearTimeout(this.timeout); }
}

/**
 * An UnderlyingStorage that pretends to remember things from two redirects ago.
 *
 * If you pass `new LocalStorage(new FakeOAuth2State)` into
 * Context (or if you don't - This is the default behavior), then you
 * won't have to tell your users that “this site uses cookies and
 * similar tracking technology.”
 */
export class FakeOAuth2Store implements UnderlyingStorage {
  private state : string;
  constructor(location : LocationLike) {
    const { state } = (new SmarterQueryStringUtils).parse(location);
    this.state = state;
  }
  get length() { return 1 }
  getItem(key: string) {
    if (! this.state) return;  // Pretend we know nothing

    // All this encapsulation-breaking knowledge about the store's key
    // space was obtained through reverse engineering, using the
    // (perhaps commented-out) calls to console.error() in this class.
    if (key === "appauth_current_authorization_request") {
      return this.state;
    } else if (key.endsWith("_appauth_authorization_request")) {
      return JSON.stringify({state: this.state});
    } else if (key.endsWith("_appauth_authorization_service_configuration")) {
      // AIUI this never actually happens; this piece of the key space
      // appears to be dead code in @openid/appauth.
      return JSON.stringify({});
    } else {
      console.error("unhandled: getItem(" + key + ")");
      return "???";
    }
  }

  // All stores are ignored; however, while trying to fix “Unhandled: getItem()” above
  // it might be useful to uncomment the `console.error` below.
  setItem(_key: string, _data: string) {
    // console.error("Unhandled: setItem(\"" + _key + "\", \"" + _data + "\")");
  }
  removeItem(_key: string) {}
  clear() {}
}

/**
 * Like @openid/appauth's BasicQueryStringUtils, except
 *
 * - checks for URL-embedded credentials in both places (before and
 * after the hash mark). DUH.
 * - helps in consuming the OAuthy parts out of the URL bar
 */
class SmarterQueryStringUtils extends BasicQueryStringUtils {
  private useHash : boolean;
  parse(input: LocationLike, _useHash?: boolean) {
    const maybeInQueryParams = super.parse(input, false);
    if (Object.keys(maybeInQueryParams).length !== 0) {
      this.useHash = false;
      return maybeInQueryParams;
    } else {
      // Maybe not.
      this.useHash = true;
      return super.parse(input, true);
    }
  }

  /**
   * @returns the URL in `input` after removing the `code=`, `state=`,
   * `error=` and `session_state=` parts
   */
  getRemainder(input : LocationLike) : string {
    const params = this.parseQueryString(this.useHash ? input.hash : input.search);
    delete params["error"];
    delete params["state"];
    delete params["code"];
    delete params["session_state"];
    const newParams = this.stringify(params);

    let search = input.search, hash = input.hash;
    if (this.useHash) {
      hash = newParams ? '#' + newParams : '';
    } else {
      search = newParams ? '?' + newParams : '';
    }

    return input.origin + input.pathname + search + hash;
  }
}

function decodeJWT(jwt : string) : { [key : string] : string } {
  // Credits to https://stackoverflow.com/a/38552302
  const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

/**
 * A Promise-like object that also has `.resolve()` and `.reject()`
 * methods.
 */
class ResolvablePromise<T> implements PromiseLike<T> {
  public resolve : (result : T) => void;
  public reject : (error : Error) => void;
  // Surely there is a better way to placate the TypeScript warning,
  // than to copy the next two lines straight out of
  // node_modules/typescript/lib/lib.es5.d.ts (and replace `:`s with
  // `=>`s) as I did?
  public then : <TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null) => PromiseLike<TResult1 | TResult2>;;
  public catch : <TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null) => Promise<T | TResult>;

  constructor () {
    const p = new Promise((resolve, reject) => {
      // See
      // https://gist.github.com/domenic/8ed6048b187ee8f2ec75?permalink_comment_id=2297518#gistcomment-2297518
      // to find out why just `this.resolve = resolve` wouldn't work.
      this.resolve = (result) => resolve(result);
      this.reject = (error) => reject(error);
    });
    this.then = p.then.bind(p);
    this.catch = p.then.bind(p);
  }
}