/**
 * Keep the screen on while mounted. Unlike expo-keep-awake's hook, this never
 * throws on the web when the browser refuses or hasn't granted the wake lock yet.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect } from "react";

export function useScreenAwake(tag: string) {
  useEffect(() => {
    let active = false;
    activateKeepAwakeAsync(tag)
      .then(() => {
        active = true;
      })
      .catch(() => {});
    return () => {
      if (!active) return;
      Promise.resolve()
        .then(() => deactivateKeepAwake(tag))
        .catch(() => {});
    };
  }, [tag]);
}
