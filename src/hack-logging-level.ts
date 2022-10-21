/**
 * Mute or unmute the `console.log`s in `@openid/appauth`, by hook or by crook.
 *
 * @param logOrNot `true` to enable debugging within `@openid/appauth`,
 *                 `false` to disable it
 *
 * @returns `true` if the requested configuration could be set;
 *          `false` if the attempt failed.
 */
export async function setOpenIdAppauthLogging(logOrNot : boolean) : Promise<boolean> {
  let imported : { IS_LOG : boolean };
  try {
    imported = await import("@openid/appauth/built/flags");
  } catch (e) {
    // Someone refactored their stuff huh.
    return false;
  }

  if (logOrNot === !! imported.IS_LOG) return true;

  try {
    imported.IS_LOG = logOrNot;
  } catch (e) {
    if (e instanceof TypeError) {
      // Probably some const business in play
      return false;
    } else {
      throw e;
    }
  }
  return true;
}
