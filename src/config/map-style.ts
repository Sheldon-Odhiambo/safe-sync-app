import { MAP_SERVER } from "./map";

export const SAFE_SYNC_MAP_STYLE = {
  version: 8,

  sources: {
    kenya: {
      type: "vector",
      tiles: [`${MAP_SERVER}/kenya/{z}/{x}/{y}`],
      minzoom: 0,
      maxzoom: 14,
    },
  },

  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#f8fafc",
      },
    },

    {
      id: "landcover",
      type: "fill",
      source: "kenya",
      "source-layer": "landcover",
      paint: {
        "fill-color": "#eef2e7",
        "fill-opacity": 0.8,
      },
    },

    {
      id: "landuse",
      type: "fill",
      source: "kenya",
      "source-layer": "landuse",
      paint: {
        "fill-color": "#f1f5f9",
        "fill-opacity": 0.7,
      },
    },

    {
      id: "water",
      type: "fill",
      source: "kenya",
      "source-layer": "water",
      paint: {
        "fill-color": "#bfdbfe",
      },
    },

    {
      id: "waterway",
      type: "line",
      source: "kenya",
      "source-layer": "waterway",
      paint: {
        "line-color": "#93c5fd",
        "line-width": 1.5,
      },
    },

    {
      id: "park",
      type: "fill",
      source: "kenya",
      "source-layer": "park",
      paint: {
        "fill-color": "#dff1df",
        "fill-opacity": 0.8,
      },
    },

    {
      id: "building",
      type: "fill",
      source: "kenya",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-color": "#e5e7eb",
        "fill-opacity": 0.7,
      },
    },

    {
      id: "roads",
      type: "line",
      source: "kenya",
      "source-layer": "transportation",

      paint: {
        "line-color": "#ffffff",

        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],

          5,
          0.5,

          8,
          1,

          11,
          2,

          14,
          5,
        ],
      },
    },

    {
      id: "roads-major",
      type: "line",
      source: "kenya",
      "source-layer": "transportation",

      filter: [
        "in",
        "class",
        "motorway",
        "trunk",
        "primary",
      ],

      paint: {
        "line-color": "#f59e0b",

        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],

          5,
          1,

          8,
          2,

          11,
          3,

          14,
          6,
        ],
      },
    },

    {
      id: "place-labels",
      type: "symbol",
      source: "kenya",
      "source-layer": "place",

      layout: {
        "text-field": ["get", "name:latin"],

        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],

          5,
          10,

          8,
          13,

          12,
          16,
        ],
      },

      paint: {
        "text-color": "#1f2937",

        "text-halo-color": "#ffffff",

        "text-halo-width": 1.5,
      },
    },

    {
      id: "road-labels",
      type: "symbol",
      source: "kenya",
      "source-layer": "transportation_name",

      layout: {
        "symbol-placement": "line",

        "text-field": ["get", "name:latin"],

        "text-size": 11,
      },

      paint: {
        "text-color": "#64748b",

        "text-halo-color": "#ffffff",

        "text-halo-width": 1,
      },
    },
  ],
} as const;