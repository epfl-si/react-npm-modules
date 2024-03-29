import { AuthorizationNotifier, RedirectRequestHandler,
         AuthorizationRequest, AuthorizationError,
         BaseTokenRequestHandler, TokenRequest,
         FetchRequestor,
         GRANT_TYPE_AUTHORIZATION_CODE, GRANT_TYPE_REFRESH_TOKEN,
         AuthorizationServiceConfiguration,
         RevokeTokenRequest,
         LocalStorageBackend, StorageBackend, UnderlyingStorage,
         BasicQueryStringUtils, LocationLike } from "@openid/appauth";

import { setOpenIdAppauthLogging } from "./hack-logging-level";
import Resolvable from 'resolvable-promise';

type StringMap = { [key : string] : string };

export type IdToken = StringMap;

export interface OpenIDConnectConfig {
  authServerUrl: string;
  client: ClientConfig;
  debug?: boolean;
  storage?: StorageBackend;
  /**
   * If set, enable automatic renewal
   */
  minValiditySeconds?: number;
}

let _HACK_KEEP_THIS_JSDOC = 1;
/**
 * @typedef {Object} ClientConfig
 * The set of information that the client (browser) will send to the
 * OIDC authentication server upon initiation of the OpenID-connect
 * machinery.
 *
 * @property {string} clientId - The name the client is registered as in the OIDC authentication server
 *
 */
_HACK_KEEP_THIS_JSDOC = _HACK_KEEP_THIS_JSDOC * 1;

export interface ClientConfig {
  clientId: string;
  /** A secret that identifies this particular client to the authentication server. */
  clientSecret ?: string;
  /**
   * The URI that the authentication server should redirect to upon
   * successful authentication. If left undefined, use the browser's URL
   * (after removing the OpenID-Connect-mandated query parameters, if any)
   */
  redirectUri?: string;
  /**
   * A keyword or space-separated list of keywords, designating the
   * set of informations that the resource server will want to know
   * about the user. The default value is “openid”.
   */
  scope?: string;
  /**
   * A place to store the OAuth2 `state=` and PKCE `code_verifier`
   * inbetween redirects.
   *
   * passing either `new LocalStorageBackend()` or `new
   * LocalStorageBackend(window.sessionStorage)` (where
   * `LocalStorageBackend` is re-rexported from `@openid/appauth`),
   * will result in the browser performing a fully-compliant OAuth2
   * authorization code flow with working `state=` and PKCE checks.
   * This in turn requires browser storage, which will be of the
   * `window.localStorage` or `window.sessionStorage` variety,
   * respectively. By default, no browser storage is used, and
   * (therefore) `state=` checks and PKCE are both disabled.
   */
  storage?: StorageBackend;
  /**
   * Any nonstandard configuration parameters to tweak the
   * authentication server's behavior during the authorization
   * (initial) redirect.
   */
  extras?: StringMap;
}

interface Callbacks {
  /**
   * The callback that informs the caller when a new OAuth2
   * access token becomes available. You might want to set
   * `Authentication: Bearer ${token}` in your future API calls.
   */
  accessToken: (token: string|undefined) => void;
  /**
   * The callback that informs the caller when an ID token
   * becomes available.
   */
  idToken: (token: string | undefined, tokenDecoded: StringMap | undefined) => void;
  /**
   * The callback that informs the caller that a call to the `logout`
   * method just completed.
   */
  logout: () => void;
  /**
   * The callback that informs the caller that the `OpenIDConnect`
   * object encountered an error.
   */
  error: (error: Error|string) => void;
}

/**
 * Simple OpenID-Connect state machine.
 */
export class OpenIDConnect<InjectedTimeoutHandleT> {
  private authServerUrl : string;
  private client : ClientConfig;
  private storage : StorageBackend;
  private fakeStore ?: FakeOAuth2Store;
  private debug : boolean;
  private minValiditySeconds : number | undefined;
  private timeouts: InjectTimeoutAPI<any>;
  private timeout: InjectedTimeoutHandleT | undefined;

  constructor({ authServerUrl, client, storage,
                 debug, minValiditySeconds } : OpenIDConnectConfig,
              timeouts?: InjectTimeoutAPI<InjectedTimeoutHandleT>) {
    this.authServerUrl = authServerUrl;
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
    this.timeouts = timeouts ? timeouts : {
      setTimeout(millis, cb) { return window.setTimeout(millis, cb) },
      clearTimeout(id) { window.clearTimeout(id) }
    };
  }

  private whenConfigured = new Resolvable<AuthorizationServiceConfiguration>();
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
      await setOpenIdAppauthLogging(this.debug);

      // Start the process to fetch OIDC configuration from the
      // well-known endpoint, even if it turns out that we are not
      // currently logged in - This is to speed up `login()` later.
      AuthorizationServiceConfiguration.fetchFromIssuer(
        this.authServerUrl.replace(/\/+$/, ""),
        new FetchRequestor()
      ).then((config) => {
        this.whenConfigured.resolve(config);
      }).catch((error) => {
        this.callbacks.error(error);
      });

      const code = await this.consumeOAuth2CodeFromBrowserLocation();
      if (! code) return false;

      await this.obtainAndDispatchTokens(code);

      return true;
    } catch(e) {
      this.callbacks.error(e);
    }
  }

  // Only used if we have persistent storage:
  private pkceCodeVerifier ?: string;
  /**
   * Consume the OAuth2 code if one is present in the browser URL.
   *
   * @private
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
   * If the `state=` portion matched a request we kept a copy of in
   * the storage (by way of `@openid/appauth` putting it there); and
   * that request contained a PKCE `code_verifier` (because we told
   * `@openid/appauth` to do so in the `redirectForLogin` method, two
   * redirects ago); then make note of the PKCE `code_verifier` in
   * `this.pkceCodeVerifier` for the `obtainAndDispatchTokens` method
   * to find.
   *
   * @returns The OAuth2 code (which is not a “token” because it is
   * use-once, for-our-eyes-only), or undefined if there isn't one.
   */
  private async consumeOAuth2CodeFromBrowserLocation () : Promise<string | undefined> {
    const parser = new SmarterQueryStringUtils();
    const notifier = new AuthorizationNotifier();
    const authorizationHandler = new RedirectRequestHandler(this.storage, parser, window.location)
      .setAuthorizationNotifier(notifier);

    let code : string|undefined,
        error: AuthorizationError|undefined;


    notifier.setAuthorizationListener((request, response, error_string) => {
      if (request?.internal?.code_verifier) {
        this.pkceCodeVerifier = request.internal.code_verifier;
      }
      if (response) {
        code = response.code;
      } else {
        error = error_string;
      }
    });

    await authorizationHandler.completeAuthorizationRequestIfPossible();
    window.history.replaceState(window.history.state, null,
                                parser.getURLRemainder(window.location));
    if (code) {
      return code;
    } else if (error) {
      throw error;
    } else {
      return undefined;
    }
  }

  private refreshToken : string;
  private tokenExpiresEpoch : number;
  /**
   * Perform an OAuth2 Access Token or Refresh Token request.
   *
   * @private
   *
   * Depending on whether the `initialOauth2code` parameter is set by
   * caller, the query sent to the authentication server will be the
   * access token request of an OAuth2 Authorization Code Grant
   * (RFC6749, section 4.1.3) or a refresh request of same (ibid,
   * section 6):
   *
   * - If `initialOauth2code` is set, use it as the credential to
   *   perform a `grant_type=authorization_code` request against the
   *   authentication server's `token_endpoint`, sending along
   *   `this.pkceCodeVerifier` (if any) as the PKCE `code_verifier`
   *   field (RFC7636, section 4.5) - See
   *   `consumeOAuth2CodeFromBrowserLocation` for details on how
   *   `this.pkceCodeVerifier` gets retrieved from persistent storage;
   *
   * - If the `initialOauth2code` is missing, perform a
   *   `grant_type=refresh_token` request using `this.refreshToken` as
   *   the credential.
   *
   * In either case, if the request is successful, the “dispatch“
   * phase happens immediately afterwards; all the steps described below
   * happen before the `obtainAndDispatchTokens` promise completes:
   *
   * - If an access token was obtained, call
   *   `this.callbacks.accessToken(tok)` with it
   *
   * - If an ID token was obtained, parse its JWT state (without
   *   checking the signature), update `this.tokenExpiresEpoch`, and
   *   call `this.callbacks.idToken(tok)` with it
   *
   * - If a refresh token is obtained, update `this.refreshToken`
   *
   * @param initialOauth2code The OAuth2 code that was on the
   *                          browser's URL after getting redirected
   *                          back from the authentication server. If
   *                          none is passed, attempt to perform a
   *                          refresh using `this.refreshToken`
   *                          instead.
   */
  private async obtainAndDispatchTokens (initialOauth2code?: string) : Promise<void> {
    const config = await this.whenConfigured;

    const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
    const grant_type = initialOauth2code ? GRANT_TYPE_AUTHORIZATION_CODE : GRANT_TYPE_REFRESH_TOKEN;
    const request = new TokenRequest({
        ...this.getClientIdentity(this.client),
        redirect_uri: this.getRedirectUri(),
        grant_type,
        ...(initialOauth2code ? { code: initialOauth2code } : {}),
        refresh_token: this.refreshToken,
        extras: initialOauth2code ? { code_verifier: this.pkceCodeVerifier } : {}
      });

    const tokens = await tokenHandler.performTokenRequest(config, request);
    const { accessToken, refreshToken, idToken } = tokens;
    let idTokenDecoded = undefined;

    if (idToken) {
      try {
        idTokenDecoded = decodeJWT(tokens.idToken);
        const { exp } = idTokenDecoded;
        if (exp) {
          this.tokenExpiresEpoch = parseInt(exp);
        }
      } catch (e) {
        console.error("Unable to parse JWT access token", e);
      }
    }
    if (tokens.refreshToken) {
      this.refreshToken = tokens.refreshToken;
    }


    this.callbacks.accessToken(accessToken);

    if (idToken) {
      this.callbacks.idToken(idToken, idTokenDecoded);
    }

    if (refreshToken) {
      this.scheduleRenewal();
    }
  }

  private getClientIdentity(client : ClientConfig) {
    return {
      client_id : client.clientId,
      client_secret : client.clientSecret
    };
  }

  private getRedirectUri () {
    return this.client.redirectUri || window.location.toString();
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
   *
   * @private
   */
  private async redirectForLogin (config : AuthorizationServiceConfiguration) : Promise<void> {
    const usePkce = ! this.fakeStore;

    const request = new AuthorizationRequest({
      ...this.getClientIdentity(this.client),
      redirect_uri: this.getRedirectUri(),
      scope: this.client.scope || "openid",
      response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
      // TODO: given that we handle the `state` rather... poorly when
      // we use the fake storage, we should probably make this
      // accessible to user code somehow.
      state: undefined,
      extras: this.client.extras
    }, /* crypto = */ undefined, /* usePkce = */ usePkce);

    const authorizationHandler = new RedirectRequestHandler(this.storage);
    if (this.debug) {
      console.log(`@epfl-si/react-appauth: redirecting to ${this.getRedirectUri()} ${usePkce ? "with" : "without"} PKCE`);
    }
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
      this.tokenExpiresEpoch = undefined;
      this.callbacks.logout();
    }
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

  /**
   * Return the number of seconds before the current token expires.
   *
   * Behavior is undefined if there is no current token.
   */
  public expiresInSeconds(): number {
    return this.tokenExpiresEpoch - (new Date().getTime() / 1000);
  }

  private scheduleRenewal(): void {
    if (! this.minValiditySeconds) return;

    const expiresInSeconds = this.expiresInSeconds(),
    renewalDelay = expiresInSeconds - this.minValiditySeconds;
    if (renewalDelay <= 0) {
        this.callbacks.error(`${this.authServerUrl} returned a token that expires in ${expiresInSeconds} seconds; minValiditySeconds value of ${this.minValiditySeconds} is unattainable! Token renewal is disabled.`);
    }

    if (this.debug) console.log(`@epfl-si/react-appauth: scheduling renewal in ${renewalDelay} seconds`);
    this.stop();
    this.timeout = this.timeouts.setTimeout(async () => {
      try {
        await this.obtainAndDispatchTokens();
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
 * Used to inject your frameworky setTimeout / clearTimeout surrogates.
 */
interface InjectTimeoutAPI<InjectedTimeoutHandleT> {
  setTimeout: (callback: () => void, millis: number) => InjectedTimeoutHandleT
  clearTimeout: (timeoutHandle: InjectedTimeoutHandleT) => void
}

/**
 * @class
 *
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
 * @class
 * @private
 *
 * Like @openid/appauth's BasicQueryStringUtils, except
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
  getURLRemainder(input : LocationLike) : string {
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

function decodeJWT(jwt : string) : StringMap {
  // Credits to https://stackoverflow.com/a/38552302
  const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}
