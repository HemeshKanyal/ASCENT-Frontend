/** Route on a real map (Apple Maps on iOS, Google Maps on Android — no API key needed in Expo Go). */
import { useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import type { GpsPoint } from "../engine";
import type { RouteMapProps } from "./RouteSvg";
import { colors, radius } from "./theme";

// Import the shared drawing from ./RouteSvg — "./RouteMap" would resolve to this same file on phones.
export { RouteSvg } from "./RouteSvg";

export function RouteMap({ segments, height = 260, live = false, rounded = true }: RouteMapProps) {
  const map = useRef<MapView>(null);
  const all = segments.flat();
  const last = all[all.length - 1];
  const count = all.length;

  // Re-frame only when the number of points changes, not on every render.
  useEffect(() => {
    const pts = segments.flat();
    const end = pts[pts.length - 1];
    if (!map.current || !end) return;
    if (live) {
      map.current.animateCamera({ center: { latitude: end.lat, longitude: end.lon }, zoom: 16 }, { duration: 400 });
    } else {
      map.current.fitToCoordinates(
        pts.map((p) => ({ latitude: p.lat, longitude: p.lon })),
        { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- point count is the meaningful change
  }, [count, live]);

  const toCoords = (seg: GpsPoint[]) => seg.map((p) => ({ latitude: p.lat, longitude: p.lon }));

  return (
    <View style={{ height, borderRadius: rounded ? radius.lg : 0, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        userInterfaceStyle="dark"
        showsUserLocation={live}
        showsCompass={false}
        toolbarEnabled={false}
        initialRegion={last ? { latitude: last.lat, longitude: last.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
      >
        {segments.map((seg, i) => (seg.length > 1 ? <Polyline key={i} coordinates={toCoords(seg)} strokeColor={colors.accent} strokeWidth={4} /> : null))}
        {all.length ? <Marker coordinate={{ latitude: all[0].lat, longitude: all[0].lon }} pinColor="black" /> : null}
      </MapView>
    </View>
  );
}
