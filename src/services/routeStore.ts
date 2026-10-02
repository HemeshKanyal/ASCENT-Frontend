/** Recorded routes live under their own keys so the session history stays small. */
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GpsPoint } from "../engine";

const key = (id: string) => `ROUTE_${id}`;

export const saveRoute = (id: string, segments: GpsPoint[][]) => AsyncStorage.setItem(key(id), JSON.stringify(segments));

export async function getRoute(id: string): Promise<GpsPoint[][]> {
  const raw = await AsyncStorage.getItem(key(id));
  return raw ? (JSON.parse(raw) as GpsPoint[][]) : [];
}
