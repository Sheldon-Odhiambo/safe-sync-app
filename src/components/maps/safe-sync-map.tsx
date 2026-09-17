import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Map,
  Camera,
} from "@maplibre/maplibre-react-native";

import {
  KENYA_CENTER,
  DEFAULT_MAP_ZOOM,
} from "../../config/maps";

import { SAFE_SYNC_MAP_STYLE } from "../../config/map-style";

export default function SafeSyncMap() {
  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={SAFE_SYNC_MAP_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: [
              KENYA_CENTER.longitude,
              KENYA_CENTER.latitude,
            ],
            zoomLevel: DEFAULT_MAP_ZOOM,
          }}
        />
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },
});