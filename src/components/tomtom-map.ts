// components/tomtom-map.tsx
//
// A TomTom-only map for React Native / Expo. It renders TomTom Map Display
// tiles (and optional live traffic) inside a WebView, so no Google (or Apple)
// map engine and no Google Maps key is needed.
//
// The API is deliberately close to react-native-maps so screens change little:
//   <TomTomMap ref initialRegion onMapReady onPanDrag>
//     <TomTomMarker id kind coordinate title description />
//     <TomTomPolyline id coordinates color width />
//   </TomTomMap>
//   ref.fitToCoordinates(...), ref.animateToRegion(...)

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
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
  | "emergency"; // red pin

type MarkerSpec = {
  id: string;
  kind: MarkerKind;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
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
  .leaflet-container { font-family: -apple-system, Roboto, sans-serif; }
  .leaflet-control-attribution { font-size: 9px; }
  .mk { position: relative; display: flex; align-items: center; justify-content: center; }
  .circle { box-sizing: border-box; border-radius: 50%; border: 3px solid #fff; background: #DC2626;
            box-shadow: 0 2px 5px rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; }
  .pulse { position: absolute; border-radius: 50%; animation: p 1.8s ease-out infinite; }
  @keyframes p { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(1.5); opacity: 0; } }
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

  var map = L.map('map', {
    zoomControl: false,
    zoomSnap: 0.25,
    attributionControl: true
  }).setView([INIT.lat, INIT.lng], INIT.zoom);

  map.attributionControl.setPrefix(false);

  L.tileLayer(
    'https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=' + KEY + '&tileSize=512',
    { tileSize: 512, zoomOffset: -1, minZoom: 3, maxZoom: 20, attribution: '&copy; TomTom' }
  ).addTo(map);

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

  function iconFor(kind) {
    var html, size = 46, ax = 23, ay = 23;

    if (kind === 'client') {
      size = 42; ax = 21; ay = 21;
      html = '<div class="mk" style="width:42px;height:42px">' +
        '<div class="pulse" style="width:42px;height:42px;background:rgba(22,163,74,.22)"></div>' +
        '<div class="circle" style="width:25px;height:25px;border:2px solid #16A34A;background:#fff">' +
        '<div style="width:11px;height:11px;border-radius:50%;background:#16A34A"></div></div></div>';
    } else if (kind === 'me') {
      size = 24; ax = 12; ay = 12;
      html = '<div class="circle" style="width:24px;height:24px">' +
        '<div style="width:7px;height:7px;border-radius:50%;background:#fff"></div></div>';
    } else if (kind === 'emergency') {
      size = 36; ax = 18; ay = 34;
      html = '<div style="width:30px;height:30px;margin:3px;box-sizing:border-box;background:#DC2626;' +
        'border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
        'box-shadow:0 2px 5px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">' +
        '<div style="width:10px;height:10px;border-radius:50%;background:#fff"></div></div>';
    } else {
      var glyph = kind === 'fire' ? '&#128658;' : '&#128657;';
      html = '<div class="mk" style="width:46px;height:46px">' +
        '<div class="pulse" style="width:46px;height:46px;background:rgba(220,38,38,.2)"></div>' +
        '<div class="circle" style="width:34px;height:34px;font-size:17px">' + glyph + '</div></div>';
    }

    return L.divIcon({
      html: html,
      className: '',
      iconSize: [size, size],
      iconAnchor: [ax, ay]
    });
  }

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
    });

    Object.keys(markers).forEach(function (id) {
      if (!seen[id]) { map.removeLayer(markers[id]); delete markers[id]; }
    });

    var seenLines = {};

    (state.lines || []).forEach(function (l) {
      seenLines[l.id] = true;
      var pl = lines[l.id];

      if (!pl) {
        lines[l.id] = L.polyline(l.coordinates, {
          color: l.color, weight: l.width, opacity: 0.9, lineJoin: 'round', lineCap: 'round'
        }).addTo(map);
      } else {
        pl.setLatLngs(l.coordinates);
        pl.setStyle({ color: l.color, weight: l.width });
      }
    });

    Object.keys(lines).forEach(function (id) {
      if (!seenLines[id]) { map.removeLayer(lines[id]); delete lines[id]; }
    });
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

  map.on('dragstart', function () { post({ type: 'drag' }); });

  document.addEventListener('touchstart', function () { post({ type: 'touch', active: true }); }, { passive: true });
  document.addEventListener('touchend', function () { post({ type: 'touch', active: false }); }, { passive: true });
  document.addEventListener('touchcancel', function () { post({ type: 'touch', active: false }); }, { passive: true });

  window.addEventListener('resize', function () { map.invalidateSize(); });

  map.whenReady(function () { post({ type: 'ready' }); });
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

function zoomForDelta(latitudeDelta: number): number {
  const zoom = Math.log2(360 / Math.max(latitudeDelta, 0.0001));
  return Math.max(3, Math.min(19, zoom));
}

function buildHtml(region: Region, traffic: boolean): string {
  const init = {
    lat: region.latitude,
    lng: region.longitude,
    zoom: zoomForDelta(region.latitudeDelta),
    traffic,
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
  const { style, initialRegion, showTraffic = false, children } = props;

  const webRef = useRef<React.ComponentRef<typeof WebView>>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const markersRef = useRef(new Map<string, MarkerSpec>());
  const linesRef = useRef(new Map<string, LineSpec>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always read the newest callbacks without re-creating handlers.
  const propsRef = useRef(props);
  propsRef.current = props;

  // The page is built once; changing it later would reload the WebView.
  const initialRef = useRef({ region: initialRegion, traffic: showTraffic });
  const html = useMemo(
    () => buildHtml(initialRef.current.region, initialRef.current.traffic),
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
        run(
          `window.__fly(${region.latitude}, ${region.longitude}, ${zoomForDelta(
            region.latitudeDelta
          )}, ${durationMs});`
        );
      },
    }),
    [run]
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: { type?: string; active?: boolean };

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
}: {
  id: string;
  kind: MarkerKind;
  coordinate: LatLng;
  title?: string;
  description?: string;
}) {
  const context = useContext(MapContext);
  const { latitude, longitude } = coordinate;

  useEffect(() => {
    context?.setMarker({ id, kind, latitude, longitude, title, description });
  }, [context, id, kind, latitude, longitude, title, description]);

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