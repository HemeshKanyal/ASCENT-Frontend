/**
 * Generic fallback (no map tiles). Phones use RouteMap.native.tsx (Apple/Google
 * maps), the web uses RouteMap.web.tsx (Leaflet + OpenStreetMap tiles).
 */
export { RouteSvg, RouteSvgMap as RouteMap, type RouteMapProps } from "./RouteSvg";
