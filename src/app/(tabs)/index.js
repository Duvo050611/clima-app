// Pantalla de consulta: integra las tres APIs para un destino.
//   Portada y datos de ubicación -> API 1 (Nominatim)
//   Clima y hora local           -> API 2 (Open-Meteo, con lat/lon de la API 1)
//   Foto y descripción           -> API 3 (Wikipedia, con el artículo indicado por la API 1)
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ApiSection,
  Card,
  colors,
  ErrorNotice,
  Fact,
  LinkButton,
  radius,
  SectionHeader,
  Skeleton,
  styles as ui,
} from '../../components/ui';
import { useDestination } from '../../context/DestinationContext';
import { remoteImage } from '../../services/http';
import { formatCompact, formatDay, formatLocalTime } from '../../utils/format';

const DEFAULT_CITY = 'Toluca';
const SUGGESTIONS = ['Toluca', 'Madrid', 'Cancún', 'Kioto', 'Cusco'];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { place, weather, wiki, busy, search, searchByCoords, refresh } = useDestination();
  const [query, setQuery] = useState(DEFAULT_CITY);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    search(DEFAULT_CITY);
  }, [search]);

  const onSearch = (city = query) => {
    setLocationError(null);
    setQuery(city);
    search(city);
  };

  const onUseLocation = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permiso de ubicación denegado. Puedes buscar un destino por nombre.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      searchByCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setLocationError('No se pudo obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const p = place.data;
  const w = weather.status === 'success' ? weather.data : null;
  const updating = place.status === 'loading' && !!p;

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* Encabezado */}
        <View>
          <Text style={s.eyebrow}>DESTINOS</Text>
          <Text style={s.title}>¿A dónde quieres ir?</Text>
        </View>

        {/* Búsqueda */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={s.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Busca una ciudad o destino"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => onSearch()}
              accessibilityLabel="Destino"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [s.primaryButton, (pressed || busy) && ui.pressed]}
            onPress={() => onSearch()}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryText}>Buscar</Text>}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Pressable style={[s.chip, s.chipLocation]} onPress={onUseLocation} disabled={busy || locating}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate" size={14} color={colors.primary} />
            )}
            <Text style={[s.chipText, { color: colors.primary }]}>Mi ubicación</Text>
          </Pressable>
          {SUGGESTIONS.map((city) => (
            <Pressable key={city} style={s.chip} onPress={() => onSearch(city)} disabled={busy}>
              <Text style={s.chipText}>{city}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {locationError && <ErrorNotice title="Ubicación" message={locationError} />}

        {place.status === 'error' && (
          <ErrorNotice
            title="No se pudo localizar el destino"
            message={`${place.error}${p ? ' Se muestra el destino anterior.' : ''}`}
            onRetry={() => onSearch()}
          />
        )}

        {/* Primera carga, aún sin destino */}
        {!p && place.status === 'loading' && (
          <View style={s.results} accessibilityLabel="Consultando destino">
            <Text style={ui.loadingText}>Consultando el destino…</Text>
            <Skeleton height={220} style={{ borderRadius: radius.lg }} />
            <View style={s.facts}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={72} style={{ flex: 1, borderRadius: radius.md }} />
              ))}
            </View>
          </View>
        )}

        {p && (
          <View style={[s.results, updating && s.dimmed]}>
            {/* Portada: nombre de la API 1 + foto de la API 3 */}
            <Hero place={p} wiki={wiki} />

            {/* Datos clave combinados de las APIs 1 y 2 */}
            <View style={s.facts}>
              <Fact icon="thermometer-outline" label="Ahora" value={w ? `${w.current.temp}°C` : '—'} />
              <Fact icon="time-outline" label="Hora local" value={w ? formatLocalTime(w.localTime) : '—'} />
              <Fact icon="people-outline" label="Habitantes" value={formatCompact(p.population)} />
              <Fact icon="trending-up-outline" label="Altitud" value={w ? `${Math.round(w.elevation)} m` : '—'} />
            </View>

            {/* API 2 */}
            <ApiSection
              title="Clima"
              source="Open-Meteo"
              result={weather}
              loadingText="Consultando el clima…"
              errorTitle="Clima no disponible"
              onRetry={refresh}
            >
              {(data) => <WeatherSummary data={data} />}
            </ApiSection>

            {/* API 3 */}
            <ApiSection
              title="Acerca del destino"
              source="Wikipedia"
              result={wiki}
              loadingText="Buscando información turística…"
              errorTitle="Información turística no disponible"
              onRetry={refresh}
            >
              {(info) => (
                <>
                  <View style={s.aboutHeader}>
                    {info.image && !info.isPhoto && (
                      <Image
                        source={remoteImage(info.image)}
                        style={s.emblem}
                        contentFit="contain"
                        onError={(e) => logImageError(info.image, e)}
                      />
                    )}
                    <View style={s.flex1}>
                      <Text style={s.aboutTitle}>{info.title}</Text>
                      {!!info.description && <Text style={s.aboutSubtitle}>{info.description}</Text>}
                    </View>
                  </View>
                  <Text style={ui.body} numberOfLines={7}>
                    {info.extract}
                  </Text>
                  {info.url && (
                    <LinkButton label="Leer más en Wikipedia" onPress={() => Linking.openURL(info.url)} />
                  )}
                </>
              )}
            </ApiSection>

            {/* API 1 */}
            <View style={ui.section}>
              <SectionHeader title="Ubicación" source="OpenStreetMap" />
              <Card>
                <InfoRow icon="location-outline" label="Región" value={[p.state, p.country].filter(Boolean).join(', ') || '—'} />
                <View style={ui.divider} />
                <InfoRow icon="navigate-circle-outline" label="Coordenadas" value={`${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`} />
                <View style={ui.divider} />
                <InfoRow icon="flag-outline" label="Código de país" value={p.countryCode || '—'} />
                <LinkButton label="Abrir en el mapa" icon="map-outline" onPress={() => Linking.openURL(p.mapUrl)} />
              </Card>
            </View>
          </View>
        )}

        <Text style={s.attribution}>
          Datos: © colaboradores de OpenStreetMap (ODbL) · Open-Meteo.com (CC BY 4.0) · Wikipedia (CC BY-SA 4.0)
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function logImageError(uri, event) {
  // Se ve en la terminal de Metro; ayuda a diagnosticar bloqueos del servidor de imágenes.
  console.warn(`No se pudo cargar la imagen ${uri}: ${event?.error ?? 'error desconocido'}`);
}

// Portada: el fondo azul se ve mientras la foto carga o si no se puede descargar.
function Hero({ place, wiki }) {
  const photo = wiki.status === 'success' && wiki.data.isPhoto ? wiki.data.image : null;
  const [loaded, setLoaded] = useState(null); // uri de la foto ya cargada
  const [failed, setFailed] = useState(null); // uri de la foto que falló
  const showPhoto = photo && failed !== photo;

  return (
    <View style={[s.hero, s.heroPlain]}>
      <Ionicons name="earth" size={140} color="rgba(255,255,255,0.08)" style={s.heroWatermark} />
      {showPhoto && (
        <Image
          source={remoteImage(photo)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
          accessibilityLabel={`Fotografía de ${place.name}`}
          onLoad={() => setLoaded(photo)}
          onError={(e) => {
            setFailed(photo);
            logImageError(photo, e);
          }}
        />
      )}
      <View style={[s.heroOverlay, showPhoto && loaded === photo && s.heroShade]}>
        <Text style={s.heroTitle} numberOfLines={2}>
          {place.name}
        </Text>
        <View style={s.heroMeta}>
          <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={s.heroSubtitle} numberOfLines={1}>
            {[place.state, place.country].filter(Boolean).join(', ')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function WeatherSummary({ data }) {
  const { current, days, tip } = data;
  return (
    <>
      <View style={s.weatherTop}>
        <View style={s.weatherIcon}>
          <Ionicons name={current.icon} size={40} color={colors.accent} />
        </View>
        <View style={s.flex1}>
          <Text style={s.temp}>{current.temp}°</Text>
          <Text style={s.weatherText}>{current.text}</Text>
        </View>
        <View style={s.weatherStats}>
          <MiniStat icon="body-outline" value={`Sensación ${current.feelsLike}°`} />
          <MiniStat icon="water-outline" value={`Humedad ${current.humidity}%`} />
          <MiniStat icon="speedometer-outline" value={`Viento ${current.wind} km/h`} />
        </View>
      </View>

      <View style={ui.divider} />

      <View style={s.days}>
        {days.slice(0, 3).map((day, i) => (
          <View key={day.date} style={s.day}>
            <Text style={s.dayName}>{formatDay(day.date, i)}</Text>
            <Ionicons name={day.icon} size={22} color={colors.textSecondary} />
            <Text style={s.dayRange}>
              <Text style={s.dayMax}>{day.max}°</Text> {day.min}°
            </Text>
          </View>
        ))}
      </View>

      <View style={s.tip}>
        <Ionicons name={tip.icon} size={18} color={colors.primary} />
        <Text style={s.tipText}>{tip.text}</Text>
      </View>

      <LinkButton label="Ver pronóstico de 7 días" onPress={() => router.push('/pronostico')} />
    </>
  );
}

function MiniStat({ icon, value }) {
  return (
    <View style={s.miniStat}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={s.miniStatText}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  flex1: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 2 },

  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text, outlineStyle: 'none' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
    minWidth: 84,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  chips: { gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipLocation: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },

  results: { gap: 16 },
  dimmed: { opacity: 0.55 },

  hero: { height: 220, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  heroPlain: { backgroundColor: colors.primary },
  heroWatermark: { position: 'absolute', right: -20, top: -10 },
  heroOverlay: {
    padding: 16,
    paddingTop: 40,
    gap: 4,
  },
  heroShade: { backgroundColor: 'rgba(15, 23, 42, 0.42)' },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '800' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '500', flexShrink: 1 },

  facts: { flexDirection: 'row', gap: 8 },

  weatherTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  temp: { color: colors.text, fontSize: 40, fontWeight: '300', lineHeight: 44 },
  weatherText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  weatherStats: { gap: 4 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { color: colors.textSecondary, fontSize: 12 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6, flex: 1 },
  dayName: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  dayRange: { color: colors.textMuted, fontSize: 13 },
  dayMax: { color: colors.text, fontWeight: '700' },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: 10,
  },
  tipText: { color: colors.primary, fontWeight: '600', flex: 1, fontSize: 13 },

  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emblem: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  aboutTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  aboutSubtitle: { color: colors.textSecondary, fontSize: 13 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { color: colors.textSecondary, width: 110 },
  infoValue: { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },

  attribution: { color: colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
