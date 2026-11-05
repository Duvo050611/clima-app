// Pronóstico de 7 días del destino actual (Open-Meteo con las coordenadas de Nominatim).
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, ErrorNotice, LoadingBlock, radius, SectionHeader, styles as ui } from '../../components/ui';
import { useDestination } from '../../context/DestinationContext';
import { formatDay, formatLocalTime } from '../../utils/format';

export default function ForecastScreen() {
  const { place, weather, refresh } = useDestination();

  if (!place.data) {
    return (
      <View style={s.empty}>
        <Ionicons name="compass-outline" size={40} color={colors.textMuted} />
        <Text style={ui.muted}>Busca un destino en la pestaña “Explorar”.</Text>
      </View>
    );
  }

  const w = weather.status === 'success' ? weather.data : null;
  // Escala común para las barras de temperatura de toda la semana
  const low = w ? Math.min(...w.days.map((d) => d.min)) : 0;
  const high = w ? Math.max(...w.days.map((d) => d.max)) : 1;
  const span = Math.max(high - low, 1);

  return (
    <ScrollView style={s.flex} contentContainerStyle={s.container}>
      <View>
        <Text style={s.title}>{place.data.name}</Text>
        <Text style={ui.muted}>
          {[place.data.state, place.data.country].filter(Boolean).join(', ')}
        </Text>
      </View>

      {weather.status === 'loading' && (
        <Card>
          <LoadingBlock label="Consultando el pronóstico…" lines={5} />
        </Card>
      )}
      {weather.status === 'error' && (
        <ErrorNotice title="Pronóstico no disponible" message={weather.error} onRetry={refresh} />
      )}

      {w && (
        <>
          <View style={s.meta}>
            <MetaItem icon="globe-outline" label="Zona horaria" value={w.timezone} wide />
            <MetaItem icon="time-outline" label="Hora local" value={formatLocalTime(w.localTime)} />
            <MetaItem icon="trending-up-outline" label="Altitud" value={`${Math.round(w.elevation)} m`} />
          </View>

          <View style={ui.section}>
            <SectionHeader title="Próximos días" source="Open-Meteo" />
            <Card style={s.list}>
              {w.days.map((day, i) => {
                const left = ((day.min - low) / span) * 100;
                const width = Math.max(((day.max - day.min) / span) * 100, 4);
                return (
                  <View key={day.date} style={[s.row, i < w.days.length - 1 && s.rowBorder]}>
                    <View style={s.dayCol}>
                      <Text style={s.dayName}>{formatDay(day.date, i)}</Text>
                      <Text style={s.dayText} numberOfLines={1}>
                        {day.text}
                      </Text>
                    </View>
                    <View style={s.iconCol}>
                      <Ionicons name={day.icon} size={22} color={colors.textSecondary} />
                      <Text style={[s.rain, day.rainChance >= 50 && s.rainHigh]}>{day.rainChance}%</Text>
                    </View>
                    <Text style={s.min}>{day.min}°</Text>
                    <View style={s.track}>
                      <View style={[s.bar, { left: `${left}%`, width: `${width}%` }]} />
                    </View>
                    <Text style={s.max}>{day.max}°</Text>
                  </View>
                );
              })}
            </Card>
          </View>

          <View style={s.tip}>
            <Ionicons name={w.tip.icon} size={18} color={colors.primary} />
            <Text style={s.tipText}>{w.tip.text}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function MetaItem({ icon, label, value, wide }) {
  return (
    <View style={[s.metaItem, wide && s.metaWide]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={s.metaValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.metaLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 16, paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.bg, padding: 24 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  meta: { flexDirection: 'row', gap: 8 },
  metaItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  metaWide: { flex: 1.8 },
  metaValue: { color: colors.text, fontWeight: '700', fontSize: 14 },
  metaLabel: { color: colors.textSecondary, fontSize: 11 },
  list: { paddingVertical: 4, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dayCol: { width: 104 },
  dayName: { color: colors.text, fontWeight: '700' },
  dayText: { color: colors.textMuted, fontSize: 12 },
  iconCol: { alignItems: 'center', width: 36 },
  rain: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  rainHigh: { color: colors.primary },
  min: { color: colors.textMuted, width: 30, textAlign: 'right', fontWeight: '600' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.skeleton, overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3, backgroundColor: colors.accent },
  max: { color: colors.text, width: 30, fontWeight: '700' },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 12,
  },
  tipText: { color: colors.primary, fontWeight: '600', flex: 1 },
});
