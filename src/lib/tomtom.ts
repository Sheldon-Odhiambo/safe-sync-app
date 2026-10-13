export const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY ?? "";

export type LatLng = {
  latitude: number;
  longitude: number;
};

// Same shape the screens already use for RouteInfo.
export type TomTomRoute = {
  distance_meters: number;
  duration_seconds: number;
  polyline: LatLng[];
};

/**
 * Fastest driving route from `from` to `to`, using live traffic.
 * Returns null when no key is configured or no route exists.
 * Throws on network / HTTP errors.
 */
export async function fetchTomTomRoute(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal
): Promise<TomTomRoute | null> {
  if (!TOMTOM_KEY) return null;

  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/` +
    `${from.latitude},${from.longitude}:${to.latitude},${to.longitude}/json` +
    `?key=${TOMTOM_KEY}&travelMode=car&routeType=fastest&traffic=true`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`TomTom routing failed (${response.status})`);
  }

  const data = await response.json();
  const route = data?.routes?.[0];

  if (!route?.summary) return null;

  const polyline: LatLng[] = (route.legs ?? []).flatMap((leg: any) =>
    (leg.points ?? []).map((p: any) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }))
  );

  if (polyline.length < 2) return null;

  return {
    distance_meters: route.summary.lengthInMeters,
    duration_seconds: route.summary.travelTimeInSeconds,
    polyline,
  };
}

/** "Street, Area, City" for a coordinate, or null if TomTom has nothing. */
export async function reverseGeocodeTomTom(
  coords: LatLng,
  signal?: AbortSignal
): Promise<string | null> {
  if (!TOMTOM_KEY) return null;

  const url =
    `https://api.tomtom.com/search/2/reverseGeocode/` +
    `${coords.latitude},${coords.longitude}.json?key=${TOMTOM_KEY}&radius=100`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`TomTom reverse geocoding failed (${response.status})`);
  }

  const data = await response.json();
  const address = data?.addresses?.[0]?.address;

  if (!address) return null;

  const parts = [
    address.streetName ?? address.street,
    address.municipalitySubdivision,
    address.municipality,
  ].filter((p: unknown): p is string => typeof p === "string" && !!p.trim());

  const unique = Array.from(new Set(parts));

  return unique.length > 0
    ? unique.join(", ")
    : address.freeformAddress ?? null;
}

/** Coordinates for a free-text address, or null if not found. */
export async function geocodeTomTom(
  query: string,
  signal?: AbortSignal
): Promise<LatLng | null> {
  if (!TOMTOM_KEY || !query.trim()) return null;

  const url =
    `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json` +
    `?key=${TOMTOM_KEY}&limit=1`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`TomTom geocoding failed (${response.status})`);
  }

  const data = await response.json();
  const position = data?.results?.[0]?.position;

  if (!position) return null;

  return { latitude: position.lat, longitude: position.lon };
}