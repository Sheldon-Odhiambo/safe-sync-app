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

  function iconFor(kind) {
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
        '<div class="circle" style="width:24px;height:24px">' +
        '<div style="width:7px;height:7px;border-radius:50%;background:#fff"></div></div></div>';
    } else if (kind === 'emergency') {
      size = 36; ax = 18; ay = 34;
      html = '<div style="width:30px;height:30px;margin:3px;box-sizing:border-box;background:#DC2626;' +
        'border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
        'box-shadow:0 2px 5px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">' +
        '<div style="width:10px;height:10px;border-radius:50%;background:#fff"></div></div>';
    } else if (kind === 'hospital') {
      size = 28; ax = 14; ay = 14;
      html = '<div class="circle" style="width:28px;height:28px;background:#fff;border:2px solid #DC2626">' +
        '<div style="position:relative;width:14px;height:14px">' +
        '<div style="position:absolute;left:5px;top:0;width:4px;height:14px;background:#DC2626;border-radius:1px"></div>' +
        '<div style="position:absolute;left:0;top:5px;width:14px;height:4px;background:#DC2626;border-radius:1px"></div>' +
        '</div></div>';
    } else {
      var glyph = kind === 'fire' ? '&#128658;' : '&#128657;';
      html = '<div class="mk" style="width:46px;height:46px">' +
        rings(150, 'rgba(220,38,38,.25)') +
        '<div class="circle" style="width:34px;height:34px;font-size:17px">' + glyph + '</div></div>';
    }

    return L.divIcon({
      html: html,
      className: '',
      iconSize: [size, size],
      iconAnchor: [ax, ay]
    });
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

  /* ---------- markers and lines driven by React ---------- */

  var markers = {};
  var lines = {};

  window.__sync = function (state) {
    var seen = {};

    (state.markers || []).forEach(function (m) {
      seen[m.id] = true;
      var ll = [m.latitude, m.longitude];
      var mk = markers[m.id];

      if (!mk) {
        var z = m.kind === 'emergency' ? 500 : (m.kind === 'me' || m.kind === 'client') ? 200 : 0;
        mk = L.marker(ll, { icon: iconFor(m.kind), zIndexOffset: z }).addTo(map);
        mk._kind = m.kind;
        markers[m.id] = mk;
      } else {
        mk.setLatLng(ll);
        if (mk._kind !== m.kind) {
          mk.setIcon(iconFor(m.kind));
          mk._kind = m.kind;
        }
      }

      var text = m.title
        ? '<b>' + esc(m.title) + '</b>' + (m.description ? '<br>' + esc(m.description) : '')
        : '';

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
    });

    Object.keys(markers).forEach(function (id) {
      if (!seen[id]) { map.removeLayer(markers[id]); delete markers[id]; }
    });

    var seenLines = {};

    (state.lines || []).forEach(function (l) {
      seenLines[l.id] = true;
      var pair = lines[l.id];

      if (!pair) {
        // White outline underneath so the route stands out on any map style.
        var casing = L.polyline(l.coordinates, {
          color: '#FFFFFF', weight: l.width + 4, opacity: 0.95, lineJoin: 'round', lineCap: 'round'
        }).addTo(map);
        var main = L.polyline(l.coordinates, {
          color: l.color, weight: l.width, opacity: 0.95, lineJoin: 'round', lineCap: 'round'
        }).addTo(map);
        lines[l.id] = { casing: casing, main: main };
      } else {
        pair.casing.setLatLngs(l.coordinates);
        pair.casing.setStyle({ weight: l.width + 4 });
        pair.main.setLatLngs(l.coordinates);
        pair.main.setStyle({ color: l.color, weight: l.width });
      }
    });

    Object.keys(lines).forEach(function (id) {
      if (!seenLines[id]) {
        map.removeLayer(lines[id].casing);
        map.removeLayer(lines[id].main);
        delete lines[id];
      }
    });
  };

  /* ---------- nearby hospitals (TomTom Nearby Search, category 7321) ---------- */

  var hospitals = {};
  var showHosp = INIT.hospitals;
  var lastHosp = null;

  function loadHospitals() {
    if (!showHosp || !KEY) return;
    if (map.getZoom() < 12) return;

    var c = map.getCenter();
    if (lastHosp && map.distance(lastHosp, c) < 1500) return;
    lastHosp = c;

    fetch(
      'https://api.tomtom.com/search/2/nearbySearch/.json?lat=' + c.lat + '&lon=' + c.lng +
        '&radius=6000&limit=15&categorySet=7321&key=' + KEY
    )
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.results) { lastHosp = null; return; }

        j.results.forEach(function (p) {
          if (!p.poi || !p.position) return;

          var id = p.id || (p.poi.name + p.position.lat + p.position.lon);
          if (hospitals[id]) return;

          var name = p.poi.name || 'Hospital';
          var addr = p.address && p.address.freeformAddress ? p.address.freeformAddress : '';
          var phone = p.poi.phone ? p.poi.phone : '';

          var m = L.marker([p.position.lat, p.position.lon], { icon: iconFor('hospital'), zIndexOffset: 100 });
          m.bindPopup(
            '<b>' + esc(name) + '</b>' +
            (addr ? '<br>' + esc(addr) : '') +
            (phone ? '<br>' + esc(phone) : '')
          );
          m.bindTooltip(name, tip('hospital'));
          if (showHosp) m.addTo(map);
          hospitals[id] = m;
        });
      })
      .catch(function () { lastHosp = null; });
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

  function loadStreet() {
    if (!INIT.street || !KEY) return;

    if (map.getZoom() < 14) {
      lastStreet = null;
      post({ type: 'street', name: '' });
      return;
    }

    var c = map.getCenter();
    if (lastStreet && map.distance(lastStreet, c) < 40) return;
    lastStreet = c;

    fetch(
      'https://api.tomtom.com/search/2/reverseGeocode/' + c.lat + ',' + c.lng +
        '.json?radius=150&key=' + KEY
    )
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var a = j && j.addresses && j.addresses[0] && j.addresses[0].address;
        if (!a) return;

        var road = a.streetName || '';
        var area = a.municipalitySubdivision || a.municipality || '';
        var name = road ? (area ? road + ' \\u00B7 ' + area : road) : area;
        post({ type: 'street', name: name });
      })
      .catch(function () { lastStreet = null; });
  }

  /* ---------- camera ---------- */

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
  const queueRef = useRef<string[]>([]);
  const markersRef = useRef(new Map<string, MarkerSpec>());
  const linesRef = useRef(new Map<string, LineSpec>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [street, setStreet] = useState("");

  // Always read the newest callbacks without re-creating handlers.
  const propsRef = useRef(props);
  propsRef.current = props;

  // The page is built once; changing it later would reload the WebView.
  const initialRef = useRef({
    region: initialRegion,
    traffic: showTraffic,
    style: mapStyle,
    hospitals: showHospitals,
    street: showStreetName,
    boost: props.zoomBoost ?? DEFAULT_ZOOM_BOOST,
  });
  const html = useMemo(
    () =>
      buildHtml(initialRef.current.region, {
        traffic: initialRef.current.traffic,
        style: initialRef.current.style,
        hospitals: initialRef.current.hospitals,
        street: initialRef.current.street,
        boost: initialRef.current.boost,
      }),
    []
  );

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`${js}\ntrue;`);
  }, []);

  // `queue`: hold the command until the page reports ready.
  const run = useCallback(
    (js: string, queue = true) => {
      if (!readyRef.current) {
        if (queue) queueRef.current.push(js);
        return;
      }
      inject(js);
    },
    [inject]
  );

  const sync = useCallback(() => {
    run(
      `window.__sync(${safeJson({
        markers: Array.from(markersRef.current.values()),
        lines: Array.from(linesRef.current.values()),
      })});`,
      false
    );
  }, [run]);

  const scheduleSync = useCallback(() => {
    if (timerRef.current) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      sync();
    }, 16);
  }, [sync]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const context = useMemo<MapContextValue>(
    () => ({
      setMarker: (spec) => {
        markersRef.current.set(spec.id, spec);
        scheduleSync();
      },
      removeMarker: (id) => {
        markersRef.current.delete(id);
        scheduleSync();
      },
      setLine: (spec) => {
        linesRef.current.set(spec.id, spec);
        scheduleSync();
      },
      removeLine: (id) => {
        linesRef.current.delete(id);
        scheduleSync();
      },
    }),
    [scheduleSync]
  );

  useEffect(() => {
    run(`window.__traffic(${showTraffic ? "true" : "false"});`);
  }, [showTraffic, run]);

  useEffect(() => {
    run(`window.__style(${safeJson(mapStyle)});`);
  }, [mapStyle, run]);

  useEffect(() => {
    run(`window.__hospitals(${showHospitals ? "true" : "false"});`);
  }, [showHospitals, run]);

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

        run(
          `window.__fit(${safeJson(
            coordinates.map((c) => [c.latitude, c.longitude])
          )}, ${safeJson(padding)}, 18);`
        );
      },
      animateToRegion: (region, durationMs = 600) => {
        const boost = propsRef.current.zoomBoost ?? DEFAULT_ZOOM_BOOST;

        run(
          `window.__fly(${region.latitude}, ${region.longitude}, ${zoomFor(
            region.latitudeDelta,
            boost
          )}, ${durationMs});`
        );
      },
    }),
    [run]
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: { type?: string; active?: boolean; name?: string };

      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (message.type === "ready") {
        readyRef.current = true;

        const queued = queueRef.current;
        queueRef.current = [];

        sync();
        queued.forEach(inject);

        propsRef.current.onMapReady?.();
      } else if (message.type === "drag") {
        propsRef.current.onPanDrag?.();
      } else if (message.type === "touch") {
        propsRef.current.onInteractionChange?.(!!message.active);
      } else if (message.type === "street") {
        setStreet(message.name ?? "");
      }
    },
    [sync, inject]
  );

  // If the OS kills the WebView process, reload; "ready" re-sends everything.
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