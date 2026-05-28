import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import OnboardingScreen from './onboarding';

export default function RootLayout() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const value = await AsyncStorage.getItem('@has_onboarded');
        if (value === null) {
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.error('Error reading async storage', error);
        setIsFirstLaunch(false); // Failsafe to main app
      }
    }
    checkOnboarding();
  }, []);

  // Show a black loading screen while we check storage (takes milliseconds)
  if (isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // If it's their first time, show the intro slider
  if (isFirstLaunch) {
    return <OnboardingScreen onFinish={() => setIsFirstLaunch(false)} />;
  }

  // Otherwise, load your normal app tabs/stack
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}