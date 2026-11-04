import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { getWeatherByCity, getWeatherByCoords } from "./src/weatherService";

const DEFAULT_CITY = "Toluca,MX";

export default function App() {
  const [query, setQuery] = useState(DEFAULT_CITY);
  const [lastRequest, setLastRequest] = useState({
    type: "city",
    value: DEFAULT_CITY,
  });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (req, { isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data =
        req.type === "city"
          ? await getWeatherByCity(req.value)
          : await getWeatherByCoords(req.value.lat, req.value.lon);
      setWeather(data);
      setLastRequest(req);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    run({ type: "city", value: DEFAULT_CITY });
  }, [run]);

  const onSearch = () => run({ type: "city", value: query });

  const onRefresh = () => run(lastRequest, { isRefresh: true });

  const onUseLocation = async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Permiso de ubicación denegado. Puedes buscar por ciudad.");
      return;
    }
    setLoading(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await run({
        type: "coords",
        value: { lat: pos.coords.latitude, lon: pos.coords.longitude },
      });
    } catch {
      setLoading(false);
      setError("No se pudo obtener tu ubicación.");
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#fff"
              />
            }
          >
            <Text style={styles.title}>Consulta del clima</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Ciudad (ej. Toluca o Madrid,ES)"
                placeholderTextColor="#94a3b8"
                maxLength={60}
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={onSearch}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
                onPress={onSearch}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Buscar</Text>
              </Pressable>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondary,
                  pressed && styles.pressed,
                ]}
                onPress={onUseLocation}
                disabled={loading}
              >
                <Text style={styles.secondaryText}>📍 Mi ubicación</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.secondary,
                  pressed && styles.pressed,
                ]}
                onPress={onRefresh}
                disabled={loading || refreshing}
              >
                <Text style={styles.secondaryText}>↻ Actualizar</Text>
              </Pressable>
            </View>

            {loading && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.muted}>Consultando OpenWeather…</Text>
              </View>
            )}

            {!loading && error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  ⚠️ No se pudo obtener el clima
                </Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!loading && weather && (
              <WeatherCard data={weather} stale={!!error} />
            )}

            <Text
              style={styles.attribution}
              onPress={() => Linking.openURL("https://openweathermap.org/")}
            >
              Datos meteorológicos proporcionados por OpenWeather (CC BY-SA 4.0)
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function WeatherCard({ data, stale }) {
  return (
    <View style={[styles.card, stale && styles.stale]}>
      {stale && (
        <Text style={styles.muted}>Mostrando la última consulta exitosa</Text>
      )}
      <Text style={styles.city}>
        {data.city}
        {data.country ? `, ${data.country}` : ""}
      </Text>
      <Text style={styles.coords}>
        Lat {data.lat?.toFixed(2)} · Lon {data.lon?.toFixed(2)}
      </Text>

      <View style={styles.mainRow}>
        <Image source={{ uri: data.icon }} style={styles.icon} />
        <Text style={styles.temp}>{data.temp}°C</Text>
      </View>
      <Text style={styles.description}>{data.description}</Text>

      <View style={styles.grid}>
        <Stat label="Sensación" value={`${data.feelsLike}°C`} />
        <Stat label="Mín / Máx" value={`${data.tempMin}° / ${data.tempMax}°`} />
        <Stat label="Humedad" value={`${data.humidity}%`} />
        <Stat label="Viento" value={`${data.windSpeed} m/s`} />
      </View>

      <Text style={styles.updated}>
        Actualizado:{" "}
        {data.updatedAt.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1e3a8a" },
  flex: { flex: 1 },
  container: { padding: 20, paddingTop: 48, gap: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  button: {
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  buttonText: { color: "#1e293b", fontWeight: "700", fontSize: 16 },
  actionsRow: { flexDirection: "row", gap: 8 },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#fff", fontWeight: "600" },
  pressed: { opacity: 0.6 },
  center: { alignItems: "center", gap: 8, paddingVertical: 32 },
  muted: { color: "#cbd5e1", textAlign: "center" },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  errorTitle: { color: "#991b1b", fontWeight: "700" },
  errorText: { color: "#7f1d1d" },
  card: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  stale: { opacity: 0.7 },
  city: { color: "#fff", fontSize: 24, fontWeight: "700" },
  coords: { color: "#bfdbfe", fontSize: 13 },
  mainRow: { flexDirection: "row", alignItems: "center" },
  icon: { width: 100, height: 100 },
  temp: { color: "#fff", fontSize: 56, fontWeight: "300" },
  description: { color: "#fff", fontSize: 18, textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 10 },
  stat: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 10,
  },
  statLabel: { color: "#bfdbfe", fontSize: 12 },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "600" },
  updated: { color: "#bfdbfe", fontSize: 12, marginTop: 8 },
  attribution: {
    color: "#93c5fd",
    fontSize: 12,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
