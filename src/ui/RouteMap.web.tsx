/**
 * Web map. Leaflet touches `window` as soon as it's imported, which breaks the
 * server pre-render, so draw the plain route first and load Leaflet in the browser.
 * Never import "./RouteMap" here — on web that resolves back to this file.
 */
import { useEffect, useState, type ComponentType } from "react";

import { RouteSvg, RouteSvgMap, type RouteMapProps } from "./RouteSvg";

export { RouteSvg, type RouteMapProps };

export function RouteMap(props: RouteMapProps) {
  const [Leaflet, setLeaflet] = useState<ComponentType<RouteMapProps> | null>(null);
  useEffect(() => {
    let alive = true;
    import("./LeafletMap").then((m) => alive && setLeaflet(() => m.LeafletMap)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return Leaflet ? <Leaflet {...props} /> : <RouteSvgMap {...props} />;
}
