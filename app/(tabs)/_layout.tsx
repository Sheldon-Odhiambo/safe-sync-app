// import { Tabs } from "expo-router";
// import { Home, History, User, Wallet } from "lucide-react-native";

// export default function TabsLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: "#E11D48",
//         tabBarInactiveTintColor: "#64748B",
//         tabBarStyle: {
//           height: 60,
//           paddingBottom: 8,
//           paddingTop: 6,
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: "Home",
//           tabBarIcon: ({ color }) => (
//             <Home size={20} color={color} strokeWidth={1.75} />
//           ),
//         }}
//       />

//       <Tabs.Screen
//         name="history"
//         options={{
//           title: "History",
//           tabBarIcon: ({ color }) => (
//             <History size={20} color={color} strokeWidth={1.75} />
//           ),
//         }}
//       />

//       <Tabs.Screen
//         name="wallet"
//         options={{
//           title: "Wallet",
//           tabBarIcon: ({ color }) => (
//             <Wallet size={20} color={color} strokeWidth={1.75} />
//           ),
//         }}
//       />

//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: "Profile",
//           tabBarIcon: ({ color }) => (
//             <User size={20} color={color} strokeWidth={1.75} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }

import { View, Text, TouchableOpacity } from "react-native";

export default function SignInScreen() {
  return (
    <View className="flex-1 bg-slate-100 items-center justify-center p-5">
      <View className="bg-white rounded-3xl p-6 w-full border border-slate-200">
        <Text className="text-3xl font-black text-slate-900 text-center">
          SafeSync
        </Text>

        <Text className="text-sm text-slate-500 text-center mt-2">
          Rapid Emergency Response
        </Text>

        <TouchableOpacity className="bg-rose-600 rounded-xl p-4 mt-6">
          <Text className="text-white font-bold text-center">
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}