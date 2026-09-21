import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Tabs, useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  History,
  Home,
  ShieldCheck,
  Siren,
  User,
  Wallet,
  LogOut,
} from "lucide-react-native";

/* ========================================= */
/* COMPONENT                                 */
/* ========================================= */

export default function TabsLayout() {
  const router = useRouter();

  const insets = useSafeAreaInsets();

  const [showLogoutTooltip, setShowLogoutTooltip] =
    useState(false);

  /* ========================================= */
  /* EMERGENCY ANIMATION                      */
  /* ========================================= */

  /*
   * Controls the pulsing effect around the
   * emergency button.
   */
  const emergencyPulse = useRef(
    new Animated.Value(0)
  ).current;

  /*
   * Controls the siren icon movement.
   */
  const sirenRotation = useRef(
    new Animated.Value(0)
  ).current;

  /*
   * Controls a subtle icon scale effect.
   */
  const sirenScale = useRef(
    new Animated.Value(1)
  ).current;

  /* ========================================= */
  /* START EMERGENCY ANIMATION                */
  /* ========================================= */

  useEffect(() => {
    /*
     * Main button pulse
     */
    const pulseAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            emergencyPulse,
            {
              toValue: 1,
              duration: 1100,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            emergencyPulse,
            {
              toValue: 0,
              duration: 1100,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver: true,
            }
          ),
        ])
      );

    /*
     * Siren rotation
     */
    const rotationAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            sirenRotation,
            {
              toValue: 1,
              duration: 180,
              easing: Easing.linear,
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            sirenRotation,
            {
              toValue: -1,
              duration: 360,
              easing: Easing.linear,
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            sirenRotation,
            {
              toValue: 0,
              duration: 180,
              easing: Easing.linear,
              useNativeDriver: true,
            }
          ),

          Animated.delay(850),
        ])
      );

    /*
     * Siren scale
     */
    const scaleAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            sirenScale,
            {
              toValue: 1.12,
              duration: 550,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            sirenScale,
            {
              toValue: 1,
              duration: 550,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver: true,
            }
          ),
        ])
      );

    pulseAnimation.start();
    rotationAnimation.start();
    scaleAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotationAnimation.stop();
      scaleAnimation.stop();
    };
  }, [
    emergencyPulse,
    sirenRotation,
    sirenScale,
  ]);

  /* ========================================= */
  /* ANIMATION INTERPOLATIONS                 */
  /* ========================================= */

  /*
   * The button itself grows very slightly.
   */
  const emergencyScale =
    emergencyPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.015],
    });

  /*
   * Creates a subtle shadow/glow effect.
   */
  const emergencyOpacity =
    emergencyPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.25, 0.55],
    });

  /*
   * Converts the animation value into
   * a small left/right siren movement.
   */
  const sirenRotate =
    sirenRotation.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [
        "-10deg",
        "0deg",
        "10deg",
      ],
    });

  /* ========================================= */
  /* SIGN OUT                                  */
  /* ========================================= */

  const handleSignOut = () => {
    setShowLogoutTooltip(false);

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of SafeSync?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            router.replace("/");
          },
        },
      ]
    );
  };

  /* ========================================= */
  /* EMERGENCY                                 */
  /* ========================================= */

  const handleEmergency = () => {
    Alert.alert(
      "Emergency Assistance",
      "Do you need emergency assistance?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          style: "destructive",
          onPress: () =>
            router.push("/emergency"),
        },
      ]
    );
  };

  /* ========================================= */
  /* RENDER                                    */
  /* ========================================= */

  return (
    <View style={styles.container}>
      {/* ===================================== */}
      {/* TOP HEADER                            */}
      {/* ===================================== */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 8,
          },
        ]}
      >
        {/* =================================== */}
        {/* SAFESYNC BRAND                      */}
        {/* =================================== */}

        <View
          style={styles.brandContainer}
        >
          <View
            style={styles.logoBadge}
          >
            <ShieldCheck
              size={18}
              color="#FFFFFF"
              strokeWidth={2}
            />
          </View>

          <Text
            style={styles.brandTitle}
          >
            SafeSync
          </Text>
        </View>

        {/* =================================== */}
        {/* HEADER ACTIONS                      */}
        {/* =================================== */}

        <View
          style={styles.headerActions}
        >
          {/* ================================= */}
          {/* SIGN OUT                           */}
          {/* ================================= */}

          <View
            style={styles.logoutContainer}
          >
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={handleSignOut}
              onLongPress={() =>
                setShowLogoutTooltip(
                  true
                )
              }
              onPressIn={() =>
                setShowLogoutTooltip(
                  true
                )
              }
              onPressOut={() => {
                setTimeout(() => {
                  setShowLogoutTooltip(
                    false
                  );
                }, 800);
              }}
            >
              <LogOut
                size={19}
                color="#DC2626"
                strokeWidth={2.3}
              />

              <Text
                style={styles.logoutText}
              >
                Sign Out
              </Text>
            </TouchableOpacity>

            {/* TOOLTIP */}

            {showLogoutTooltip && (
              <View
                style={
                  styles.logoutTooltip
                }
              >
                <Text
                  style={
                    styles.logoutTooltipText
                  }
                >
                  Sign Out
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ===================================== */}
      {/* TABS                                  */}
      {/* ===================================== */}

      <View style={styles.tabsWrapper}>
        <Tabs
          screenOptions={{
            headerShown: false,

            tabBarActiveTintColor:
              "#DC2626",

            tabBarInactiveTintColor:
              "#64748B",

            tabBarStyle: {
              height:
                60 + insets.bottom,

              paddingBottom:
                insets.bottom + 4,

              paddingTop: 6,

              backgroundColor:
                "#FFFFFF",

              borderTopWidth: 1,

              borderTopColor:
                "#E2E8F0",

              elevation: 8,
            },

            tabBarLabelStyle:
              styles.tabLabel,

            tabBarItemStyle:
              styles.tabItem,

            tabBarHideOnKeyboard:
              true,
          }}
        >
          {/* ================================= */}
          {/* HOME                              */}
          {/* ================================= */}

          <Tabs.Screen
            name="home"
            options={{
              title: "Home",

              tabBarIcon: ({
                color,
                focused,
              }) => (
                <Home
                  size={22}
                  color={color}
                  strokeWidth={
                    focused
                      ? 2.5
                      : 2
                  }
                />
              ),
            }}
          />

          {/* ================================= */}
          {/* HISTORY                           */}
          {/* ================================= */}

          <Tabs.Screen
            name="history"
            options={{
              title: "History",

              tabBarIcon: ({
                color,
                focused,
              }) => (
                <History
                  size={22}
                  color={color}
                  strokeWidth={
                    focused
                      ? 2.5
                      : 2
                  }
                />
              ),
            }}
          />

          {/* ================================= */}
          {/* WALLET                            */}
          {/* ================================= */}

          <Tabs.Screen
            name="wallet"
            options={{
              title: "Wallet",

              tabBarIcon: ({
                color,
                focused,
              }) => (
                <Wallet
                  size={22}
                  color={color}
                  strokeWidth={
                    focused
                      ? 2.5
                      : 2
                  }
                />
              ),
            }}
          />

          {/* ================================= */}
          {/* PROFILE                           */}
          {/* ================================= */}

          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",

              tabBarIcon: ({
                color,
                focused,
              }) => (
                <User
                  size={22}
                  color={color}
                  strokeWidth={
                    focused
                      ? 2.5
                      : 2
                  }
                />
              ),
            }}
          />

          {/* ================================= */}
          {/* HIDDEN ROUTES                     */}
          {/* ================================= */}

          <Tabs.Screen
            name="admin"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="track"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="responder"
            options={{
              href: null,
            }}
          />
        </Tabs>

        {/* =================================== */}
        {/* EMERGENCY BUTTON                    */}
        {/* =================================== */}

        <View
          style={[
            styles.emergencyWrapper,
            {
              bottom:
                70 + insets.bottom,
            },
          ]}
        >
          {/* OUTER PULSE */}

          <Animated.View
            pointerEvents="none"
            style={[
              styles.emergencyPulse,
              {
                opacity:
                  emergencyOpacity,

                transform: [
                  {
                    scale:
                      emergencyPulse.interpolate(
                        {
                          inputRange: [
                            0,
                            1,
                          ],
                          outputRange: [
                            1,
                            1.06,
                          ],
                        }
                      ),
                  },
                ],
              },
            ]}
          />

          {/* MAIN BUTTON */}

          <Animated.View
            style={{
              transform: [
                {
                  scale:
                    emergencyScale,
                },
              ],
            }}
          >
            <TouchableOpacity
              style={
                styles.emergencyButton
              }
              activeOpacity={0.85}
              onPress={
                handleEmergency
              }
            >
              {/* ANIMATED SIREN */}

              <Animated.View
                style={[
                  styles.emergencyIcon,
                  {
                    transform: [
                      {
                        rotate:
                          sirenRotate,
                      },
                      {
                        scale:
                          sirenScale,
                      },
                    ],
                  },
                ]}
              >
                <Siren
                  size={21}
                  color="#FFFFFF"
                  strokeWidth={2.2}
                />
              </Animated.View>

              <View
                style={
                  styles.emergencyTextContainer
                }
              >
                <Text
                  style={
                    styles.emergencyText
                  }
                >
                  REQUEST EMERGENCY HELP
                </Text>

                <Text
                  style={
                    styles.emergencySubtext
                  }
                >
                  Tap for immediate assistance
                </Text>
              </View>

              <View
                style={
                  styles.emergencyArrow
                }
              >
                <Text
                  style={
                    styles.emergencyArrowText
                  }
                >
                  →
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
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

  /* ========================================= */
  /* HEADER                                    */
  /* ========================================= */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 16,

    paddingBottom: 12,

    backgroundColor: "#FFFFFF",

    borderBottomWidth: 1,

    borderBottomColor:
      "#E2E8F0",

    zIndex: 50,
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoBadge: {
    width: 32,
    height: 32,

    borderRadius: 16,

    backgroundColor: "#E11D48",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 8,
  },

  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* ========================================= */
  /* SIGN OUT                                  */
  /* ========================================= */

  logoutContainer: {
    position: "relative",
  },

  logoutButton: {
    height: 36,

    paddingHorizontal: 12,

    borderRadius: 10,

    backgroundColor: "#FEF2F2",

    borderWidth: 1,

    borderColor: "#FECACA",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,
  },

  logoutText: {
    color: "#DC2626",

    fontSize: 13,

    fontWeight: "800",
  },

  logoutTooltip: {
    position: "absolute",

    top: 44,

    right: 0,

    backgroundColor: "#0F172A",

    paddingHorizontal: 10,

    paddingVertical: 6,

    borderRadius: 7,

    zIndex: 100,

    elevation: 8,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.2,

    shadowRadius: 5,
  },

  logoutTooltipText: {
    color: "#FFFFFF",

    fontSize: 11,

    fontWeight: "700",
  },

  /* ========================================= */
  /* TABS                                     */
  /* ========================================= */

  tabsWrapper: {
    flex: 1,
  },

  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  tabLabel: {
    fontSize: 10,

    fontWeight: "700",

    marginTop: 2,
  },

  /* ========================================= */
  /* EMERGENCY WRAPPER                        */
  /* ========================================= */

  emergencyWrapper: {
    position: "absolute",

    left: 16,

    right: 16,

    zIndex: 30,
  },

  /* ========================================= */
  /* OUTER PULSE                              */
  /* ========================================= */

  emergencyPulse: {
    position: "absolute",

    top: -4,

    bottom: -4,

    left: -4,

    right: -4,

    borderRadius: 18,

    backgroundColor:
      "rgba(220, 38, 38, 0.35)",
  },

  /* ========================================= */
  /* EMERGENCY BUTTON                         */
  /* ========================================= */

  emergencyButton: {
    height: 54,

    backgroundColor: "#DC2626",

    borderRadius: 16,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 14,

    elevation: 8,

    shadowColor: "#DC2626",

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.3,

    shadowRadius: 8,
  },

  /* ========================================= */
  /* SIREN ICON                               */
  /* ========================================= */

  emergencyIcon: {
    width: 34,

    height: 34,

    borderRadius: 17,

    backgroundColor:
      "rgba(255,255,255,0.20)",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 10,
  },

  /* ========================================= */
  /* EMERGENCY TEXT                           */
  /* ========================================= */

  emergencyTextContainer: {
    flex: 1,
  },

  emergencyText: {
    color: "#FFFFFF",

    fontSize: 12,

    fontWeight: "900",

    letterSpacing: 0.25,
  },

  emergencySubtext: {
    marginTop: 2,

    color:
      "rgba(255,255,255,0.78)",

    fontSize: 9,

    fontWeight: "600",
  },

  /* ========================================= */
  /* EMERGENCY ARROW                          */
  /* ========================================= */

  emergencyArrow: {
    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor:
      "rgba(255,255,255,0.16)",

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 8,
  },

  emergencyArrowText: {
    color: "#FFFFFF",

    fontSize: 18,

    fontWeight: "700",

    marginTop: -2,
  },
});

