import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { TOMTOM_KEY, type LatLng } from "@/lib/tomtom";

/* ============================================================
   TYPES
   ============================================================ */

export type MarkerKind =
  | "me" // red dot (the client on the home screen)
  | "client" // green pulsing dot (the person needing help)
  | "ambulance"
  | "fire"
  | "emergency" // red pin
  | "hospital"; // white circle with a red cross

export type TomTomMapStyle = "day" | "night" | "satellite";

type MarkerSpec = {
  id: string;
  kind: MarkerKind;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  /** Short name drawn under the marker (hidden when zoomed far out). */
  label?: string;
};

type LineSpec = {
  id: string;
  coordinates: [number, number][];
  color: string;
  width: number;
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Padding = { top: number; right: number; bottom: number; left: number };

export type TomTomMapHandle = {
  fitToCoordinates: (
    coordinates: LatLng[],
    options?: { edgePadding?: Padding; animated?: boolean }
  ) => void;
  animateToRegion: (region: Region, durationMs?: number) => void;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  showTraffic?: boolean;
  /** day (default), night or satellite. Can change at any time. */
  mapStyle?: TomTomMapStyle;
  /**
   * Extra zoom levels added to the region's zoom. Default 1 (about twice as close).
   * Applies to the initial view and animateToRegion, not fitToCoordinates.
   */
  zoomBoost?: number;
  /** Show hospitals near the map centre, with names. Default true. */
  showHospitals?: boolean;
  /** Show the road name at the map centre. Default true. */
  showStreetName?: boolean;
  onMapReady?: () => void;
  /** The user dragged the map by hand. */
  onPanDrag?: () => void;
  /** true while a finger is on the map: lock the parent ScrollView. */
  onInteractionChange?: (active: boolean) => void;
  children?: React.ReactNode;
};

type MapContextValue = {
  setMarker: (spec: MarkerSpec) => void;
  removeMarker: (id: string) => void;
  setLine: (spec: LineSpec) => void;
  removeLine: (id: string) => void;
};

const MapContext = createContext<MapContextValue | null>(null);

const DEFAULT_ZOOM_BOOST = 1;
const MAX_ZOOM = 19;

/* ============================================================
   THE PAGE THAT RUNS INSIDE THE WEBVIEW
   (Leaflet draws the map; every tile and byte of map data is TomTom's.)
   ============================================================ */

const PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #E2E8F0; }
  #map.dark { background: #1E293B; }
  .leaflet-container { font-family: -apple-system, Roboto, sans-serif; }
  .leaflet-control-attribution { font-size: 9px; }
  .mk { position: relative; display: flex; align-items: center; justify-content: center; }
  .circle { position: relative; z-index: 1; box-sizing: border-box; border-radius: 50%; border: 3px solid #fff; background: #DC2626;
            box-shadow: 0 2px 5px rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; }

  /* Signal rings: the element's width/height is the FINAL ring diameter.
     Two rings run staggered so the signal keeps spreading outward. */
  .pulse { position: absolute; left: 50%; top: 50%; border-radius: 50%; pointer-events: none;
           transform: translate(-50%, -50%) scale(.15); opacity: 0;
           animation: p 2.6s ease-out infinite; }
  .pulse.b { animation-delay: 1.3s; }
  @keyframes p {
    0%   { transform: translate(-50%, -50%) scale(.15); opacity: .85; }
    100% { transform: translate(-50%, -50%) scale(1);   opacity: 0; }
  }

  .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 14px rgba(15,23,42,.25); }
  .leaflet-popup-content { margin: 10px 12px; font-size: 12px; line-height: 17px; color: #0F172A; }

  .leaflet-tooltip.lbl { background: rgba(255,255,255,.96); border: 0; border-radius: 8px; color: #0F172A;
            box-shadow: 0 1px 4px rgba(15,23,42,.3); font-size: 10px; font-weight: 700; padding: 2px 7px;
            max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .leaflet-tooltip.lbl:before { display: none; }
  .zlow .leaflet-tooltip.lbl { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var KEY = __KEY__;
  var INIT = __INIT__;

  function post(o) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  }

  var mapEl = document.getElementById('map');

  var map = L.map('map', {
    zoomControl: false,
    zoomSnap: 0.25,
    attributionControl: true
  }).setView([INIT.lat, INIT.lng], INIT.zoom);

  map.attributionControl.setPrefix(false);

  /* ---------- base map style ---------- */

  var STYLES = {
    day:       { layer: 'basic',  style: 'main',  ext: 'png' },
    night:     { layer: 'basic',  style: 'night', ext: 'png' },
    satellite: { layer: 'hybrid', style: 'main',  ext: 'jpg' }
  };
  var base = null;
  var baseName = null;

  function setStyle(name) {
    if (!STYLES[name]) name = 'day';
    if (name === baseName) return;

    var s = STYLES[name];
    var next = L.tileLayer(
      'https://api.tomtom.com/map/1/tile/' + s.layer + '/' + s.style + '/{z}/{x}/{y}.' + s.ext +
        '?key=' + KEY + '&tileSize=512',
      { tileSize: 512, zoomOffset: -1, minZoom: 3, maxZoom: 20, attribution: '&copy; TomTom' }
    );
    next.addTo(map);
    next.bringToBack();               // stays under the traffic layer
    if (base) map.removeLayer(base);

    base = next;
    baseName = name;
    mapEl.classList.toggle('dark', name === 'night');
  }
  setStyle(INIT.style);

  /* ---------- traffic ---------- */

  var traffic = null;
  function setTraffic(on) {
    if (on && !traffic) {
      traffic = L.tileLayer(
        'https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=' + KEY + '&tileSize=512',
        { tileSize: 512, zoomOffset: -1, minZoom: 3, maxZoom: 20, opacity: 0.85 }
      ).addTo(map);
    } else if (!on && traffic) {
      map.removeLayer(traffic);
      traffic = null;
    }
  }
  setTraffic(INIT.traffic);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- marker icons ---------- */

  // Two staggered rings; "d" is the final ring diameter in px.
  function rings(d, rgba) {
    var st = 'width:' + d + 'px;height:' + d + 'px;background:' + rgba;
    return '<div class="pulse" style="' + st + '"></div>' +
           '<div class="pulse b" style="' + st + '"></div>';
  }

  var iconCache = Object.create(null);

  function iconFor(kind) {
    if (iconCache[kind]) return iconCache[kind];
    var html, size = 46, ax = 23, ay = 23;

    if (kind === 'client') {
      size = 42; ax = 21; ay = 21;
      html = '<div class="mk" style="width:42px;height:42px">' +
        rings(180, 'rgba(22,163,74,.28)') +
        '<div class="circle" style="width:25px;height:25px;border:2px solid #16A34A;background:#fff">' +
        '<div style="width:11px;height:11px;border-radius:50%;background:#16A34A"></div></div></div>';
    } else if (kind === 'me') {
      size = 24; ax = 12; ay = 12;
      html = '<div class="mk" style="width:24px;height:24px">' +
        rings(170, 'rgba(220,38,38,.25)') +
        '<div class="circle" style="width:24px;height:24px"><div style="width:7px;height:7px;border-radius:50%;background:#fff"></div></div></div>';
    } else if (kind === 'emergency') {
      size = 36; ax = 18; ay = 34;
      html = '<div style="width:30px;height:30px;margin:3px;box-sizing:border-box;background:#DC2626;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><div style="width:10px;height:10px;border-radius:50%;background:#fff"></div></div>';
    } else if (kind === 'hospital') {
      size = 28; ax = 14; ay = 14;
      html = '<div class="circle" style="width:28px;height:28px;background:#fff;border:2px solid #DC2626"><div style="position:relative;width:14px;height:14px"><div style="position:absolute;left:5px;top:0;width:4px;height:14px;background:#DC2626;border-radius:1px"></div><div style="position:absolute;left:0;top:5px;width:14px;height:4px;background:#DC2626;border-radius:1px"></div></div></div>';
    } else {
      var glyph = kind === 'fire' ? '&#128658;' : '&#128657;';
      html = '<div class="mk" style="width:46px;height:46px">' + rings(150, 'rgba(220,38,38,.25)') + '<div class="circle" style="width:34px;height:34px;font-size:17px">' + glyph + '</div></div>';
    }
    iconCache[kind] = L.divIcon({ html: html, className: '', iconSize: [size, size], iconAnchor: [ax, ay] });
    return iconCache[kind];
  }

  function labelOffset(kind) {
    if (kind === 'emergency') return [0, 4];
    if (kind === 'hospital') return [0, 12];
    if (kind === 'me') return [0, 10];
    return [0, 20];
  }

  function tip(kind) {
    return { permanent: true, direction: 'bottom', offset: labelOffset(kind), className: 'lbl', opacity: 1 };
  }

  /* ---------- incremental markers and lines driven by React Native ---------- */
  var markers = Object.create(null);
  var lines = Object.create(null);

  function markerText(m) {
    return m.title ? '<b>' + esc(m.title) + '</b>' + (m.description ? '<br>' + esc(m.description) : '') : '';
  }

  function upsertMarker(m) {
    if (!m || !m.id || !isFinite(m.latitude) || !isFinite(m.longitude)) return;
    var ll = [m.latitude, m.longitude];
    var mk = markers[m.id];
    if (!mk) {
      var z = m.kind === 'emergency' ? 500 : (m.kind === 'me' || m.kind === 'client') ? 200 : 0;
      mk = L.marker(ll, { icon: iconFor(m.kind), zIndexOffset: z }).addTo(map);
      mk._kind = m.kind;
      mk._lastLat = m.latitude;
      mk._lastLng = m.longitude;
      markers[m.id] = mk;
    } else {
      if (mk._lastLat !== m.latitude || mk._lastLng !== m.longitude) {
        mk.setLatLng(ll);
        mk._lastLat = m.latitude;
        mk._lastLng = m.longitude;
      }
      if (mk._kind !== m.kind) {
        mk.setIcon(iconFor(m.kind));
        mk._kind = m.kind;
      }
    }
    var text = markerText(m);
    if (mk._text !== text) {
      mk._text = text;
      if (text) mk.bindPopup(text); else mk.unbindPopup();
    }
    var lk = m.kind + '|' + (m.label || '');
    if (mk._lk !== lk) {
      mk._lk = lk;
      mk.unbindTooltip();
      if (m.label) mk.bindTooltip(m.label, tip(m.kind));
    }
  }

  function removeMarker(id) {
    if (!markers[id]) return;
    map.removeLayer(markers[id]);
    delete markers[id];
  }

  function sameCoordinates(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!b[i] || a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
    }
    return true;
  }

  function upsertLine(l) {
    if (!l || !l.id || !Array.isArray(l.coordinates) || !l.coordinates.length) return;
    var pair = lines[l.id];
    if (!pair) {
      var casing = L.polyline(l.coordinates, { color: '#FFFFFF', weight: l.width + 4, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(map);
      var main = L.polyline(l.coordinates, { color: l.color, weight: l.width, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(map);
      lines[l.id] = { casing: casing, main: main, coordinates: l.coordinates.map(function (p) { return [p[0], p[1]]; }), color: l.color, width: l.width };
      return;
    }
    if (!sameCoordinates(pair.coordinates, l.coordinates)) {
      pair.casing.setLatLngs(l.coordinates);
      pair.main.setLatLngs(l.coordinates);
      pair.coordinates = l.coordinates.map(function (p) { return [p[0], p[1]]; });
    }
    if (pair.width !== l.width) {
      pair.casing.setStyle({ weight: l.width + 4 });
      pair.main.setStyle({ weight: l.width });
      pair.width = l.width;
    }
    if (pair.color !== l.color) {
      pair.main.setStyle({ color: l.color });
      pair.color = l.color;
    }
  }

  function removeLine(id) {
    var pair = lines[id];
    if (!pair) return;
    map.removeLayer(pair.casing);
    map.removeLayer(pair.main);
    delete lines[id];
  }

  function applyOperations(operations) {
    (operations || []).forEach(function (op) {
      if (op.op === 'upsert_marker') upsertMarker(op.marker);
      else if (op.op === 'remove_marker') removeMarker(op.id);
      else if (op.op === 'upsert_line') upsertLine(op.line);
      else if (op.op === 'remove_line') removeLine(op.id);
    });
  }

  window.__snapshot = function (state) {
    var seenMarkers = Object.create(null);
    var seenLines = Object.create(null);
    (state.markers || []).forEach(function (m) { seenMarkers[m.id] = true; upsertMarker(m); });
    Object.keys(markers).forEach(function (id) { if (!seenMarkers[id]) removeMarker(id); });
    (state.lines || []).forEach(function (l) { seenLines[l.id] = true; upsertLine(l); });
    Object.keys(lines).forEach(function (id) { if (!seenLines[id]) removeLine(id); });
  };

  var seenNativeMessageIds = Object.create(null);
  var seenNativeMessageOrder = [];
  function handleNativeMessage(raw) {
    var msg = raw;
    try { if (typeof raw === 'string') msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    if (msg._id != null) {
      if (seenNativeMessageIds[msg._id]) return;
      seenNativeMessageIds[msg._id] = true;
      seenNativeMessageOrder.push(msg._id);
      while (seenNativeMessageOrder.length > 100) delete seenNativeMessageIds[seenNativeMessageOrder.shift()];
    }
    if (msg.type === 'snapshot') window.__snapshot(msg.state || {});
    else if (msg.type === 'map_ops') applyOperations(msg.operations);
    else if (msg.type === 'command') {
      var a = msg.args || {};
      if (msg.name === 'traffic') setTraffic(!!a.enabled);
      else if (msg.name === 'style') setStyle(a.style);
      else if (msg.name === 'hospitals') window.__hospitals(!!a.enabled);
      else if (msg.name === 'fit') window.__fit(a.points, a.padding, a.maxZoom, a.animated);
      else if (msg.name === 'fly') window.__fly(a.latitude, a.longitude, a.zoom, a.durationMs);
    }
  }
  // React Native WebView dispatches native messages differently across platforms.
  document.addEventListener('message', function (e) { handleNativeMessage(e.data); });
  window.addEventListener('message', function (e) { handleNativeMessage(e.data); });

  /* ---------- nearby hospitals (TomTom Nearby Search, category 7321) ---------- */

  var hospitals = Object.create(null);
  var showHosp = INIT.hospitals;
  var lastHosp = null;
  var hospitalRequest = null;
  var hospitalCache = Object.create(null);
  var hospitalCacheOrder = [];

  function cachePut(cache, order, key, value, max) {
    cache[key] = { value: value, time: Date.now() };
    var idx = order.indexOf(key);
    if (idx >= 0) order.splice(idx, 1);
    order.push(key);
    while (order.length > max) delete cache[order.shift()];
  }
  function cacheGet(cache, key, ttl) {
    var entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.time > ttl) { delete cache[key]; return null; }
    return entry.value;
  }
  function hospitalKey(c) { return (Math.round(c.lat * 100) / 100) + ':' + (Math.round(c.lng * 100) / 100); }

  function renderHospitals(results) {
    (results || []).forEach(function (p) {
      if (!p.poi || !p.position) return;
      var id = p.id || (p.poi.name + p.position.lat + p.position.lon);
      var name = p.poi.name || 'Hospital';
      var addr = p.address && p.address.freeformAddress ? p.address.freeformAddress : '';
      var phone = p.poi.phone || '';
      if (!hospitals[id]) {
        var m = L.marker([p.position.lat, p.position.lon], { icon: iconFor('hospital'), zIndexOffset: 100 });
        m.bindPopup('<b>' + esc(name) + '</b>' + (addr ? '<br>' + esc(addr) : '') + (phone ? '<br>' + esc(phone) : ''));
        m.bindTooltip(name, tip('hospital'));
        hospitals[id] = m;
      }
      if (showHosp && !map.hasLayer(hospitals[id])) hospitals[id].addTo(map);
    });
  }

  function loadHospitals() {
    if (!showHosp || !KEY || map.getZoom() < 12) return;
    var c = map.getCenter();
    if (lastHosp && map.distance(lastHosp, c) < 1500) return;
    lastHosp = L.latLng(c.lat, c.lng);
    var key = hospitalKey(c);
    var cached = cacheGet(hospitalCache, key, 10 * 60 * 1000);
    if (cached) { renderHospitals(cached); return; }
    if (hospitalRequest) hospitalRequest.abort();
    hospitalRequest = new AbortController();
    var controller = hospitalRequest;
    fetch('https://api.tomtom.com/search/2/nearbySearch/.json?lat=' + c.lat + '&lon=' + c.lng + '&radius=6000&limit=15&categorySet=7321&key=' + KEY, { signal: controller.signal })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (controller !== hospitalRequest) return;
        if (!j || !j.results) { lastHosp = null; return; }
        cachePut(hospitalCache, hospitalCacheOrder, key, j.results, 24);
        renderHospitals(j.results);
      })
      .catch(function (e) { if (e && e.name !== 'AbortError' && controller === hospitalRequest) lastHosp = null; })
      .then(function () { if (controller === hospitalRequest) hospitalRequest = null; });
  }

  window.__hospitals = function (on) {
    showHosp = !!on;
    Object.keys(hospitals).forEach(function (id) {
      if (showHosp) { hospitals[id].addTo(map); } else { map.removeLayer(hospitals[id]); }
    });
    if (showHosp) loadHospitals();
  };

  /* ---------- road name at the map centre (TomTom Reverse Geocode) ---------- */

  var lastStreet = null;
  var streetRequest = null;
  var streetCache = Object.create(null);
  var streetCacheOrder = [];

  function loadStreet() {
    if (!INIT.street || !KEY) return;
    if (map.getZoom() < 14) {
      if (streetRequest) { streetRequest.abort(); streetRequest = null; }
      lastStreet = null;
      post({ type: 'street', name: '' });
      return;
    }
    var c = map.getCenter();
    if (lastStreet && map.distance(lastStreet, c) < 40) return;
    lastStreet = L.latLng(c.lat, c.lng);
    var key = Math.round(c.lat * 10000) + ':' + Math.round(c.lng * 10000);
    var cached = cacheGet(streetCache, key, 15 * 60 * 1000);
    if (cached !== null) { post({ type: 'street', name: cached }); return; }
    if (streetRequest) streetRequest.abort();
    streetRequest = new AbortController();
    var controller = streetRequest;
    fetch('https://api.tomtom.com/search/2/reverseGeocode/' + c.lat + ',' + c.lng + '.json?radius=150&key=' + KEY, { signal: controller.signal })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (controller !== streetRequest) return;
        var a = j && j.addresses && j.addresses[0] && j.addresses[0].address;
        if (!a) return;
        var road = a.streetName || '';
        var area = a.municipalitySubdivision || a.municipality || '';
        var name = road ? (area ? road + ' \\u00B7 ' + area : road) : area;
        cachePut(streetCache, streetCacheOrder, key, name, 60);
        post({ type: 'street', name: name });
      })
      .catch(function (e) { if (e && e.name !== 'AbortError' && controller === streetRequest) lastStreet = null; })
      .then(function () { if (controller === streetRequest) streetRequest = null; });
  }

  /* ---------- camera ---------- */

  window.__fit = function (pts, pad, maxZoom, animated) {
    if (!pts || !pts.length) return;
    map.fitBounds(L.latLngBounds(pts), {
      paddingTopLeft: [pad.left, pad.top],
      paddingBottomRight: [pad.right, pad.bottom],
      maxZoom: maxZoom || 18,
      animate: animated !== false && pts.length < 100
    });
  };

  window.__fly = function (lat, lng, zoom, ms) {
    map.flyTo([lat, lng], zoom, { duration: Math.max(0.1, (ms || 600) / 1000) });
  };

  window.__traffic = setTraffic;
  window.__style = setStyle;

  /* ---------- events ---------- */

  var idleTimer = null;

  function onIdle() {
    mapEl.classList.toggle('zlow', map.getZoom() < 14);   // hide name labels when zoomed far out
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      loadHospitals();
      loadStreet();
    }, 700);
  }

  map.on('moveend zoomend', onIdle);
  map.on('dragstart', function () { post({ type: 'drag' }); });

  document.addEventListener('touchstart', function () { post({ type: 'touch', active: true }); }, { passive: true });
  document.addEventListener('touchend', function () { post({ type: 'touch', active: false }); }, { passive: true });
  document.addEventListener('touchcancel', function () { post({ type: 'touch', active: false }); }, { passive: true });

  window.addEventListener('resize', function () { map.invalidateSize(); });

  map.whenReady(function () {
    onIdle();
    post({ type: 'ready' });
  });
})();
</script>
</body>
</html>`;

function safeJson(value: unknown): string {
  // JSON is valid JavaScript except for the U+2028 / U+2029 separators.
  return JSON.stringify(value)
    .split(String.fromCharCode(0x2028))
    .join("\\u2028")
    .split(String.fromCharCode(0x2029))
    .join("\\u2029");
}

function zoomFor(latitudeDelta: number, boost: number): number {
  const zoom = Math.log2(360 / Math.max(latitudeDelta, 0.0001)) + boost;
  return Math.max(3, Math.min(MAX_ZOOM, zoom));
}

function buildHtml(
  region: Region,
  opts: {
    traffic: boolean;
    style: TomTomMapStyle;
    hospitals: boolean;
    street: boolean;
    boost: number;
  }
): string {
  const init = {
    lat: region.latitude,
    lng: region.longitude,
    zoom: zoomFor(region.latitudeDelta, opts.boost),
    traffic: opts.traffic,
    style: opts.style,
    hospitals: opts.hospitals,
    street: opts.street,
  };

  return PAGE.replace("__KEY__", () => JSON.stringify(TOMTOM_KEY)).replace(
    "__INIT__",
    () => safeJson(init)
  );
}

/* ============================================================
   MAP COMPONENT
   ============================================================ */

export const TomTomMap = forwardRef<TomTomMapHandle, Props>(function TomTomMap(
  props,
  ref
) {
  const {
    style,
    initialRegion,
    showTraffic = false,
    mapStyle = "day",
    showHospitals = true,
    showStreetName = true,
    children,
  } = props;

  const webRef = useRef<React.ComponentRef<typeof WebView>>(null);
  const readyRef = useRef(false);
  const markersRef = useRef(new Map<string, MarkerSpec>());
  const linesRef = useRef(new Map<string, LineSpec>());
  const pendingOpsRef = useRef(new Map<string, Record<string, unknown>>());
  const commandQueueRef = useRef<Array<{ type: string; name: string; args: Record<string, unknown> }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [street, setStreet] = useState("");
  const propsRef = useRef(props);
  propsRef.current = props;

  const initialRef = useRef({
    region: initialRegion,
    traffic: showTraffic,
    style: mapStyle,
    hospitals: showHospitals,
    street: showStreetName,
    boost: props.zoomBoost ?? DEFAULT_ZOOM_BOOST,
  });
  const html = useMemo(() => buildHtml(initialRef.current.region, {
    traffic: initialRef.current.traffic,
    style: initialRef.current.style,
    hospitals: initialRef.current.hospitals,
    street: initialRef.current.street,
    boost: initialRef.current.boost,
  }), []);

  const messageIdRef = useRef(0);
  const postNativeMessage = useCallback((message: Record<string, unknown>) => {
    try {
      const envelope = { ...message, _id: ++messageIdRef.current };
      webRef.current?.postMessage(JSON.stringify(envelope));
    } catch {
      // A WebView may be between processes; the next ready event sends a fresh snapshot.
    }
  }, []);

  const sendCommand = useCallback((name: string, args: Record<string, unknown>, coalesce = true) => {
    if (!readyRef.current) {
      if (coalesce) {
        commandQueueRef.current = commandQueueRef.current.filter((item) => item.name !== name);
      }
      commandQueueRef.current.push({ type: "command", name, args });
      if (commandQueueRef.current.length > 50) commandQueueRef.current.splice(0, commandQueueRef.current.length - 50);
      return;
    }
    postNativeMessage({ type: "command", name, args });
  }, [postNativeMessage]);

  const flushOperations = useCallback(() => {
    timerRef.current = null;
    if (!readyRef.current || pendingOpsRef.current.size === 0) return;
    const operations = Array.from(pendingOpsRef.current.values());
    pendingOpsRef.current.clear();
    postNativeMessage({ type: "map_ops", operations });
  }, [postNativeMessage]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(flushOperations, 16);
  }, [flushOperations]);

  const queueOperation = useCallback((key: string, operation: Record<string, unknown>) => {
    // Coalesce repeated changes to the same entity while the 16ms batch is pending.
    pendingOpsRef.current.set(key, operation);
    scheduleFlush();
  }, [scheduleFlush]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingOpsRef.current.clear();
    commandQueueRef.current = [];
  }, []);

  const sameMarker = (a: MarkerSpec | undefined, b: MarkerSpec) => !!a && a.id === b.id && a.kind === b.kind && a.latitude === b.latitude && a.longitude === b.longitude && a.title === b.title && a.description === b.description && a.label === b.label;
  const sameLine = (a: LineSpec | undefined, b: LineSpec) => {
    if (!a || a.id !== b.id || a.color !== b.color || a.width !== b.width || a.coordinates.length !== b.coordinates.length) return false;
    return a.coordinates.every((point, i) => point[0] === b.coordinates[i]?.[0] && point[1] === b.coordinates[i]?.[1]);
  };

  const context = useMemo<MapContextValue>(() => ({
    setMarker: (spec) => {
      const previous = markersRef.current.get(spec.id);
      if (sameMarker(previous, spec)) return;
      markersRef.current.set(spec.id, spec);
      queueOperation("marker:" + spec.id, { op: "upsert_marker", marker: spec });
    },
    removeMarker: (id) => {
      if (!markersRef.current.has(id)) return;
      markersRef.current.delete(id);
      queueOperation("marker:" + id, { op: "remove_marker", id });
    },
    setLine: (spec) => {
      const previous = linesRef.current.get(spec.id);
      if (sameLine(previous, spec)) return;
      linesRef.current.set(spec.id, spec);
      queueOperation("line:" + spec.id, { op: "upsert_line", line: spec });
    },
    removeLine: (id) => {
      if (!linesRef.current.has(id)) return;
      linesRef.current.delete(id);
      queueOperation("line:" + id, { op: "remove_line", id });
    },
  }), [queueOperation]);

  useEffect(() => { sendCommand("traffic", { enabled: showTraffic }); }, [showTraffic, sendCommand]);
  useEffect(() => { sendCommand("style", { style: mapStyle }); }, [mapStyle, sendCommand]);
  useEffect(() => { sendCommand("hospitals", { enabled: showHospitals }); }, [showHospitals, sendCommand]);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coordinates, options) => {
      if (!coordinates || coordinates.length === 0) return;
      const padding = options?.edgePadding ?? { top: 40, right: 40, bottom: 40, left: 40 };
      sendCommand("fit", {
        points: coordinates.map((c) => [c.latitude, c.longitude]),
        padding,
        maxZoom: 18,
        animated: options?.animated ?? true,
      }, false);
    },
    animateToRegion: (region, durationMs = 600) => {
      const boost = propsRef.current.zoomBoost ?? DEFAULT_ZOOM_BOOST;
      sendCommand("fly", {
        latitude: region.latitude,
        longitude: region.longitude,
        zoom: zoomFor(region.latitudeDelta, boost),
        durationMs,
      }, false);
    },
  }), [sendCommand]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let message: { type?: string; active?: boolean; name?: string };
    try { message = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (message.type === "ready") {
      readyRef.current = true;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      pendingOpsRef.current.clear();
      postNativeMessage({
        type: "snapshot",
        state: {
          markers: Array.from(markersRef.current.values()),
          lines: Array.from(linesRef.current.values()),
        },
      });
      const queued = commandQueueRef.current;
      commandQueueRef.current = [];
      queued.forEach((command) => postNativeMessage(command));
      propsRef.current.onMapReady?.();
    } else if (message.type === "drag") {
      propsRef.current.onPanDrag?.();
    } else if (message.type === "touch") {
      propsRef.current.onInteractionChange?.(!!message.active);
    } else if (message.type === "street") {
      setStreet(message.name ?? "");
    }
  }, [postNativeMessage]);

  const recover = useCallback(() => {
    readyRef.current = false;
    webRef.current?.reload();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <MapContext.Provider value={context}>
        <WebView
          ref={webRef}
          source={{ html }}
          style={styles.web}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          androidLayerType="hardware"
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          onMessage={onMessage}
          onContentProcessDidTerminate={recover}
          onRenderProcessGone={recover}
        />

        {children}
      </MapContext.Provider>

      {showStreetName && !!street && (
        <View style={styles.streetChip} pointerEvents="none">
          <Ionicons name="navigate" size={11} color="#DC2626" />
          <Text style={styles.streetText} numberOfLines={1}>
            {street}
          </Text>
        </View>
      )}

      {!TOMTOM_KEY && (
        <View style={styles.missingKey} pointerEvents="none">
          <Text style={styles.missingKeyText}>
            TomTom key missing. Set EXPO_PUBLIC_TOMTOM_API_KEY and restart
            Expo with `npx expo start -c`.
          </Text>
        </View>
      )}
    </View>
  );
});

/* ============================================================
   DECLARATIVE CHILDREN (render nothing; they register with the map)
   ============================================================ */

export function TomTomMarker({
  id,
  kind,
  coordinate,
  title,
  description,
  label,
}: {
  id: string;
  kind: MarkerKind;
  coordinate: LatLng;
  title?: string;
  description?: string;
  label?: string;
}) {
  const context = useContext(MapContext);
  const { latitude, longitude } = coordinate;

  useEffect(() => {
    context?.setMarker({
      id,
      kind,
      latitude,
      longitude,
      title,
      description,
      label,
    });
  }, [context, id, kind, latitude, longitude, title, description, label]);

  useEffect(() => {
    return () => context?.removeMarker(id);
  }, [context, id]);

  return null;
}

export function TomTomPolyline({
  id,
  coordinates,
  color,
  width = 5,
}: {
  id: string;
  coordinates: LatLng[];
  color: string;
  width?: number;
}) {
  const context = useContext(MapContext);

  useEffect(() => {
    context?.setLine({
      id,
      color,
      width,
      coordinates: coordinates.map((c) => [c.latitude, c.longitude]),
    });
  }, [context, id, coordinates, color, width]);

  useEffect(() => {
    return () => context?.removeLine(id);
  }, [context, id]);

  return null;
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  web: {
    flex: 1,
    backgroundColor: "#E2E8F0",
  },
  streetChip: {
    position: "absolute",
    top: 10,
    left: 10,
    maxWidth: "70%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  streetText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  missingKey: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(248,250,252,0.94)",
  },
  missingKeyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
    textAlign: "center",
  },
});