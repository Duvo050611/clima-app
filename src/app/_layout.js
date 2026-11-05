import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DestinationProvider } from '../context/DestinationContext';

export default function RootLayout() {
  return (
    <DestinationProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </DestinationProvider>
  );
}
