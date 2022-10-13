/**
 * Simple React components that interact with the OpenID-Connect state.
 *
 * Use them as-is if they fit your needs, or read their code for
 * inspiration.
 */

import * as React from "react";
import { ReactNode, FC } from "react";

import { State, StateEnum, useOpenIDConnectContext } from "./OpenIDConnect";

/////////////////////////////////  IfOIDCState /////////////////////////////////////////////

/**
 * An “if” block that only renders children when the OpenID-Connect
 * state machine is currently in a given condition.
 */
export function IfOIDCState (props : {
  children?: ReactNode,
  is?: StateEnum,
  isnt?: StateEnum,
  isOneOf ?: StateEnum[],
  isNoneOf ?: StateEnum[],
}) : ReturnType<FC> {
  const { state } = useOpenIDConnectContext();
  if (props.is) {
    return childrenIf(props.is === state);
  } else if (props.isnt) {
    return childrenIf(props.is !== state);
  } else if (props.isOneOf) {
    return childrenIf(props.isOneOf.some((s) => s === state));
  } else if (props.isNoneOf) {
    return childrenIf(! props.isNoneOf.some((s) => s === state));
  }

  function childrenIf (predicate : boolean) {
    return predicate ? <>{props.children}</> : <></>;
  }
}

//////////////////////////////////  OIDCError //////////////////////////////////////////////

/**
 * A simple &lt;span&gt; that shows the OIDC error if any.
 *
 * Renders to nothing (&lt;&gt;&lt;/&gt;) if there is no error (so you don't even have to
 * wrap it in an &lt;IfOIDCState&gt;).
 */
export function OIDCError (props : {className : string}) {
  const { className } = props;
  const { error } = useOpenIDConnectContext();
  if (! error) return <></>;
  return <span className={ className }>error</span>;
}

///////////////////////////////  LoggedInUser //////////////////////////////////////////////

export function LoggedInUser (props : { field : string }) {
  const { idToken } = useOpenIDConnectContext();
  return <>{ idToken[props.field] }</>;
}

/////////////////////////////////  LoginButton /////////////////////////////////////////////

export interface LoginButtonTexts {
  label : ReactNode;
  tooltip : string;
}

export interface LoginButtonProps {
  inProgressLabel ?: ReactNode | ((oidc : State) => ReactNode),
  loginLabel      ?: ReactNode | ((oidc : State) => ReactNode),
  logoutLabel     ?: ReactNode | ((oidc : State) => ReactNode),
  loginTooltip    ?: string | ((oidc : State) => string),
  logoutTooltip   ?: string | ((oidc : State) => string),
  className       ?: string | ((oidc : State) => string),
  showError       ?: ((oidc: State, texts : LoginButtonTexts) => LoginButtonTexts),
}

const LoginButtonDefaults: LoginButtonProps = {
  loginLabel:      "Login",
  logoutLabel:     "Logout",
  inProgressLabel: "⌛",
  loginTooltip:    "Log in with OpenID-Connect",
  logoutTooltip:   "Log out",
  showError:       (oidc, { label, tooltip }) => {
    if (oidc.error === undefined) {
      return { label, tooltip };
    } else {
      return { label: <>React.Children.toArray(label).concat([<sup>⚠</sup>])</>,
               tooltip: `${oidc.error}` };
    }
  }
};

/**
 * A standard-issue login / logout button.
 */
export function LoginButton (props : LoginButtonProps) {
  props = {... LoginButtonDefaults, ...props };
  const oidc = useOpenIDConnectContext();

  const className = getString(props.className);
  if (oidc.state === StateEnum.InProgress) {
    const pleaseWait = getElements(props.inProgressLabel);
    return <button className={className} disabled>{pleaseWait}</button>;
  }

  const loggedIn = oidc.state === StateEnum.LoggedIn;

  let label = getElements(loggedIn ? props.logoutLabel : props.loginLabel),
  tooltip = getString(loggedIn ? props.logoutTooltip : props.loginTooltip);

  if (props.showError) {
    const errorAppearance = props.showError(oidc, {label, tooltip});
    label = errorAppearance.label;
    tooltip = errorAppearance.tooltip;
  }

  function click() {
    if (loggedIn) {
      oidc.logout();
    } else {
      oidc.login();
    }
  }

  return <button className={className} title={tooltip} onClick={click}>{label}</button>;

  function getString (stringGiver ?: string | ((oidc : State) => string)) {
    return typeof(stringGiver) === 'function' ? stringGiver(oidc) : stringGiver;
  }
  function getElements (elementGiver ?: ReactNode | ((oidc : State) => ReactNode)) {
    return typeof(elementGiver) === 'function' ? elementGiver(oidc) : elementGiver;
  }
}
