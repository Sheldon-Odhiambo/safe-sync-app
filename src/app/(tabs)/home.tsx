import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
} from "react-native";

import MapView, {
  Marker,
  Region,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import * as Location from "expo-location";

import {
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";

import { useRouter } from "expo-router";

/* ========================================= */
/* GOOGLE MAPS / GEOCODING API KEY           */
/* ========================================= */

/*
 * This is read from your .env file. It must be
 * prefixed with EXPO_PUBLIC_ so Expo exposes it
 * to the JS bundle. The SAME key is also required
 * in app.json (android.config.googleMaps.apiKey and
 * ios.config.googleMapsApiKey) for the native map
 * tiles to render — that part cannot be done from
 * this file, since it's native config, not JS.
 */
const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/* ========================================= */
/* TYPES                                     */
/* ========================================= */

type LocationData = {
  latitude: number;
  longitude: number;
  address: string;
};

type EmergencyType = "ambulance" | "fire";

/* ========================================= */
/* COMPONENT                                 */
/* ========================================= */

export default function Home() {
  const router = useRouter();

  const mapRef = useRef<MapView | null>(null);

  /* ----------------------------------------- */
  /* LOCATION STATE                             */
  /* ----------------------------------------- */

  const [locationModalVisible, setLocationModalVisible] =
    useState(true);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationConfirmed, setLocationConfirmed] =
    useState(false);

  const [clientLocation, setClientLocation] =
    useState<LocationData | null>(null);

  const [mapRegion, setMapRegion] =
    useState<Region | null>(null);

  /* ----------------------------------------- */
  /* SEARCH STATE                               */
  /* ----------------------------------------- */

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchLoading, setSearchLoading] =
    useState(false);

  const [searchedLocation, setSearchedLocation] =
    useState<LocationData | null>(null);

  /* ----------------------------------------- */
  /* EMERGENCY STATE                            */
  /* ----------------------------------------- */

  const [selectedEmergency, setSelectedEmergency] =
    useState<EmergencyType | null>(null);

  /*
   * Temporary responder data.
   *
   * This will later come from the SafeSync backend
   * based on the confirmed client coordinates.
   */
  const nearbyUnits = [
    {
      id: "ambulance-001",
      name: "Nearest Ambulance",
      kind: "Ambulance",
      station: "Nairobi Hospital Station, Upper Hill",
      status: "Available",
      eta: "5 min",
      distance: "1.5 km",
      crew: 3,
      vehicle: "KDA 241X",
      latitude: -1.2864,
      longitude: 36.8172,
    },
    {
      id: "fire-001",
      name: "Nearest Fire Engine",
      kind: "Fire Engine",
      station: "Fire Station 4 — Westlands",
      status: "Available",
      eta: "10 min",
      distance: "2.0 km",
      crew: 6,
      vehicle: "KDB 912F",
      latitude: -1.2676,
      longitude: 36.8108,
    },
  ];

  /* ========================================= */
  /* INITIAL LOCATION                          */
  /* ========================================= */

  useEffect(() => {
    requestLocation();
  }, []);

  /* ========================================= */
  /* REVERSE GEOCODING (Google Geocoding API)  */
  /* ========================================= */

  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    if (!GOOGLE_MAPS_API_KEY) {
      return "Current GPS location";
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (
        data.status === "OK" &&
        data.results.length > 0
      ) {
        return data.results[0].formatted_address;
      }
    } catch {
      // Coordinates remain valid even if reverse geocoding fails.
    }

    return "Current GPS location";
  };

  /* ========================================= */
  /* CURRENT GPS LOCATION                      */
  /* ========================================= */

  const requestLocation = async () => {
    try {
      setLocationLoading(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationLoading(false);

        Alert.alert(
          "Location Required",
          "SafeSync needs your location to show the area where emergency assistance is required.",
          [
            {
              text: "Try Again",
              onPress: () => requestLocation(),
            },
            {
              text: "Search Location",
              onPress: () => {
                setLocationModalVisible(true);
              },
            },
          ]
        );

        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      const address =
        await getAddressFromCoordinates(
          latitude,
          longitude
        );

      const locationData: LocationData = {
        latitude,
        longitude,
        address,
      };

      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };

      setClientLocation(locationData);
      setMapRegion(region);
      setLocationConfirmed(true);

      /*
       * Clear any previous search.
       */
      setSearchQuery("");
      setSearchedLocation(null);

      setLocationLoading(false);
      setLocationModalVisible(false);

      /*
       * Wait for the map to render before
       * animating to the user's location.
       */
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          region,
          500
        );
      }, 300);
    } catch (error) {
      setLocationLoading(false);

      Alert.alert(
        "Unable to Get Location",
        "We could not determine your current location. You can try again or search for the location manually."
      );
    }
  };

  /* ========================================= */
  /* SEARCH LOCATION (Google Geocoding API)    */
  /* ========================================= */

  const searchForLocation = async () => {
    const query = searchQuery.trim();

    if (!query) {
      Alert.alert(
        "Enter a Location",
        "Search for a street, building, hospital, estate, landmark or other location."
      );

      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      Alert.alert(
        "Missing API Key",
        "No Google Maps API key was found. Check your .env file and restart the app."
      );

      return;
    }

    try {
      Keyboard.dismiss();

      setSearchLoading(true);
      setSearchedLocation(null);

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (
        data.status !== "OK" ||
        !data.results.length
      ) {
        setSearchLoading(false);

        Alert.alert(
          "Location Not Found",
          "We could not find that location. Try using a more specific address, building, street or landmark."
        );

        return;
      }

      const result = data.results[0];

      const latitude =
        result.geometry.location.lat;
      const longitude =
        result.geometry.location.lng;
      const address =
        result.formatted_address ?? query;

      const locationData: LocationData = {
        latitude,
        longitude,
        address,
      };

      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };

      setSearchedLocation(locationData);
      setMapRegion(region);

      /*
       * Move the main map when it exists.
       */
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          region,
          600
        );
      }, 100);

      setSearchLoading(false);
    } catch (error) {
      setSearchLoading(false);

      Alert.alert(
        "Search Failed",
        "We could not search for that location. Please check your internet connection and try again."
      );
    }
  };

  /* ========================================= */
  /* CONFIRM SEARCHED LOCATION                 */
  /* ========================================= */

  const confirmSearchedLocation = () => {
    if (!searchedLocation) {
      Alert.alert(
        "Select a Location",
        "Search for the location where emergency assistance is needed first."
      );

      return;
    }

    const region: Region = {
      latitude: searchedLocation.latitude,
      longitude: searchedLocation.longitude,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
    };

    setClientLocation(searchedLocation);
    setMapRegion(region);
    setLocationConfirmed(true);

    setLocationModalVisible(false);

    /*
     * Clear temporary search state.
     */
    setSearchQuery("");
    setSearchedLocation(null);

    setTimeout(() => {
      mapRef.current?.animateToRegion(
        region,
        500
      );
    }, 300);
  };

  /* ========================================= */
  /* CHANGE LOCATION                           */
  /* ========================================= */

  const changeLocation = () => {
    setSearchQuery("");
    setSearchedLocation(null);
    setLocationModalVisible(true);
  };

  /* ========================================= */
  /* EMERGENCY REQUEST                         */
  /* ========================================= */

  const requestEmergency = (
    type: EmergencyType
  ) => {
    /*
     * Emergency requests can never proceed
     * without a confirmed location.
     */
    if (!clientLocation || !locationConfirmed) {
      setLocationModalVisible(true);
      return;
    }

    setSelectedEmergency(type);

    router.push({
      pathname: "/emergency",
      params: {
        type,
        latitude:
          clientLocation.latitude.toString(),
        longitude:
          clientLocation.longitude.toString(),
        address:
          clientLocation.address,
      },
    });
  };

  /* ========================================= */
  /* RENDER                                    */
  /* ========================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ===================================== */}
        {/* GREETING                              */}
        {/* ===================================== */}

        <View style={styles.greetingSection}>
          <Text style={styles.userName}>
            SafeSync
          </Text>

          <Text style={styles.userLocation}>
            {locationConfirmed && clientLocation
              ? `Emergency location · ${clientLocation.address}`
              : "Set your emergency location to continue"}
          </Text>
        </View>

        {/* ===================================== */}
        {/* LOCATION BANNER                       */}
        {/* ===================================== */}

        {locationConfirmed && clientLocation && (
          <TouchableOpacity
            style={styles.locationBanner}
            activeOpacity={0.8}
            onPress={changeLocation}
          >
            <View style={styles.locationBannerIcon}>
              <Ionicons
                name="location"
                size={20}
                color="#DC2626"
              />
            </View>

            <View
              style={styles.locationBannerContent}
            >
              <Text
                style={styles.locationBannerLabel}
              >
                EMERGENCY LOCATION
              </Text>

              <Text
                style={styles.locationBannerAddress}
                numberOfLines={2}
              >
                {clientLocation.address}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        )}

        {/* ===================================== */}
        {/* MAP                                   */}
        {/* ===================================== */}

        {locationConfirmed && mapRegion ? (
          <View style={styles.mapCard}>
            <View style={styles.mapWrapper}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={mapRegion}
                showsMyLocationButton
                showsCompass
                mapType="standard"
              >
                {/* -------------------------------- */}
                {/* CLIENT LOCATION                    */}
                {/* -------------------------------- */}

                {clientLocation && (
                  <Marker
                    coordinate={{
                      latitude:
                        clientLocation.latitude,
                      longitude:
                        clientLocation.longitude,
                    }}
                    title="Emergency location"
                    description={
                      clientLocation.address
                    }
                  >
                    <View
                      style={styles.userMarker}
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  </Marker>
                )}

                {/* -------------------------------- */}
                {/* RESPONDER MARKERS                 */}
                {/* -------------------------------- */}

                {nearbyUnits.map((unit) => (
                  <Marker
                    key={unit.id}
                    coordinate={{
                      latitude: unit.latitude,
                      longitude: unit.longitude,
                    }}
                    title={unit.name}
                    description={`${unit.eta} · ${unit.distance}`}
                  >
                    <View
                      style={
                        styles.responderMarker
                      }
                    >
                      {unit.kind ===
                      "Ambulance" ? (
                        <FontAwesome5
                          name="ambulance"
                          size={16}
                          color="#FFFFFF"
                        />
                      ) : (
                        <Ionicons
                          name="flame"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                  </Marker>
                ))}
              </MapView>

              {/* -------------------------------- */}
              {/* MAP STATUS                        */}
              {/* -------------------------------- */}

              <View
                style={styles.mapOverlay}
              >
                <View
                  style={
                    styles.locationVerifiedBadge
                  }
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color="#059669"
                  />

                  <Text
                    style={
                      styles.locationVerifiedText
                    }
                  >
                    Location confirmed
                  </Text>
                </View>
              </View>
            </View>

            {/* -------------------------------- */}
            {/* MAP FOOTER                         */}
            {/* -------------------------------- */}

            <View style={styles.mapFooter}>
              <View
                style={styles.mapFooterInfo}
              >
                <Text
                  style={styles.mapFooterTitle}
                >
                  Your emergency location
                </Text>

                <Text
                  style={styles.mapFooterSubtitle}
                >
                  Responders will be dispatched here
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.changeLocationButton
                }
                onPress={changeLocation}
              >
                <Ionicons
                  name="location-outline"
                  size={15}
                  color="#DC2626"
                />

                <Text
                  style={
                    styles.changeLocationText
                  }
                >
                  Change
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ===================================== */
          /* LOCATION REQUIRED                     */
          /* ===================================== */

          <View
            style={styles.locationRequiredCard}
          >
            <View
              style={
                styles.locationRequiredIcon
              }
            >
              <Ionicons
                name="location-outline"
                size={34}
                color="#DC2626"
              />
            </View>

            <Text
              style={styles.locationRequiredTitle}
            >
              Set your emergency location
            </Text>

            <Text
              style={styles.locationRequiredText}
            >
              SafeSync needs to know where help is
              required before showing available
              emergency responders.
            </Text>

            <TouchableOpacity
              style={
                styles.primaryLocationButton
              }
              onPress={requestLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="locate"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.primaryLocationButtonText
                    }
                  >
                    Use My Current Location
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.searchInsteadButton}
              onPress={() => {
                setLocationModalVisible(true);
              }}
            >
              <Ionicons
                name="search"
                size={17}
                color="#DC2626"
              />

              <Text
                style={
                  styles.searchInsteadButtonText
                }
              >
                Search for a location instead
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================== */}
        {/* EMERGENCY ACTIONS                     */}
        {/* ===================================== */}

        {locationConfirmed && (
          <View style={styles.emergencySection}>
            <Text style={styles.sectionTitle}>
              Emergency Assistance
            </Text>

            <Text style={styles.sectionSubtitle}>
              Select the type of emergency assistance
              you need.
            </Text>

            {/* -------------------------------- */}
            {/* AMBULANCE                         */}
            {/* -------------------------------- */}

            <TouchableOpacity
              style={[
                styles.emergencyCard,
                selectedEmergency ===
                  "ambulance" &&
                  styles.emergencyCardSelected,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                requestEmergency("ambulance")
              }
            >
              <View
                style={[
                  styles.emergencyIcon,
                  styles.ambulanceIcon,
                ]}
              >
                <FontAwesome5
                  name="ambulance"
                  size={25}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.emergencyCardContent
                }
              >
                <Text
                  style={
                    styles.emergencyCardTitle
                  }
                >
                  Request Ambulance
                </Text>

                <Text
                  style={
                    styles.emergencyCardText
                  }
                >
                  Medical emergency, accident or
                  urgent medical assistance.
                </Text>

                <View
                  style={
                    styles.emergencyCardMeta
                  }
                >
                  <Ionicons
                    name="navigate-outline"
                    size={14}
                    color="#64748B"
                  />

                  <Text
                    style={
                      styles.emergencyCardMetaText
                    }
                  >
                    Dispatch to confirmed location
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={22}
                color="#94A3B8"
              />
            </TouchableOpacity>

            {/* -------------------------------- */}
            {/* FIRE                              */}
            {/* -------------------------------- */}

            <TouchableOpacity
              style={[
                styles.emergencyCard,
                selectedEmergency === "fire" &&
                  styles.emergencyCardSelected,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                requestEmergency("fire")
              }
            >
              <View
                style={[
                  styles.emergencyIcon,
                  styles.fireIcon,
                ]}
              >
                <Ionicons
                  name="flame"
                  size={27}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.emergencyCardContent
                }
              >
                <Text
                  style={
                    styles.emergencyCardTitle
                  }
                >
                  Request Fire Response
                </Text>

                <Text
                  style={
                    styles.emergencyCardText
                  }
                >
                  Fire, smoke, building fire or other
                  fire-related emergency.
                </Text>

                <View
                  style={
                    styles.emergencyCardMeta
                  }
                >
                  <Ionicons
                    name="navigate-outline"
                    size={14}
                    color="#64748B"
                  />

                  <Text
                    style={
                      styles.emergencyCardMetaText
                    }
                  >
                    Dispatch to confirmed location
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={22}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================== */}
        {/* NEARBY RESPONDERS                     */}
        {/* ===================================== */}

        {locationConfirmed && (
          <View style={styles.respondersSection}>
            <View
              style={styles.sectionHeaderRow}
            >
              <View style={styles.sectionHeaderInfo}>
                <Text
                  style={styles.sectionTitle}
                >
                  Nearby Responders
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Based on your confirmed location
                </Text>
              </View>

              <View
                style={styles.coverageBadge}
              >
                <View
                  style={styles.coverageDot}
                />

                <Text
                  style={styles.coverageText}
                >
                  Covered
                </Text>
              </View>
            </View>

            {nearbyUnits.map((unit) => (
              <View
                key={unit.id}
                style={styles.responderCard}
              >
                <View
                  style={styles.cardHeader}
                >
                  <View
                    style={styles.cardHeaderLeft}
                  >
                    <View
                      style={styles.iconBadge}
                    >
                      {unit.kind ===
                      "Ambulance" ? (
                        <FontAwesome5
                          name="ambulance"
                          size={21}
                          color="#DC2626"
                        />
                      ) : (
                        <Ionicons
                          name="flame"
                          size={25}
                          color="#DC2626"
                        />
                      )}
                    </View>

                    <View
                      style={styles.cardTitleBox}
                    >
                      <Text
                        style={
                          styles.responderTitle
                        }
                        numberOfLines={1}
                      >
                        {unit.name}
                      </Text>

                      <Text
                        style={
                          styles.responderLocation
                        }
                        numberOfLines={1}
                      >
                        {unit.station}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.availableBadge}
                  >
                    <Text
                      style={
                        styles.availableBadgeText
                      }
                    >
                      {unit.status}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.metricsGrid}
                >
                  <Stat
                    label="ETA"
                    value={unit.eta}
                    emphasis
                  />

                  <Stat
                    label="DISTANCE"
                    value={unit.distance}
                  />

                  <Stat
                    label="CREW SIZE"
                    value={`${unit.crew}`}
                  />

                  <Stat
                    label="VEHICLE"
                    value={unit.vehicle}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* ======================================= */}
      {/* LOCATION MODAL                          */}
      {/* ======================================= */}

      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          /*
           * Location selection cannot be dismissed
           * if the user has not yet confirmed a location.
           */
          if (locationConfirmed) {
            setLocationModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalIcon}>
              <Ionicons
                name="location"
                size={30}
                color="#DC2626"
              />
            </View>

            <Text style={styles.modalTitle}>
              Where do you need help?
            </Text>

            <Text
              style={styles.modalDescription}
            >
              Before requesting emergency assistance,
              confirm the exact location where help is
              needed.
            </Text>

            {/* ================================= */}
            {/* CURRENT LOCATION                  */}
            {/* ================================= */}

            <TouchableOpacity
              style={styles.useLocationButton}
              onPress={requestLocation}
              disabled={locationLoading}
              activeOpacity={0.8}
            >
              {locationLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="navigate"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.useLocationButtonText
                    }
                  >
                    Use My Current Location
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ================================= */}
            {/* SEARCH                             */}
            {/* ================================= */}

            <View style={styles.manualSection}>
              <View style={styles.divider} />

              <Text
                style={styles.manualTitle}
              >
                Search for another location
              </Text>

              <View
                style={styles.searchContainer}
              >
                <Ionicons
                  name="search"
                  size={19}
                  color="#64748B"
                />

                <TextInput
                  value={searchQuery}
                  onChangeText={(value) => {
                    setSearchQuery(value);
                    setSearchedLocation(null);
                  }}
                  placeholder="Search address, building or landmark"
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="words"
                  onSubmitEditing={
                    searchForLocation
                  }
                />

                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setSearchedLocation(null);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* SEARCH BUTTON */}

              <TouchableOpacity
                style={[
                  styles.searchButton,
                  !searchQuery.trim() &&
                    styles.searchButtonDisabled,
                ]}
                disabled={
                  !searchQuery.trim() ||
                  searchLoading
                }
                onPress={
                  searchForLocation
                }
                activeOpacity={0.8}
              >
                {searchLoading ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="search"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.searchButtonText
                      }
                    >
                      Search Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* ================================= */}
              {/* SEARCH RESULT                     */}
              {/* ================================= */}

              {searchedLocation && (
                <View
                  style={
                    styles.searchResultContainer
                  }
                >
                  <View
                    style={
                      styles.searchResultHeader
                    }
                  >
                    <View
                      style={
                        styles.searchResultIcon
                      }
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color="#DC2626"
                      />
                    </View>

                    <View
                      style={
                        styles.searchResultContent
                      }
                    >
                      <Text
                        style={
                          styles.searchResultLabel
                        }
                      >
                        LOCATION FOUND
                      </Text>

                      <Text
                        style={
                          styles.searchResultAddress
                        }
                        numberOfLines={2}
                      >
                        {searchedLocation.address}
                      </Text>
                    </View>
                  </View>

                  {/* -------------------------------- */}
                  {/* SEARCH PREVIEW MAP               */}
                  {/* -------------------------------- */}

                  <View
                    style={
                      styles.searchPreviewMap
                    }
                  >
                    <MapView
                      style={styles.miniMap}
                      provider={PROVIDER_GOOGLE}
                      region={{
                        latitude:
                          searchedLocation.latitude,
                        longitude:
                          searchedLocation.longitude,
                        latitudeDelta: 0.012,
                        longitudeDelta: 0.012,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                      toolbarEnabled={false}
                    >
                      <Marker
                        coordinate={{
                          latitude:
                            searchedLocation.latitude,
                          longitude:
                            searchedLocation.longitude,
                        }}
                      >
                        <View
                          style={
                            styles.selectedLocationMarker
                          }
                        >
                          <Ionicons
                            name="location"
                            size={17}
                            color="#FFFFFF"
                          />
                        </View>
                      </Marker>
                    </MapView>
                  </View>

                  {/* -------------------------------- */}
                  {/* CONFIRM                          */}
                  {/* -------------------------------- */}

                  <TouchableOpacity
                    style={
                      styles.confirmLocationButton
                    }
                    onPress={
                      confirmSearchedLocation
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        styles.confirmLocationButtonText
                      }
                    >
                      Confirm This Location
                    </Text>

                    <Ionicons
                      name="checkmark"
                      size={19}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ========================================= */
/* STAT COMPONENT                            */
/* ========================================= */

function Stat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.metricValue,
          emphasis &&
            styles.metricValueEmphasis,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/* ========================================= */
/* STYLES                                    */
/* ========================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },

  /* ========================================= */
  /* GREETING                                  */
  /* ========================================= */

  greetingSection: {
    marginBottom: 16,
  },

  userName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },

  userLocation: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },

  /* ========================================= */
  /* LOCATION BANNER                           */
  /* ========================================= */

  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 16,
  },

  locationBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  locationBannerContent: {
    flex: 1,
  },

  locationBannerLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
  },

  locationBannerAddress: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* ========================================= */
  /* MAP                                       */
  /* ========================================= */

  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  mapWrapper: {
    height: 250,
    width: "100%",
    position: "relative",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
  },

  locationVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  locationVerifiedText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },

  /* ========================================= */
  /* CLIENT LOCATION MARKER                    */
  /* ========================================= */

  userMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DC2626",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  /* ========================================= */
  /* RESPONDER MARKER                          */
  /* ========================================= */

  responderMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DC2626",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  /* ========================================= */
  /* MAP FOOTER                                */
  /* ========================================= */

  mapFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  mapFooterInfo: {
    flex: 1,
  },

  mapFooterTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  mapFooterSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  changeLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 10,
  },

  changeLocationText: {
    marginLeft: 4,
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
  },

  /* ========================================= */
  /* LOCATION REQUIRED                         */
  /* ========================================= */

  locationRequiredCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 25,
    alignItems: "center",
  },

  locationRequiredIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  locationRequiredTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  locationRequiredText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },

  primaryLocationButton: {
    width: "100%",
    height: 50,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryLocationButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  searchInsteadButton: {
    marginTop: 13,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  searchInsteadButtonText: {
    marginLeft: 6,
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  },

  /* ========================================= */
  /* EMERGENCY                                 */
  /* ========================================= */

  emergencySection: {
    marginTop: 26,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  sectionSubtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },

  emergencyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  emergencyCardSelected: {
    borderColor: "#DC2626",
  },

  emergencyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  ambulanceIcon: {
    backgroundColor: "#DC2626",
  },

  fireIcon: {
    backgroundColor: "#EA580C",
  },

  emergencyCardContent: {
    flex: 1,
    marginRight: 8,
  },

  emergencyCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  emergencyCardText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
  },

  emergencyCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  emergencyCardMetaText: {
    marginLeft: 4,
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },

  /* ========================================= */
  /* RESPONDERS                                */
  /* ========================================= */

  respondersSection: {
    marginTop: 27,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionHeaderInfo: {
    flex: 1,
  },

  coverageBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
  },

  coverageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
    marginRight: 5,
  },

  coverageText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },

  responderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 17,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardTitleBox: {
    flex: 1,
  },

  responderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  responderLocation: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  availableBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },

  availableBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  /* ========================================= */
  /* METRICS                                   */
  /* ========================================= */

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    marginHorizontal: -4,
  },

  metricBox: {
    width: "50%",
    padding: 4,
  },

  metricLabel: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingTop: 9,
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },

  metricValue: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingBottom: 9,
    paddingTop: 3,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  metricValueEmphasis: {
    color: "#DC2626",
  },

  /* ========================================= */
  /* MODAL                                     */
  /* ========================================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },

  locationModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "92%",
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 18,
  },

  modalIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },

  modalTitle: {
    marginTop: 14,
    fontSize: 23,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  modalDescription: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 10,
  },

  /* ========================================= */
  /* CURRENT LOCATION BUTTON                   */
  /* ========================================= */

  useLocationButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  useLocationButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* ========================================= */
  /* SEARCH                                    */
  /* ========================================= */

  manualSection: {
    marginTop: 18,
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 15,
  },

  manualTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 9,
  },

  searchContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 9,
    fontSize: 13,
    color: "#0F172A",
  },

  searchButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: "#0F172A",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  searchButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },

  searchButtonText: {
    marginLeft: 7,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* ========================================= */
  /* SEARCH RESULT                             */
  /* ========================================= */

  searchResultContainer: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  searchResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },

  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  searchResultContent: {
    flex: 1,
  },

  searchResultLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },

  searchResultAddress: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* ========================================= */
  /* SEARCH PREVIEW MAP                        */
  /* ========================================= */

  searchPreviewMap: {
    height: 130,
    width: "100%",
  },

  miniMap: {
    width: "100%",
    height: "100%",
  },

  selectedLocationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DC2626",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  /* ========================================= */
  /* CONFIRM LOCATION                          */
  /* ========================================= */

  confirmLocationButton: {
    height: 50,
    borderRadius: 13,
    backgroundColor: "#059669",
    margin: 12,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmLocationButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginRight: 7,
  },

  /* ========================================= */
  /* BOTTOM                                    */
  /* ========================================= */

  bottomSpacing: {
    height: 100,
  },
});
