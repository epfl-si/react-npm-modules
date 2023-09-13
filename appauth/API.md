## Classes

<dl>
<dt><a href="#OpenIDConnect">OpenIDConnect</a></dt>
<dd><p>Simple OpenID-Connect state machine.</p></dd>
<dt><a href="#FakeOAuth2Store">FakeOAuth2Store</a></dt>
<dd><p>An UnderlyingStorage that pretends to remember things from two redirects ago.</p>
<p>If you pass <code>new LocalStorage(new FakeOAuth2State)</code> into
Context (or if you don't - This is the default behavior), then you
won't have to tell your users that “this site uses cookies and
similar tracking technology.”</p></dd>
</dl>

## Members

<dl>
<dt><a href="#OpenIDConnect">OpenIDConnect</a></dt>
<dd><p>Used to inject your frameworky setTimeout / clearTimeout surrogates.</p></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ClientConfig">ClientConfig</a> : <code>Object</code></dt>
<dd><p>The set of information that the client (browser) will send to the
OIDC authentication server upon initiation of the OpenID-connect
machinery.</p></dd>
</dl>

<a name="OpenIDConnect"></a>

## OpenIDConnect
<p>Simple OpenID-Connect state machine.</p>

**Kind**: global class  

* [OpenIDConnect](#OpenIDConnect)
    * [.run()](#OpenIDConnect+run) ⇒
    * [.login()](#OpenIDConnect+login)
    * [.logout()](#OpenIDConnect+logout)
    * [.expiresInSeconds()](#OpenIDConnect+expiresInSeconds)
    * [.stop()](#OpenIDConnect+stop)

<a name="OpenIDConnect+run"></a>

### openIDConnect.run() ⇒
<p>Start the token fetch and renewal process. Awaits the first
successful token event if we are currently logged in. That is, if
(and only if) <code>run</code> is about to return <code>true</code>, <code>callbacks.auth</code>
will be called once before it returns.</p>
<p>Additionally, if a <code>minValiditySeconds</code> parameter was passed at
construction time, schedule automatic token renewal this many
seconds before the <code>expiresInSeconds()</code> deadline.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
**Returns**: <p>true if the user is currently logged in; false if
not.</p>  
<a name="OpenIDConnect+login"></a>

### openIDConnect.login()
<p>Start the login process.</p>
<p>May navigate away to the OpenID-Connect authentication server, so
that the user may log in.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="OpenIDConnect+logout"></a>

### openIDConnect.logout()
<p>Log out asynchrounously.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="OpenIDConnect+expiresInSeconds"></a>

### openIDConnect.expiresInSeconds()
<p>Return the number of seconds before the current token expires.</p>
<p>Behavior is undefined if there is no current token.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="OpenIDConnect+stop"></a>

### openIDConnect.stop()
<p>Stop the renewal timer.</p>
<p>No-op if no such timer is currently set.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="FakeOAuth2Store"></a>

## FakeOAuth2Store
<p>An UnderlyingStorage that pretends to remember things from two redirects ago.</p>
<p>If you pass <code>new LocalStorage(new FakeOAuth2State)</code> into
Context (or if you don't - This is the default behavior), then you
won't have to tell your users that “this site uses cookies and
similar tracking technology.”</p>

**Kind**: global class  
<a name="OpenIDConnect"></a>

## OpenIDConnect
<p>Used to inject your frameworky setTimeout / clearTimeout surrogates.</p>

**Kind**: global variable  

* [OpenIDConnect](#OpenIDConnect)
    * [.run()](#OpenIDConnect+run) ⇒
    * [.login()](#OpenIDConnect+login)
    * [.logout()](#OpenIDConnect+logout)
    * [.expiresInSeconds()](#OpenIDConnect+expiresInSeconds)
    * [.stop()](#OpenIDConnect+stop)

<a name="OpenIDConnect+run"></a>

### openIDConnect.run() ⇒
<p>Start the token fetch and renewal process. Awaits the first
successful token event if we are currently logged in. That is, if
(and only if) <code>run</code> is about to return <code>true</code>, <code>callbacks.auth</code>
will be called once before it returns.</p>
<p>Additionally, if a <code>minValiditySeconds</code> parameter was passed at
construction time, schedule automatic token renewal this many
seconds before the <code>expiresInSeconds()</code> deadline.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
**Returns**: <p>true if the user is currently logged in; false if
not.</p>  
<a name="OpenIDConnect+login"></a>

### openIDConnect.login()
<p>Start the login process.</p>
<p>May navigate away to the OpenID-Connect authentication server, so
that the user may log in.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="OpenIDConnect+logout"></a>

### openIDConnect.logout()
<p>Log out asynchrounously.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="OpenIDConnect+expiresInSeconds"></a>

### openIDConnect.expiresInSeconds()
<p>Return the number of seconds before the current token expires.</p>
<p>Behavior is undefined if there is no current token.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="OpenIDConnect+stop"></a>

### openIDConnect.stop()
<p>Stop the renewal timer.</p>
<p>No-op if no such timer is currently set.</p>

**Kind**: instance method of [<code>OpenIDConnect</code>](#OpenIDConnect)  
<a name="ClientConfig"></a>

## ClientConfig : <code>Object</code>
<p>The set of information that the client (browser) will send to the
OIDC authentication server upon initiation of the OpenID-connect
machinery.</p>

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| clientId | <code>string</code> | <p>The name the client is registered as in the OIDC authentication server</p> |

