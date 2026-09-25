import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, {
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import * as Location from "expo-location";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import DepositModal from "@/components/forms/deposit_modal";
import SubscriptionView from "@/components/subscription/subscription_view";

import {
  createDeposit,
  getPaymentProfile,
  getWallet,
  getWalletTransactions,
  type LedgerEntry,
  type PaymentProfile,
} from "@/lib/payments_api";

/* =========================================================
   CONFIGURATION
========================================================= */

// true: load the real profile/wallet from the backend
// false: dummy data only
const USE_LIVE_WALLET = true;

// Google Maps API key comes from:
// EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
//
// The key is used by the native Google Maps configuration.
// The actual map provider is PROVIDER_GOOGLE.

/* =========================================================
   TYPES
========================================================= */

type Transaction = {
  id: string;
  label: string;
  date: string;
  amount: string;
  kind: "debit" | "credit";
};

/* =========================================================
   DUMMY DATA
========================================================= */

const DUMMY_BALANCE = 21800;

const initialTransactions: Transaction[] = [
  {
    id: "TXN-1024",
    label: "Ambulance dispatch",
    date: "18 Aug 2026",
    amount: "- KSh 5,500",
    kind: "debit",
  },
  {
    id: "TXN-1023",
    label: "Wallet deposit",
    date: "16 Aug 2026",
    amount: "+ KSh 10,000",
    kind: "credit",
  },
  {
    id: "TXN-1022",
    label: "Emergency response",
    date: "12 Aug 2026",
    amount: "- KSh 4,200",
    kind: "debit",
  },
  {
    id: "TXN-1021",
    label: "Wallet deposit",
    date: "08 Aug 2026",
    amount: "+ KSh 15,000",
    kind: "credit",
  },
];

const methods = [
  {
    id: "mpesa",
    label: "M-PESA",
    detail: "+254 712 345 678",
    badge: "Default",
    icon: "phone",
  },
  {
    id: "visa",
    label: "Visa",
    detail: "•••• 4412 · 09/29",
    icon: "card",
  },
  {
    id: "bank",
    label: "Bank Transfer",
    detail: "KCB Bank · •••• 8871",
    icon: "bank",
  },
];

const DEFAULT_PROFILE: PaymentProfile = {
  account_kind: "public",
  organization_id: null,
  first_deposit_required: false,
  first_deposit_amount: 500,
  min_topup: 10,
};

const STANDARD_DISPATCH_COST = 5500;

/* =========================================================
   HELPERS
========================================================= */

const formatAmount = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const ledgerToRow = (e: LedgerEntry): Transaction => ({
  id: e.reference ?? e.id.slice(0, 8).toUpperCase(),
  label: e.label,
  date: formatDate(e.created_at),
  amount: `${e.kind === "credit" ? "+" : "-"} KSh ${formatAmount(
    e.amount
  )}`,
  kind: e.kind,
});

/* =========================================================
   ENTRY: PERSONAL WALLET VS ORGANISATION
========================================================= */

export default function Wallet() {
  const [profile, setProfile] =
    useState<PaymentProfile | null>(null);

  const loadProfile = useCallback(async () => {
    if (!USE_LIVE_WALLET) {
      setProfile(DEFAULT_PROFILE);
      return;
    }

    try {
      setProfile(await getPaymentProfile());
    } catch (e) {
      console.log(
        "Profile load failed, assuming personal wallet:",
        e
      );

      setProfile(
        (current) => current ?? DEFAULT_PROFILE
      );
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!profile) {
    return (
      <SafeAreaView
        style={[styles.safeArea, styles.centered]}
      >
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />
      </SafeAreaView>
    );
  }

  /*
   * Organisations subscribe to a plan.
   * They do not use the personal wallet screen.
   */
  if (profile.account_kind !== "public") {
    return <SubscriptionView />;
  }

  return (
    <PersonalWallet
      profile={profile}
      onDeposited={loadProfile}
    />
  );
}

/* =========================================================
   PERSONAL WALLET
========================================================= */

function PersonalWallet({
  profile,
  onDeposited,
}: {
  profile: PaymentProfile;
  onDeposited: () => void;
}) {
  /* =======================================================
     WALLET STATE
  ======================================================= */

  const [lowBalanceAlerts, setLowBalanceAlerts] =
    useState(true);

  const [balance, setBalance] =
    useState(DUMMY_BALANCE);

  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  const [depositOpen, setDepositOpen] =
    useState(false);

  /* =======================================================
     LOCATION STATE
  ======================================================= */

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(true);

  const [locationError, setLocationError] =
    useState<string | null>(null);

  const firstDeposit =
    profile.first_deposit_required;

  const dispatchesCovered = Math.round(
    balance / STANDARD_DISPATCH_COST
  );

  /* =======================================================
     CURRENT LOCATION
  ======================================================= */

  const getCurrentLocation = useCallback(
    async () => {
      try {
        setLocationLoading(true);
        setLocationError(null);

        /*
         * Ask the user for foreground location permission.
         */
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (
          status !==
          Location.PermissionStatus.GRANTED
        ) {
          setLocationError(
            "Location permission is required to show your current position."
          );

          return;
        }

        /*
         * Get the phone's current GPS position.
         */
        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        setLocation(currentLocation);
      } catch (error) {
        console.error(
          "Failed to get current location:",
          error
        );

        setLocationError(
          "Unable to determine your current location."
        );
      } finally {
        setLocationLoading(false);
      }
    },
    []
  );

  /* =======================================================
     LOAD WALLET
  ======================================================= */

  const loadWallet = useCallback(
    async (): Promise<boolean> => {
      if (!USE_LIVE_WALLET) {
        return false;
      }

      try {
        const [wallet, ledger] =
          await Promise.all([
            getWallet(),
            getWalletTransactions(20),
          ]);

        setBalance(wallet.balance);

        setTransactions(
          ledger.map(ledgerToRow)
        );

        return true;
      } catch (e) {
        console.log(
          "Wallet load failed, keeping current data:",
          e
        );

        return false;
      }
    },
    []
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadWallet();
    getCurrentLocation();
  }, [
    loadWallet,
    getCurrentLocation,
  ]);

  /* =======================================================
     DEPOSIT SUCCESS
  ======================================================= */

  const handleDepositSuccess = async (
    amount: number,
    receipt?: string | null
  ) => {
    onDeposited();

    const refreshed =
      await loadWallet();

    if (refreshed) {
      return;
    }

    /*
     * Backend unreachable or dummy mode:
     * update locally.
     */
    setBalance(
      (current) => current + amount
    );

    setTransactions(
      (current) => [
        {
          id:
            receipt ??
            `TXN-${Date.now()}`,
          label: "Wallet deposit",
          date: formatDate(new Date()),
          amount: `+ KSh ${formatAmount(
            amount
          )}`,
          kind: "credit",
        },
        ...current,
      ]
    );
  };

  /* =======================================================
     RECEIPTS
  ======================================================= */

  const handleDownloadReceipts = () => {
    Alert.alert(
      "Receipts",
      "Your receipts will be prepared for download."
    );
  };

  /* =======================================================
     PAYMENT METHODS
  ======================================================= */

  const handleAddPaymentMethod = () => {
    Alert.alert(
      "Add payment method",
      "Choose a payment method to add.",
      [
        {
          text: "M-PESA",
          onPress: () =>
            console.log(
              "Add M-PESA"
            ),
        },
        {
          text: "Card",
          onPress: () =>
            console.log(
              "Add card"
            ),
        },
        {
          text: "Bank",
          onPress: () =>
            console.log(
              "Add bank"
            ),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>
            Wallet
          </Text>

          <Text style={styles.pageSubtitle}>
            Keep a balance so dispatch is never
            delayed by payment.
          </Text>
        </View>

        {/* =================================================
            CURRENT LOCATION MAP
        ================================================= */}

        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>
                Current location
              </Text>

              <Text style={styles.mapSubtitle}>
                Your current SafeSync position
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.locationButton
              }
              onPress={
                getCurrentLocation
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="locate"
                size={20}
                color="#DC2626"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            {locationLoading ? (
              /* ===========================================
                 LOCATION LOADING
              =========================================== */

              <View style={styles.mapLoading}>
                <ActivityIndicator
                  size="large"
                  color="#DC2626"
                />

                <Text
                  style={
                    styles.mapLoadingText
                  }
                >
                  Finding your location...
                </Text>
              </View>
            ) : location ? (
              /* ===========================================
                 GOOGLE MAP
              =========================================== */

              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsBuildings={true}
                showsPointsOfInterest={true}
                initialRegion={{
                  latitude:
                    location.coords.latitude,

                  longitude:
                    location.coords.longitude,

                  latitudeDelta: 0.008,

                  longitudeDelta: 0.008,
                }}
              >
                {/* =======================================
                    CURRENT LOCATION MARKER
                ======================================= */}

                <Marker
                  coordinate={{
                    latitude:
                      location.coords
                        .latitude,

                    longitude:
                      location.coords
                        .longitude,
                  }}
                  title="Your current location"
                  description="SafeSync current position"
                />
              </MapView>
            ) : (
              /* ===========================================
                 LOCATION ERROR
              =========================================== */

              <View style={styles.mapError}>
                <Ionicons
                  name="location-outline"
                  size={40}
                  color="#94A3B8"
                />

                <Text
                  style={
                    styles.mapErrorTitle
                  }
                >
                  Location unavailable
                </Text>

                <Text
                  style={
                    styles.mapErrorText
                  }
                >
                  {locationError ??
                    "Unable to determine your current position."}
                </Text>

                <TouchableOpacity
                  style={
                    styles.retryLocationButton
                  }
                  onPress={
                    getCurrentLocation
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      styles.retryLocationText
                    }
                  >
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* =================================================
              COORDINATES
          ================================================= */}

          {location && (
            <View
              style={
                styles.coordinatesRow
              }
            >
              <Ionicons
                name="navigate-outline"
                size={16}
                color="#64748B"
              />

              <Text
                style={
                  styles.coordinatesText
                }
              >
                {location.coords.latitude.toFixed(
                  6
                )}
                ,{" "}
                {location.coords.longitude.toFixed(
                  6
                )}
              </Text>
            </View>
          )}
        </View>

        {/* =================================================
            BALANCE CARD
        ================================================= */}

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            CURRENT BALANCE
          </Text>

          <Text
            style={
              styles.balanceAmount
            }
          >
            KSh {formatAmount(balance)}
          </Text>

          <Text
            style={
              styles.balanceDescription
            }
          >
            {firstDeposit
              ? `Make your first deposit of KSh ${formatAmount(
                  profile.first_deposit_amount
                )} to activate your wallet`
              : `Covers roughly ${dispatchesCovered} standard ambulance dispatches`}
          </Text>

          <View
            style={
              styles.balanceActions
            }
          >
            <TouchableOpacity
              style={
                styles.depositButton
              }
              activeOpacity={0.8}
              onPress={() =>
                setDepositOpen(true)
              }
            >
              <Ionicons
                name="add"
                size={20}
                color="#DC2626"
              />

              <Text
                style={
                  styles.depositButtonText
                }
              >
                {firstDeposit
                  ? `Deposit KSh ${formatAmount(
                      profile.first_deposit_amount
                    )}`
                  : "Deposit Funds"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.receiptButton
              }
              activeOpacity={0.8}
              onPress={
                handleDownloadReceipts
              }
            >
              <Ionicons
                name="download-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.receiptButtonText
                }
              >
                Receipts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================
            ALERTS
        ================================================= */}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            Alerts
          </Text>

          <Text
            style={
              styles.panelSubtitle
            }
          >
            Never risk an unfunded dispatch
            during an emergency.
          </Text>

          <View
            style={styles.settingRow}
          >
            <View
              style={
                styles.settingTextContainer
              }
            >
              <Text
                style={
                  styles.settingTitle
                }
              >
                Low balance alerts
              </Text>

              <Text
                style={
                  styles.settingDescription
                }
              >
                Push notifications and SMS
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.switch,
                lowBalanceAlerts &&
                  styles.switchActive,
              ]}
              onPress={() =>
                setLowBalanceAlerts(
                  !lowBalanceAlerts
                )
              }
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.switchThumb,
                  lowBalanceAlerts &&
                    styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================
            TRANSACTION HISTORY
        ================================================= */}

        <View style={styles.panel}>
          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={
                styles.panelTitle
              }
            >
              Transaction history
            </Text>

            <TouchableOpacity>
              <Text
                style={
                  styles.viewAllText
                }
              >
                View all
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.transactionList
            }
          >
            {transactions.map(
              (transaction) => (
                <View
                  key={transaction.id}
                  style={
                    styles.transactionRow
                  }
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      transaction.kind ===
                        "credit"
                        ? styles.creditIcon
                        : styles.debitIcon,
                    ]}
                  >
                    <Ionicons
                      name={
                        transaction.kind ===
                        "credit"
                          ? "arrow-down"
                          : "arrow-up"
                      }
                      size={18}
                      color={
                        transaction.kind ===
                        "credit"
                          ? "#059669"
                          : "#DC2626"
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.transactionDetails
                    }
                  >
                    <Text
                      style={
                        styles.transactionLabel
                      }
                      numberOfLines={1}
                    >
                      {
                        transaction.label
                      }
                    </Text>

                    <Text
                      style={
                        styles.transactionDate
                      }
                      numberOfLines={1}
                    >
                      {
                        transaction.date
                      }{" "}
                      ·{" "}
                      {
                        transaction.id
                      }
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.kind ===
                        "credit" &&
                        styles.creditAmount,
                    ]}
                  >
                    {
                      transaction.amount
                    }
                  </Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* =================================================
            SAVED PAYMENT METHODS
        ================================================= */}

        <View style={styles.panel}>
          <Text
            style={
              styles.panelTitle
            }
          >
            Saved payment methods
          </Text>

          <Text
            style={
              styles.panelSubtitle
            }
          >
            Manage the accounts you use
            for SafeSync payments.
          </Text>

          <View
            style={
              styles.methodsList
            }
          >
            {methods.map(
              (method) => (
                <TouchableOpacity
                  key={method.id}
                  style={
                    styles.paymentMethod
                  }
                  activeOpacity={0.75}
                >
                  <View
                    style={
                      styles.paymentIcon
                    }
                  >
                    {method.icon ===
                      "phone" && (
                      <Ionicons
                        name="phone-portrait-outline"
                        size={20}
                        color="#DC2626"
                      />
                    )}

                    {method.icon ===
                      "card" && (
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color="#DC2626"
                      />
                    )}

                    {method.icon ===
                      "bank" && (
                      <MaterialCommunityIcons
                        name="bank-outline"
                        size={20}
                        color="#DC2626"
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.methodDetails
                    }
                  >
                    <Text
                      style={
                        styles.methodLabel
                      }
                    >
                      {
                        method.label
                      }
                    </Text>

                    <Text
                      style={
                        styles.methodDetail
                      }
                    >
                      {
                        method.detail
                      }
                    </Text>
                  </View>

                  {method.badge && (
                    <View
                      style={
                        styles.defaultBadge
                      }
                    >
                      <Text
                        style={
                          styles.defaultBadgeText
                        }
                      >
                        {
                          method.badge
                        }
                      </Text>
                    </View>
                  )}

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              )
            )}
          </View>

          <TouchableOpacity
            style={
              styles.addPaymentButton
            }
            activeOpacity={0.8}
            onPress={
              handleAddPaymentMethod
            }
          >
            <Ionicons
              name="add"
              size={20}
              color="#DC2626"
            />

            <Text
              style={
                styles.addPaymentText
              }
            >
              Add payment method
            </Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            BOTTOM SPACE FOR GLOBAL EMERGENCY BUTTON
        ================================================= */}

        <View
          style={{
            height: 120,
          }}
        />
      </ScrollView>

      {/* =================================================
          DEPOSIT FORM
      ================================================= */}

      <DepositModal
        visible={depositOpen}
        onClose={() =>
          setDepositOpen(false)
        }
        onSubmit={(phone, amount) =>
          createDeposit(
            phone,
            amount
          )
        }
        onSuccess={
          handleDepositSuccess
        }
        defaultPhone={
          methods[0].detail
        }
        title="Deposit Funds"
        subtitle={
          firstDeposit
            ? "Your first deposit activates your wallet"
            : "Pay securely with M-PESA"
        }
        submitLabel={
          firstDeposit
            ? `Pay KSh ${formatAmount(
                profile.first_deposit_amount
              )}`
            : "Pay with M-PESA"
        }
        fixedAmount={
          firstDeposit
            ? profile.first_deposit_amount
            : null
        }
        quickAmounts={
          firstDeposit
            ? []
            : [
                500,
                1000,
                2000,
                5000,
              ]
        }
        hint={
          firstDeposit
            ? `Your first deposit is KSh ${formatAmount(
                profile.first_deposit_amount
              )}. After that you can add any amount you like.`
            : undefined
        }
        minAmount={
          profile.min_topup
        }
      />
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  centered: {
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  pageHeader: {
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0F172A",
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 5,
  },

  /* =======================================================
     MAP
  ======================================================= */

  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 12,
  },

  mapTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  mapSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  locationButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  mapContainer: {
    height: 300,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  mapLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748B",
  },

  mapError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#F8FAFC",
  },

  mapErrorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },

  mapErrorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    textAlign: "center",
    marginTop: 5,
  },

  retryLocationButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#DC2626",
  },

  retryLocationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  coordinatesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 4,
  },

  coordinatesText: {
    fontSize: 11,
    color: "#64748B",
    marginLeft: 6,
    fontVariant: ["tabular-nums"],
  },

  /* =======================================================
     BALANCE CARD
  ======================================================= */

  balanceCard: {
    backgroundColor: "#DC2626",
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
    shadowColor: "#DC2626",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 7,
  },

  balanceLabel: {
    color: "#FFFFFF",
    opacity: 0.75,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    marginTop: 10,
  },

  balanceDescription: {
    color: "#FFFFFF",
    opacity: 0.85,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  balanceActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },

  depositButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  depositButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },

  receiptButton: {
    flex: 0.8,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  receiptButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* =======================================================
     PANELS
  ======================================================= */

  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  panelTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  panelSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 4,
  },

  /* =======================================================
     SETTINGS
  ======================================================= */

  settingRow: {
    marginTop: 16,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingTextContainer: {
    flex: 1,
    paddingRight: 15,
  },

  settingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  settingDescription: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 16,
  },

  /* =======================================================
     CUSTOM SWITCH
  ======================================================= */

  switch: {
    width: 48,
    height: 28,
    borderRadius: 20,
    backgroundColor: "#CBD5E1",
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  switchActive: {
    backgroundColor: "#DC2626",
  },

  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },

  switchThumbActive: {
    alignSelf: "flex-end",
  },

  /* =======================================================
     SECTION HEADER
  ======================================================= */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  viewAllText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },

  /* =======================================================
     TRANSACTIONS
  ======================================================= */

  transactionList: {
    marginTop: 10,
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  creditIcon: {
    backgroundColor: "#ECFDF5",
  },

  debitIcon: {
    backgroundColor: "#FEF2F2",
  },

  transactionDetails: {
    flex: 1,
    minWidth: 0,
  },

  transactionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  transactionDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
  },

  transactionAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginLeft: 8,
  },

  creditAmount: {
    color: "#059669",
  },

  /* =======================================================
     PAYMENT METHODS
  ======================================================= */

  methodsList: {
    marginTop: 14,
    gap: 10,
  },

  paymentMethod: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  methodDetails: {
    flex: 1,
  },

  methodLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  methodDetail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  defaultBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 8,
  },

  defaultBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#475569",
  },

  /* =======================================================
     ADD PAYMENT
  ======================================================= */

  addPaymentButton: {
    height: 48,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  addPaymentText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },
});