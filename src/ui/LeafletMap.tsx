/**
 * Leaflet map on OpenStreetMap tiles (free with attribution; fine for light personal use —
 * a busy public app should switch to a tile provider). Darkened with a CSS filter to match the app.
 * Web only — loaded lazily by RouteMap.web.tsx.
 */
import "leaflet/dist/leaflet.css";

import { useEffect } from "react";

import { View } from "react-native";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";

import type { GpsPoint } from "../engine";
import type { RouteMapProps } from "./RouteSvg";
import { colors, radius } from "./theme";

// Dark look for the standard (light) OSM tiles.
if (typeof document !== "undefined" && !document.getElementById("ascent-dark-tiles")) {
  const style = document.createElement("style");
  style.id = "ascent-dark-tiles";
  style.textContent = ".ascent-dark-tiles { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) grayscale(1); }";
  document.head.appendChild(style);
}

function Frame({ points, live }: { points: GpsPoint[]; live: boolean }) {
  const map = useMap();
  const count = points.length;
  useEffect(() => {
    if (!count) return;
    const last = points[count - 1];
    if (live) map.setView([last.lat, last.lon], Math.max(map.getZoom(), 16), { animate: true });
    else map.fitBounds(points.map((p) => [p.lat, p.lon] as [number, number]), { padding: [24, 24] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reframe when the point count changes
  }, [count, live, map]);
  return null;
}

export function LeafletMap({ segments, height = 260, live = false, rounded = true }: RouteMapProps) {
  const all = segments.flat();
  const start = all[0];
  const center: [number, number] = start ? [start.lat, start.lon] : [20, 0];
  return (
    <View style={{ height, borderRadius: rounded ? radius.lg : 0, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      <MapContainer center={center} zoom={start ? 15 : 2} style={{ height: "100%", width: "100%", background: colors.surface }} zoomControl={false} attributionControl>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="ascent-dark-tiles"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {segments.map((seg, i) =>
          seg.length > 1 ? <Polyline key={i} positions={seg.map((p) => [p.lat, p.lon] as [number, number])} pathOptions={{ color: colors.accent, weight: 4 }} /> : null
        )}
        {start ? <CircleMarker center={[start.lat, start.lon]} radius={6} pathOptions={{ color: colors.accent, fillColor: colors.bg, fillOpacity: 1 }} /> : null}
        {all.length > 1 ? (
          <CircleMarker center={[all[all.length - 1].lat, all[all.length - 1].lon]} radius={6} pathOptions={{ color: colors.accent, fillColor: colors.accent, fillOpacity: 1 }} />
        ) : null}
        <Frame points={all} live={live} />
      </MapContainer>
    </View>
  );
}
