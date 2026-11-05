import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../components/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerTitleAlign: 'left',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // En web no hay área segura inferior; se da altura extra para que no se corten las etiquetas.
          ...(Platform.OS === 'web' && { height: 62, paddingBottom: 8 }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explorar',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pronostico"
        options={{
          title: 'Pronóstico',
          headerTitle: 'Pronóstico de 7 días',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'partly-sunny' : 'partly-sunny-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="apis"
        options={{
          title: 'Servicios',
          headerTitle: 'Estado de los servicios',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
