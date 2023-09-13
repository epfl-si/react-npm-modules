## Members

<dl>
<dt><a href="#StateEnum">StateEnum</a></dt>
<dd><p>OpenID-Connect state machine as a React context</p></dd>
</dl>

## Functions

<dl>
<dt><a href="#OIDCContext">OIDCContext()</a></dt>
<dd><p>OpenID-Connect state machine as a React context.</p>
<p>Perform the operations dictated by the OpenID-Connect specification
once at the time the component is created, so as to determine
logged-in or logged-out status on behalf of {@link
useOpenIDConnectContext}. Said operations consist of the following
steps:</p>
<ul>
<li>consume any OpenID-Connect credentials out
of the browser URL bar (<code>code=</code>, <code>state=</code>, <code>error=</code> and
<code>session_state=</code>), regardless of whether they are found in the
“query” or “fragment” part</li>
<li>redeem these OpenID-Connect credentials with the authorization
server, in exchange for an authorization token and (optionally) an
ID token</li>
<li>communicate the success or failure of the previous steps through
the <code>onInitialAuthComplete</code> callback and either the <code>onNewToken</code>
or the <code>onLogout</code> callback</li>
<li>arrange for timely token renewal</li>
</ul>
<p>This is a React context, meaning that one may use the matching
[useOpenIDConnectContext](#useOpenIDConnectContext) React hook to consume the
authentication state from any descendant component.</p>
<p>Note that contrary to a “typical” React component, an
<code>&lt;OIDCContext&gt;</code> does <em>not</em> destroy its state when its props change
(even “important” props like <code>authServerUrl</code>), as doing so would
typically result in logging the user out. If you do want that to
happen, you must arrange to call
<code>useOpenIDConnectContext().logout()</code> by yourself.</p></dd>
<dt><a href="#useOpenIDConnectContext">useOpenIDConnectContext()</a></dt>
<dd><p>React hook to consume the state of the ancestor <code>&lt;OIDCContext&gt;</code>.</p>
<p>Call this function from a React functional component that has an
<code>&lt;OIDCContext&gt;</code> as the ancestor (otherwise a dummy, invariable
state will be returned). The return value, <code>state</code>, is a <code>State</code>
object containing data indicating whether we are logged in
(<code>state.state</code>, <code>state.error</code>) and who is logged in
(<code>state.idToken</code>); as well as actuator methods that your UI (e.g.
your login button's <code>onClick</code>) might want to call (<code>state.login()</code>
and <code>state.logout()</code>).</p></dd>
<dt><a href="#IfOIDCState">IfOIDCState()</a></dt>
<dd><p>An “if” block that only renders children when the OpenID-Connect
state machine is currently in a given condition.</p></dd>
<dt><a href="#OIDCError">OIDCError()</a></dt>
<dd><p>A simple &lt;span&gt; that shows the OIDC error if any.</p>
<p>Renders to nothing (&lt;&gt;&lt;/&gt;) if there is no error (so you don't even have to
wrap it in an &lt;IfOIDCState&gt;).</p></dd>
<dt><a href="#LoginButton">LoginButton()</a></dt>
<dd><p>A standard-issue login / logout button.</p></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#State">State</a> : <code>Object</code></dt>
<dd><p>The things that <code>useOpenIDConnectContext</code> returns.</p></dd>
</dl>

<a name="StateEnum"></a>

## StateEnum
<p>OpenID-Connect state machine as a React context</p>

**Kind**: global variable  
<a name="OIDCContext"></a>

## OIDCContext()
<p>OpenID-Connect state machine as a React context.</p>
<p>Perform the operations dictated by the OpenID-Connect specification
once at the time the component is created, so as to determine
logged-in or logged-out status on behalf of {@link
useOpenIDConnectContext}. Said operations consist of the following
steps:</p>
<ul>
<li>consume any OpenID-Connect credentials out
of the browser URL bar (<code>code=</code>, <code>state=</code>, <code>error=</code> and
<code>session_state=</code>), regardless of whether they are found in the
“query” or “fragment” part</li>
<li>redeem these OpenID-Connect credentials with the authorization
server, in exchange for an authorization token and (optionally) an
ID token</li>
<li>communicate the success or failure of the previous steps through
the <code>onInitialAuthComplete</code> callback and either the <code>onNewToken</code>
or the <code>onLogout</code> callback</li>
<li>arrange for timely token renewal</li>
</ul>
<p>This is a React context, meaning that one may use the matching
[useOpenIDConnectContext](#useOpenIDConnectContext) React hook to consume the
authentication state from any descendant component.</p>
<p>Note that contrary to a “typical” React component, an
<code>&lt;OIDCContext&gt;</code> does <em>not</em> destroy its state when its props change
(even “important” props like <code>authServerUrl</code>), as doing so would
typically result in logging the user out. If you do want that to
happen, you must arrange to call
<code>useOpenIDConnectContext().logout()</code> by yourself.</p>

**Kind**: global function  
<a name="useOpenIDConnectContext"></a>

## useOpenIDConnectContext()
<p>React hook to consume the state of the ancestor <code>&lt;OIDCContext&gt;</code>.</p>
<p>Call this function from a React functional component that has an
<code>&lt;OIDCContext&gt;</code> as the ancestor (otherwise a dummy, invariable
state will be returned). The return value, <code>state</code>, is a <code>State</code>
object containing data indicating whether we are logged in
(<code>state.state</code>, <code>state.error</code>) and who is logged in
(<code>state.idToken</code>); as well as actuator methods that your UI (e.g.
your login button's <code>onClick</code>) might want to call (<code>state.login()</code>
and <code>state.logout()</code>).</p>

**Kind**: global function  
<a name="IfOIDCState"></a>

## IfOIDCState()
<p>An “if” block that only renders children when the OpenID-Connect
state machine is currently in a given condition.</p>

**Kind**: global function  
<a name="OIDCError"></a>

## OIDCError()
<p>A simple &lt;span&gt; that shows the OIDC error if any.</p>
<p>Renders to nothing (&lt;&gt;&lt;/&gt;) if there is no error (so you don't even have to
wrap it in an &lt;IfOIDCState&gt;).</p>

**Kind**: global function  
<a name="LoginButton"></a>

## LoginButton()
<p>A standard-issue login / logout button.</p>

**Kind**: global function  
<a name="State"></a>

## State : <code>Object</code>
<p>The things that <code>useOpenIDConnectContext</code> returns.</p>

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| state | [<code>StateEnum</code>](#StateEnum) | <p>One of the <code>StateEnum</code> constants, indicating current logged-in status</p> |
| error | <code>string</code> | <p>The last error encountered by <code>@epfl-si/react-appauth</code>, as an english-language string</p> |
| login | <code>function</code> | <p>Call this function to start the login process now</p> |
| logout | <code>function</code> | <p>Call this function to start the logout process now</p> |
| accessToken | <code>string</code> | <p>The last known OIDC access token (to send to the backend server), or undefined if we are currently logged out</p> |
| idToken | <code>Object</code> | <p>The decoded JWT ID token</p> |

