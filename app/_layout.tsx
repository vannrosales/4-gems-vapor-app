import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Slot } from "expo-router";
import { openDatabaseSync } from "expo-sqlite";
import { Text, View } from "react-native";
import migrations from "../drizzle/migrations"; // Points to the folder generated in Step 4
import "../global.css";

// Open the local database
const expoDb = openDatabaseSync("vapeshop.db");
const db = drizzle(expoDb);

export default function Layout() {
  // Run migrations automatically on app start
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-900">
        <Text className="text-red-500 font-bold">Database Error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-900">
        <Text className="text-zinc-400">Loading database...</Text>
      </View>
    );
  }

  // Once database is ready, render the app
  return <Slot />;
}