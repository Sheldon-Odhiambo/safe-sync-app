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

/**
 * Colour tint laid over the map tiles (markers, routes and traffic keep their own colours).
 * classic = TomTom's original colours.
 */
export type TomTomMapTheme =
  | "classic"
  | "ocean"
  | "forest"
  | "sunset"
  | "rose"
  | "mono";

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
    options?: {
      edgePadding?: Padding;
      animated?: boolean;
      /** Keep cached hospitals / street name. Default false (refresh them). */
      keepCache?: boolean;
    }
  ) => void;
  animateToRegion: (
    region: Region,
    durationMs?: number,
    options?: { keepCache?: boolean }
  ) => void;
  /** Drop cached hospitals / street name and reload them for the current view. */
  refreshLocationData: () => void;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  showTraffic?: boolean;
  /** day (default), night or satellite. Can change at any time. */
  mapStyle?: TomTomMapStyle;
  /** Colour tint for the map: classic (default), ocean, forest, sunset, rose, mono. */
  theme?: TomTomMapTheme;
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
  :root {
    --ink: #0F172A;
    --card: rgba(255,255,255,.97);
    --card-line: rgba(15,23,42,.08);
    --muted: #64748B;
    --shadow: 0 6px 20px rgba(15,23,42,.22);
  }
  body.dark {
    --ink: #F1F5F9;
    --card: rgba(30,41,59,.96);
    --card-line: rgba(255,255,255,.10);
    --muted: #94A3B8;
    --shadow: 0 6px 20px rgba(0,0,0,.55);
  }

  html, body, #map { height: 100%; margin: 0; padding: 0; background: #E8EDF3; }
  #map.dark { background: #1E293B; }
  .leaflet-tile-pane { transition: filter .5s ease; }
  .leaflet-container { font-family: -apple-system, "SF Pro Text", Roboto, "Segoe UI", sans-serif; -webkit-tap-highlight-color: transparent; }

  /* Attribution: tiny frosted pill */
  .leaflet-control-attribution { font-size: 9px; color: var(--muted); background: var(--card) !important;
            border-radius: 8px 0 0 0; padding: 1px 6px; box-shadow: none; }
  .leaflet-control-attribution a { color: var(--muted); }

  /* Markers fade in instead of popping */
  .leaflet-marker-icon > div { animation: fi .28s ease-out both; }
  @keyframes fi { from { opacity: 0; } to { opacity: 1; } }

  .mk { position: relative; display: flex; align-items: center; justify-content: center; }
  .circle { position: relative; z-index: 1; box-sizing: border-box; border-radius: 50%; border: 3px solid #fff; background: #DC2626;
            box-shadow: 0 3px 8px rgba(15,23,42,.35), 0 0 0 1px rgba(15,23,42,.06);
            display: flex; align-items: center; justify-content: center; }

  /* Signal rings: the element's width/height is the FINAL ring diameter.
     Two rings run staggered so the signal keeps spreading outward. */
  .pulse { position: absolute; left: 50%; top: 50%; border-radius: 50%; pointer-events: none;
           transform: translate(-50%, -50%) scale(.15); opacity: 0;
           animation: p 2.8s cubic-bezier(.2,.6,.3,1) infinite; }
  .pulse.b { animation-delay: 1.4s; }
  @keyframes p {
    0%   { transform: translate(-50%, -50%) scale(.15); opacity: .9; }
    70%  { opacity: .25; }
    100% { transform: translate(-50%, -50%) scale(1);   opacity: 0; }
  }

  /* Popups: floating rounded card */
  .leaflet-popup-content-wrapper { background: var(--card); color: var(--ink); border-radius: 16px;
            box-shadow: var(--shadow); border: 1px solid var(--card-line); }
  .leaflet-popup-tip { background: var(--card); box-shadow: none; }
  .leaflet-popup-content { margin: 12px 14px; font-size: 12px; line-height: 17px; color: var(--ink); }
  .leaflet-container a.leaflet-popup-close-button { color: var(--muted); top: 6px; right: 6px; }
  .pop-t { font-size: 13px; font-weight: 800; letter-spacing: -.1px; }
  .pop-s { margin-top: 3px; color: var(--muted); font-weight: 500; }

  /* Labels: small pill under each marker */
  .leaflet-tooltip.lbl { background: var(--card); border: 1px solid var(--card-line); border-radius: 999px; color: var(--ink);
            box-shadow: 0 2px 8px rgba(15,23,42,.22); font-size: 10px; font-weight: 800; letter-spacing: .1px;
            padding: 3px 9px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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

  /* Traffic lives in its own pane so the theme tint never recolours it. */
  map.createPane('traffic');
  map.getPane('traffic').style.zIndex = 250;
  map.getPane('traffic').style.pointerEvents = 'none';

  var markers = {};
  var lines = {};

  /* ---------- colour themes (a tint over the base tiles only) ----------
     tint(hue, strength, saturation): sepia gives a warm base, hue-rotate swings it
     to the target hue (sepia sits at ~35deg). Tweak these numbers to taste. */
  function tint(h, s, sat) {
    return 'sepia(' + s + ') hue-rotate(' + (h - 35) + 'deg) saturate(' + sat + ')';
  }
  var THEMES = {
    classic: { day: 'none', night: 'none' },
    ocean:   { day: tint(205, 0.40, 1.5), night: tint(210, 0.50, 1.4) },
    forest:  { day: tint(140, 0.40, 1.5), night: tint(145, 0.50, 1.3) },
    sunset:  { day: tint(25,  0.50, 1.5), night: tint(20,  0.50, 1.3) },
    rose:    { day: tint(340, 0.40, 1.5), night: tint(335, 0.50, 1.3) },
    mono:    { day: 'grayscale(1) contrast(1.05) brightness(1.04)', night: 'grayscale(1) contrast(1.1)' }
  };
  var themeName = INIT.theme || 'classic';

  function applyTheme() {
    var t = THEMES[themeName] || THEMES.classic;
    var f = baseName === 'satellite'
      ? 'saturate(1.08) contrast(1.04)'
      : (baseName === 'night' ? t.night : t.day);
    map.getPane('tilePane').style.filter = f;
  }

  function setTheme(name) {
    if (!THEMES[name]) name = 'classic';
    themeName = name;
    applyTheme();
  }

  /* ---------- base map style ---------- */

  var STYLES = {
    day:       { layer: 'basic',  style: 'main',  ext: 'png' },
    night:     { layer: 'basic',  style: 'night', ext: 'png' },
    satellite: { layer: 'hybrid', style: 'main',  ext: 'jpg' }
  };
  var base = null;
  var baseName = null;

  function casingColor() {
    return baseName === 'night' ? '#0F172A' : '#FFFFFF';
  }

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
    next.bringToBack();
    if (base) map.removeLayer(base);

    base = next;
    baseName = name;
    var dark = name === 'night';
    mapEl.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);
    applyTheme();

    Object.keys(lines).forEach(function (id) {
      if (lines[id] && lines[id].casing) lines[id].casing.setStyle({ color: casingColor() });
    });
  }
  setStyle(INIT.style);

  var traffic = null;
  function setTraffic(on) {
    if (on && !traffic) {
      traffic = L.tileLayer(
        'https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=' + KEY + '&tileSize=512',
        { tileSize: 512, zoomOffset: -1, minZoom: 3, maxZoom: 20, opacity: 0.85, pane: 'traffic' }
      ).addTo(map);
    } else if (!on && traffic) {
      map.removeLayer(traffic);
      traffic = null;
    }
  }
  setTraffic(INIT.traffic);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>\"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pop(title, desc) {
    return '<div class="pop-t">' + esc(title) + '</div>' + (desc ? '<div class="pop-s">' + desc + '</div>' : '');
  }

  /* ---------- marker icons ---------- */
  var ICON_CACHE = {};

  function rings(d, rgba) {
    var bg = 'radial-gradient(circle, ' + rgba + ' 0%, ' + rgba + ' 55%, rgba(255,255,255,0) 72%)';
    var st = 'width:' + d + 'px;height:' + d + 'px;background:' + bg;
    return '<div class="pulse" style="' + st + '"></div>' +
           '<div class="pulse b" style="' + st + '"></div>';
  }

  function buildIconHtml(kind) {
    if (kind === 'client') {
      return '<div class="mk" style="width:42px;height:42px">' +
        rings(190, 'rgba(22,163,74,.30)') +
        '<div class="circle" style="width:26px;height:26px;border:2.5px solid #16A34A;background:#fff">' +
        '<div style="width:11px;height:11px;border-radius:50%;background:#16A34A"></div></div></div>';
    } else if (kind === 'me') {
      return '<div class="mk" style="width:26px;height:26px">' +
        rings(180, 'rgba(220,38,38,.28)') +
        '<div class="circle" style="width:26px;height:26px">' +
        '<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div></div></div>';
    } else if (kind === 'emergency') {
      return '<div style="width:30px;height:30px;margin:3px;box-sizing:border-box;' +
        'background:linear-gradient(135deg,#EF4444,#B91C1C);' +
        'border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
        'box-shadow:0 4px 10px rgba(15,23,42,.4);display:flex;align-items:center;justify-content:center">' +
        '<div style="width:10px;height:10px;border-radius:50%;background:#fff"></div></div>';
    } else if (kind === 'hospital') {
      return '<div class="circle" style="width:28px;height:28px;background:#fff;border:2px solid #DC2626">' +
        '<div style="position:relative;width:14px;height:14px">' +
        '<div style="position:absolute;left:5px;top:0;width:4px;height:14px;background:#DC2626;border-radius:2px"></div>' +
        '<div style="position:absolute;left:0;top:5px;width:14px;height:4px;background:#DC2626;border-radius:2px"></div>' +
        '</div></div>';
    } else {
      var fire = kind === 'fire';
      var glyph = fire ? '&#128658;' : '&#128657;';
      var ring = fire ? 'rgba(234,88,12,.28)' : 'rgba(220,38,38,.28)';
      var bg = fire ? 'linear-gradient(135deg,#FB923C,#C2410C)' : 'linear-gradient(135deg,#EF4444,#B91C1C)';
      return '<div class="mk" style="width:46px;height:46px">' +
        rings(150, ring) +
        '<div class="circle" style="width:34px;height:34px;font-size:17px;background:' + bg + '">' + glyph + '</div></div>';
    }
  }

  function getIcon(kind) {
    if (ICON_CACHE[kind]) return ICON_CACHE[kind];
    var html = buildIconHtml(kind);
    var size = 46, ax = 23, ay = 23;
    if (kind === 'client') { size = 42; ax = 21; ay = 21; }
    else if (kind === 'me') { size = 26; ax = 13; ay = 13; }
    else if (kind === 'emergency') { size = 36; ax = 18; ay = 34; }
    else if (kind === 'hospital') { size = 28; ax = 14; ay = 14; }
    ICON_CACHE[kind] = L.divIcon({ html: html, className: '', iconSize: [size, size], iconAnchor: [ax, ay] });
    return ICON_CACHE[kind];
  }

  function labelOffset(kind) {
    if (kind === 'emergency') return [0, 4];
    if (kind === 'hospital') return [0, 12];
    if (kind === 'me') return [0, 11];
    return [0, 20];
  }

  function tip(kind) {
    return { permanent: true, direction: 'bottom', offset: labelOffset(kind), className: 'lbl', opacity: 1 };
  }

  function removeMarkerById(id) {
    if (!markers[id]) return;
    map.removeLayer(markers[id].mk);
    delete markers[id];
  }

  function removeLineById(id) {
    if (!lines[id]) return;
    map.removeLayer(lines[id].casing);
    map.removeLayer(lines[id].main);
    delete lines[id];
  }

  function coordsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
    }
    return true;
  }

  function applyAddMarker(m) {
    if (markers[m.id]) return applyUpdateMarker(m);
    var ll = [m.latitude, m.longitude];
    var mk = L.marker(ll, { icon: getIcon(m.kind), zIndexOffset: m.kind === 'emergency' ? 500 : (m.kind === 'me' || m.kind === 'client') ? 200 : 0 }).addTo(map);
    mk._spec = { latitude: m.latitude, longitude: m.longitude, kind: m.kind, title: m.title || '', description: m.description || '', label: m.label || '' };
    if (m.title) { mk.bindPopup(pop(m.title, m.description ? esc(m.description) : '')); }
    if (m.label) { mk.bindTooltip(m.label, tip(m.kind)); }
    markers[m.id] = { mk: mk };
  }

  function applyUpdateMarker(m) {
    var entry = markers[m.id];
    if (!entry) { applyAddMarker(m); return; }
    var mk = entry.mk;
    var old = mk._spec || {};

    if (old.latitude !== m.latitude || old.longitude !== m.longitude) {
      mk.setLatLng([m.latitude, m.longitude]);
    }

    if (old.kind !== m.kind) {
      mk.setIcon(getIcon(m.kind));
    }

    var text = m.title ? pop(m.title, m.description ? esc(m.description) : '') : '';
    if (mk._text !== text) {
      mk._text = text;
      if (text) { mk.bindPopup(text); } else { mk.unbindPopup(); }
    }

    var lk = m.kind + '|' + (m.label || '');
    if (mk._lk !== lk) {
      mk._lk = lk;
      mk.unbindTooltip();
      if (m.label) { mk.bindTooltip(m.label, tip(m.kind)); }
    }

    mk._spec = { latitude: m.latitude, longitude: m.longitude, kind: m.kind, title: m.title || '', description: m.description || '', label: m.label || '' };
  }

  function applyAddLine(l) {
    if (lines[l.id]) return applyUpdateLine(l);
    var casing = L.polyline(l.coordinates, {
      color: casingColor(), weight: l.width + 5, opacity: 0.95, lineJoin: 'round', lineCap: 'round'
    }).addTo(map);
    var main = L.polyline(l.coordinates, {
      color: l.color, weight: l.width, opacity: 1, lineJoin: 'round', lineCap: 'round'
    }).addTo(map);
    lines[l.id] = { casing: casing, main: main };
    lines[l.id]._spec = { coordinates: l.coordinates, color: l.color, width: l.width };
  }

  function applyUpdateLine(l) {
    var pair = lines[l.id];
    if (!pair) { applyAddLine(l); return; }
    var old = pair._spec || {};
    if (!coordsEqual(old.coordinates, l.coordinates)) {
      pair.casing.setLatLngs(l.coordinates);
      pair.main.setLatLngs(l.coordinates);
    }
    if (old.width !== l.width) {
      pair.casing.setStyle({ weight: l.width + 5 });
      pair.main.setStyle({ weight: l.width });
    }
    if (old.color !== l.color) {
      pair.main.setStyle({ color: l.color });
    }
    pair._spec = { coordinates: l.coordinates, color: l.color, width: l.width };
  }

  function applyRemoveMarker(id) { removeMarkerById(id); }
  function applyRemoveLine(id) { removeLineById(id); }

  function applyOperation(op) {
    if (!op || !op.type) return;
    try {
      if (op.type === 'add_marker') applyAddMarker(op.payload);
      else if (op.type === 'update_marker') applyUpdateMarker(op.payload);
      else if (op.type === 'remove_marker') applyRemoveMarker(op.payload.id || op.payload);
      else if (op.type === 'add_line') applyAddLine(op.payload);
      else if (op.type === 'update_line') applyUpdateLine(op.payload);
      else if (op.type === 'remove_line') applyRemoveLine(op.payload.id || op.payload);
      else if (op.type === 'replace_all') {
        var keep = {};
        (op.payload.markers || []).forEach(function (m) { applyAddMarker(m); keep[m.id] = true; });
        Object.keys(markers).forEach(function (id) { if (!keep[id]) removeMarkerById(id); });
        var keepL = {};
        (op.payload.lines || []).forEach(function (l) { applyAddLine(l); keepL[l.id] = true; });
        Object.keys(lines).forEach(function (id) { if (!keepL[id]) removeLineById(id); });
      } else if (op.type === 'set_style') {
        setStyle(op.payload);
      } else if (op.type === 'set_traffic') {
        setTraffic(!!op.payload);
      } else if (op.type === 'fit') {
        window.__fit(op.payload.pts, op.payload.pad, op.payload.maxZoom);
      } else if (op.type === 'fly') {
        window.__fly(op.payload.lat, op.payload.lng, op.payload.zoom, op.payload.ms);
      } else if (op.type === 'hospitals') {
        window.__hospitals(!!op.payload);
      } else if (op.type === 'invalidate') {
        window.__invalidate();
      } else if (op.type === 'set_theme') {
        setTheme(op.payload);
      }
    } catch (e) {}
  }

  function onMessageFromRN(e) {
    var data = e && e.data ? e.data : e;
    try {
      var msg = (typeof data === 'string') ? JSON.parse(data) : data;
      if (!msg || !msg.type) return;
      if (msg.type === 'map_update' && Array.isArray(msg.operations)) {
        msg.operations.forEach(applyOperation);
      } else if (msg.type === 'initial_sync') {
        applyOperation({ type: 'replace_all', payload: { markers: msg.markers || [], lines: msg.lines || [] } });
      } else if (msg.type === 'command') {
        applyOperation(msg.command);
      }
    } catch (err) {}
  }

  window.addEventListener('message', onMessageFromRN, false);
  document.addEventListener('message', onMessageFromRN, false);

  window.__sync = function (state) {
    try {
      var ops = [];
      (state.markers || []).forEach(function (m) { ops.push({ type: 'add_marker', payload: m }); });
      (state.lines || []).forEach(function (l) { ops.push({ type: 'add_line', payload: l }); });
      ops.forEach(applyOperation);
    } catch (e) {}
  };

  /* ---------- nearby data caches (short-lived on purpose) ---------- */

  var hospitals = {};
  var showHosp = INIT.hospitals;
  var lastHosp = null;
  var currentHospController = null;
  var hospitalsCache = {};
  var HOSP_CACHE_TTL = 1000 * 20; // 20 seconds
  var HOSP_MOVE_METERS = 400;     // reload once the centre moves this far

  function cacheKeyForCenter(c) {
    return Math.round(c.lat * 200) + ':' + Math.round(c.lng * 200);
  }

  function addHospital(p) {
    if (!p.poi || !p.position) return;
    var id = p.id || (p.poi.name + p.position.lat + p.position.lon);
    if (hospitals[id]) return;
    var name = p.poi.name || 'Hospital';
    var addr = p.address && p.address.freeformAddress ? p.address.freeformAddress : '';
    var phone = p.poi.phone ? p.poi.phone : '';
    var sub = (addr ? esc(addr) : '') + (phone ? (addr ? '<br>' : '') + esc(phone) : '');

    var m = L.marker([p.position.lat, p.position.lon], { icon: getIcon('hospital'), zIndexOffset: 100 });
    m.bindPopup(pop(name, sub));
    m.bindTooltip(name, tip('hospital'));
    if (showHosp) m.addTo(map);
    hospitals[id] = m;
  }

  function loadHospitals() {
    if (!showHosp || !KEY) return;
    if (map.getZoom() < 12) return;

    var c = map.getCenter();
    var key = cacheKeyForCenter(c);
    if (lastHosp && map.distance(lastHosp, c) < HOSP_MOVE_METERS) return;

    var cached = hospitalsCache[key];
    var now = Date.now();
    if (cached && (now - cached.ts) < HOSP_CACHE_TTL) {
      (cached.results || []).forEach(addHospital);
      lastHosp = c;
      return;
    }

    if (currentHospController) { try { currentHospController.abort(); } catch (e) {} }
    currentHospController = new AbortController();
    fetch(
      'https://api.tomtom.com/search/2/nearbySearch/.json?lat=' + c.lat + '&lon=' + c.lng +
        '&radius=6000&limit=15&categorySet=7321&key=' + KEY,
      { signal: currentHospController.signal }
    )
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.results) { lastHosp = null; return; }
        hospitalsCache[key] = { ts: Date.now(), results: j.results };
        j.results.forEach(addHospital);
        lastHosp = c;
      })
      .catch(function () { lastHosp = null; })
      .finally(function () { currentHospController = null; });
  }

  window.__hospitals = function (on) {
    showHosp = !!on;
    Object.keys(hospitals).forEach(function (id) {
      if (showHosp) { hospitals[id].addTo(map); } else { map.removeLayer(hospitals[id]); }
    });
    if (showHosp) loadHospitals();
  };

  var lastStreet = null;
  var currentStreetController = null;
  var streetCache = {};
  var STREET_CACHE_TTL = 1000 * 15; // 15 seconds

  function cacheKeyForStreet(c) {
    return Math.round(c.lat * 1000) + ':' + Math.round(c.lng * 1000);
  }

  function loadStreet() {
    if (!INIT.street || !KEY) return;

    if (map.getZoom() < 14) {
      lastStreet = null;
      post({ type: 'street', name: '' });
      return;
    }

    var c = map.getCenter();
    var key = cacheKeyForStreet(c);
    var cached = streetCache[key];
    var now = Date.now();
    if (cached && (now - cached.ts) < STREET_CACHE_TTL) {
      post({ type: 'street', name: cached.name });
      lastStreet = c;
      return;
    }

    if (currentStreetController) { try { currentStreetController.abort(); } catch (e) {} }
    currentStreetController = new AbortController();
    fetch(
      'https://api.tomtom.com/search/2/reverseGeocode/' + c.lat + ',' + c.lng +
        '.json?radius=150&key=' + KEY,
      { signal: currentStreetController.signal }
    )
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var a = j && j.addresses && j.addresses[0] && j.addresses[0].address;
        if (!a) return;

        var road = a.streetName || '';
        var area = a.municipalitySubdivision || a.municipality || '';
        var name = road ? (area ? road + ' \u00B7 ' + area : road) : area;
        streetCache[key] = { ts: Date.now(), name: name };
        post({ type: 'street', name: name });
      })
      .catch(function () { lastStreet = null; });
  }

  /* Throw away everything cached about "where the user is" and reload it.
     Called whenever the user presses recenter / redirect. */
  window.__invalidate = function () {
    hospitalsCache = {};
    streetCache = {};
    lastHosp = null;
    lastStreet = null;
    if (currentHospController) { try { currentHospController.abort(); } catch (e) {} currentHospController = null; }
    if (currentStreetController) { try { currentStreetController.abort(); } catch (e) {} currentStreetController = null; }
    onIdle();
  };

  window.__fit = function (pts, pad, maxZoom) {
    if (!pts || !pts.length) return;
    map.fitBounds(L.latLngBounds(pts), {
      paddingTopLeft: [pad.left, pad.top],
      paddingBottomRight: [pad.right, pad.bottom],
      maxZoom: maxZoom || 18,
      animate: true
    });
  };

  window.__fly = function (lat, lng, zoom, ms) {
    map.flyTo([lat, lng], zoom, { duration: Math.max(0.1, (ms || 600) / 1000) });
  };

  window.__traffic = setTraffic;
  window.__style = setStyle;

  var idleTimer = null;

  function onIdle() {
    mapEl.classList.toggle('zlow', map.getZoom() < 14);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      loadHospitals();
      loadStreet();
    }, 500);
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
    theme: TomTomMapTheme;
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
    theme: opts.theme,
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
    theme = "classic",
    showHospitals = true,
    showStreetName = true,
    children,
  } = props;

  const webRef = useRef<React.ComponentRef<typeof WebView>>(null);
  const readyRef = useRef(false);
  const queuedOpsRef = useRef(new Map<string, unknown>());
  const markersRef = useRef(new Map<string, MarkerSpec>());
  const linesRef = useRef(new Map<string, LineSpec>());
  const lastSentMarkersRef = useRef(new Map<string, MarkerSpec>());
  const lastSentLinesRef = useRef(new Map<string, LineSpec>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [street, setStreet] = useState("");

  const propsRef = useRef(props);
  propsRef.current = props;

  const initialRef = useRef({
    region: initialRegion,
    traffic: showTraffic,
    style: mapStyle,
    theme,
    hospitals: showHospitals,
    street: showStreetName,
    boost: props.zoomBoost ?? DEFAULT_ZOOM_BOOST,
  });

  const html = useMemo(
    () =>
      buildHtml(initialRef.current.region, {
        traffic: initialRef.current.traffic,
        style: initialRef.current.style,
        theme: initialRef.current.theme,
        hospitals: initialRef.current.hospitals,
        street: initialRef.current.street,
        boost: initialRef.current.boost,
      }),
    []
  );

  const postMessageToWeb = useCallback((message: unknown) => {
    try {
      webRef.current?.postMessage(JSON.stringify(message));
    } catch (e) {
      // ignore
    }
  }, []);

  const markerEqual = useCallback((a?: MarkerSpec, b?: MarkerSpec) => {
    if (!a || !b) return false;
    return (
      a.latitude === b.latitude &&
      a.longitude === b.longitude &&
      a.kind === b.kind &&
      (a.title ?? "") === (b.title ?? "") &&
      (a.description ?? "") === (b.description ?? "") &&
      (a.label ?? "") === (b.label ?? "")
    );
  }, []);

  const lineEqual = useCallback((a?: LineSpec, b?: LineSpec) => {
    if (!a || !b) return false;
    if (a.color !== b.color || a.width !== b.width) return false;
    if (!a.coordinates || !b.coordinates || a.coordinates.length !== b.coordinates.length) return false;
    for (let i = 0; i < a.coordinates.length; i++) {
      if (a.coordinates[i][0] !== b.coordinates[i][0] || a.coordinates[i][1] !== b.coordinates[i][1]) {
        return false;
      }
    }
    return true;
  }, []);

  const enqueueOp = useCallback((key: string, op: unknown) => {
    const q = queuedOpsRef.current;
    q.set(key, op);
    if (q.size > 500) {
      const firstKey = q.keys().next().value as string | undefined;
      if (firstKey) q.delete(firstKey);
    }
  }, []);

  const flushQueuedOps = useCallback(() => {
    if (!readyRef.current || queuedOpsRef.current.size === 0) return;
    const ops = Array.from(queuedOpsRef.current.values()) as Array<unknown>;
    queuedOpsRef.current.clear();
    if (ops.length) postMessageToWeb({ type: "map_update", operations: ops });
  }, [postMessageToWeb]);

  const scheduleSync = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (readyRef.current) flushQueuedOps();
    }, 16);
  }, [flushQueuedOps]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const context = useMemo<MapContextValue>(
    () => ({
      setMarker: (spec) => {
        markersRef.current.set(spec.id, spec);

        const previous = lastSentMarkersRef.current.get(spec.id);
        if (previous && markerEqual(previous, spec)) return;

        const op = previous
          ? { type: "update_marker", payload: spec }
          : { type: "add_marker", payload: spec };

        if (readyRef.current) {
          postMessageToWeb({ type: "map_update", operations: [op] });
          lastSentMarkersRef.current.set(spec.id, spec);
        } else {
          enqueueOp(`marker:${spec.id}`, op);
        }
        scheduleSync();
      },
      removeMarker: (id) => {
        markersRef.current.delete(id);
        if (readyRef.current) {
          postMessageToWeb({ type: "map_update", operations: [{ type: "remove_marker", payload: { id } }] });
          lastSentMarkersRef.current.delete(id);
        } else {
          enqueueOp(`marker:${id}`, { type: "remove_marker", payload: { id } });
        }
        scheduleSync();
      },
      setLine: (spec) => {
        linesRef.current.set(spec.id, spec);

        const previous = lastSentLinesRef.current.get(spec.id);
        if (previous && lineEqual(previous, spec)) return;

        const op = previous
          ? { type: "update_line", payload: spec }
          : { type: "add_line", payload: spec };

        if (readyRef.current) {
          postMessageToWeb({ type: "map_update", operations: [op] });
          lastSentLinesRef.current.set(spec.id, spec);
        } else {
          enqueueOp(`line:${spec.id}`, op);
        }
        scheduleSync();
      },
      removeLine: (id) => {
        linesRef.current.delete(id);
        if (readyRef.current) {
          postMessageToWeb({ type: "map_update", operations: [{ type: "remove_line", payload: { id } }] });
          lastSentLinesRef.current.delete(id);
        } else {
          enqueueOp(`line:${id}`, { type: "remove_line", payload: { id } });
        }
        scheduleSync();
      },
    }),
    [enqueueOp, lineEqual, markerEqual, postMessageToWeb, scheduleSync]
  );

  useEffect(() => {
    const op = { type: "set_traffic", payload: showTraffic };
    if (readyRef.current) {
      postMessageToWeb({ type: "map_update", operations: [op] });
    } else {
      enqueueOp("command:traffic", op);
    }
  }, [enqueueOp, postMessageToWeb, showTraffic]);

  useEffect(() => {
    const op = { type: "set_style", payload: mapStyle };
    if (readyRef.current) {
      postMessageToWeb({ type: "map_update", operations: [op] });
    } else {
      enqueueOp("command:style", op);
    }
  }, [enqueueOp, mapStyle, postMessageToWeb]);

  useEffect(() => {
    const op = { type: "set_theme", payload: theme };
    if (readyRef.current) {
      postMessageToWeb({ type: "map_update", operations: [op] });
    } else {
      enqueueOp("command:theme", op);
    }
  }, [enqueueOp, postMessageToWeb, theme]);

  useEffect(() => {
    const op = { type: "hospitals", payload: !!showHospitals };
    if (readyRef.current) {
      postMessageToWeb({ type: "map_update", operations: [op] });
    } else {
      enqueueOp("command:hospitals", op);
    }
  }, [enqueueOp, postMessageToWeb, showHospitals]);

  const sendCommand = useCallback(
    (key: string, op: unknown) => {
      if (readyRef.current) {
        postMessageToWeb({ type: "command", command: op });
      } else {
        enqueueOp(key, op);
      }
    },
    [enqueueOp, postMessageToWeb]
  );

  useImperativeHandle(
    ref,
    () => ({
      fitToCoordinates: (coordinates, options) => {
        if (!coordinates || coordinates.length === 0) return;

        const padding = options?.edgePadding ?? {
          top: 40,
          right: 40,
          bottom: 40,
          left: 40,
        };

        // Pressing recenter must never show hospitals / street from an old position.
        if (!options?.keepCache) sendCommand("command:invalidate", { type: "invalidate" });

        sendCommand("command:fit", {
          type: "fit",
          payload: {
            pts: coordinates.map((c) => [c.latitude, c.longitude]),
            pad: padding,
            maxZoom: 18,
          },
        });
      },
      animateToRegion: (region, durationMs = 600, options) => {
        const boost = propsRef.current.zoomBoost ?? DEFAULT_ZOOM_BOOST;

        if (!options?.keepCache) sendCommand("command:invalidate", { type: "invalidate" });

        sendCommand("command:fly", {
          type: "fly",
          payload: {
            lat: region.latitude,
            lng: region.longitude,
            zoom: zoomFor(region.latitudeDelta, boost),
            ms: durationMs,
          },
        });
      },
      refreshLocationData: () => {
        sendCommand("command:invalidate", { type: "invalidate" });
      },
    }),
    [sendCommand]
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: { type?: string; active?: boolean; name?: string } | null = null;

      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (message?.type === "ready") {
        readyRef.current = true;

        const markers = Array.from(markersRef.current.values());
        const lines = Array.from(linesRef.current.values());
        postMessageToWeb({ type: "initial_sync", markers, lines });
        lastSentMarkersRef.current = new Map(markers.map((m) => [m.id, m]));
        lastSentLinesRef.current = new Map(lines.map((l) => [l.id, l]));

        flushQueuedOps();
        propsRef.current.onMapReady?.();
      } else if (message?.type === "drag") {
        propsRef.current.onPanDrag?.();
      } else if (message?.type === "touch") {
        propsRef.current.onInteractionChange?.(!!message.active);
      } else if (message?.type === "street") {
        setStreet(message.name ?? "");
      }
    },
    [flushQueuedOps, postMessageToWeb]
  );

  const recover = useCallback(() => {
    readyRef.current = false;
    webRef.current?.reload();
  }, []);

  const dark = mapStyle === "night";

  return (
    <View style={[styles.container, dark && styles.containerDark, style]}>
      <MapContext.Provider value={context}>
        <WebView
          ref={webRef}
          source={{ html }}
          style={[styles.web, dark && styles.containerDark]}
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
        <View
          style={[styles.streetChip, dark && styles.streetChipDark]}
          pointerEvents="none"
        >
          <View style={styles.streetIcon}>
            <Ionicons name="navigate" size={10} color="#fff" />
          </View>
          <Text
            style={[styles.streetText, dark && styles.streetTextDark]}
            numberOfLines={1}
          >
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
    backgroundColor: "#E8EDF3",
  },
  containerDark: {
    backgroundColor: "#1E293B",
  },
  web: {
    flex: 1,
    backgroundColor: "#E8EDF3",
  },
  streetChip: {
    position: "absolute",
    top: 12,
    left: 12,
    maxWidth: "72%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  streetChipDark: {
    backgroundColor: "rgba(30,41,59,0.96)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  streetIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
  },
  streetText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
    color: "#0F172A",
  },
  streetTextDark: {
    color: "#F1F5F9",
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