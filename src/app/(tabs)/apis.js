// Panel de diagnóstico: endpoints, estado de la última petición de cada API (HTTPS, tiempo)
// y un interruptor para simular que un servicio no está disponible (Parte 3 de la actividad).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, colors, LinkButton, radius, styles as ui } from '../../components/ui';
import { useDestination } from '../../context/DestinationContext';
import { NOMINATIM } from '../../services/geocoding';
import { OPEN_METEO } from '../../services/weather';
import { WIKIPEDIA } from '../../services/wikipedia';

const SERVICES = [
  {
    ...NOMINATIM,
    number: 1,
    key: 'place',
    icon: 'map-outline',
    role: 'Geolocalización: convierte el nombre del destino en coordenadas, país, población y artículo de Wikipedia.',
    endpoint: `GET ${NOMINATIM.searchUrl}`,
    uses: 'Texto escrito por el usuario',
  },
  {
    ...OPEN_METEO,
    number: 2,
    key: 'weather',
    icon: 'partly-sunny-outline',
    role: 'Clima actual, pronóstico de 7 días, zona horaria y altitud.',
    endpoint: `GET ${OPEN_METEO.forecastUrl}`,
    uses: 'latitude / longitude de la API 1',
  },
  {
    ...WIKIPEDIA,
    number: 3,
    key: 'wiki',
    icon: 'book-outline',
    role: 'Descripción turística e imagen del destino.',
    endpoint: `GET ${WIKIPEDIA.summaryUrl}`,
    uses: 'extratags.wikipedia de la API 1',
  },
];

const STATUS = {
  idle: { label: 'Sin consultar', color: colors.textMuted, bg: colors.surfaceAlt, icon: 'ellipse-outline' },
  loading: { label: 'Consultando', color: '#B45309', bg: '#FEF3C7', icon: 'hourglass-outline' },
  success: { label: 'Operativo', color: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' },
  error: { label: 'Falló', color: colors.danger, bg: colors.dangerSoft, icon: 'close-circle' },
};

export default function ServicesScreen() {
  const destination = useDestination();
  const { outages, toggleOutage, refresh, busy, place } = destination;

  return (
    <ScrollView style={s.flex} contentContainerStyle={s.container}>
      <Card style={s.flowCard}>
        <Text style={s.flowTitle}>Flujo de integración</Text>
        <View style={s.flow}>
          <FlowStep n={1} label="Nominatim" />
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
          <View style={s.flowParallel}>
            <FlowStep n={2} label="Open-Meteo" />
            <FlowStep n={3} label="Wikipedia" />
          </View>
        </View>
        <Text style={ui.muted}>
          La API 1 se consulta primero. Con su respuesta se llaman en paralelo las APIs 2 y 3; si una
          falla, la otra se sigue mostrando.
        </Text>
        {place.data && <Text style={s.current}>Destino actual: {place.data.name}</Text>}
      </Card>

      {SERVICES.map((svc) => {
        const result = destination[svc.key];
        const st = STATUS[result.status];
        const https = result.url?.startsWith('https://');
        return (
          <Card key={svc.id}>
            <View style={s.header}>
              <View style={s.iconBox}>
                <Ionicons name={svc.icon} size={20} color={colors.primary} />
              </View>
              <View style={s.flex1}>
                <Text style={s.overline}>API {svc.number}</Text>
                <Text style={s.name}>{svc.name}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={13} color={st.color} />
                <Text style={[s.pillText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>

            <Text style={ui.muted}>{svc.role}</Text>

            <View style={s.kv}>
              <Text style={s.k}>Endpoint</Text>
              <Text style={s.code}>{svc.endpoint}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>Parámetro de entrada</Text>
              <Text style={s.v}>{svc.uses}</Text>
            </View>

            <View style={s.metrics}>
              <Metric label="Tiempo" value={result.ms != null ? `${result.ms} ms` : '—'} />
              <Metric
                label="Protocolo"
                value={result.url ? (https ? 'HTTPS' : 'HTTP') : '—'}
                icon={result.url ? (https ? 'lock-closed' : 'lock-open') : null}
                color={https ? colors.success : colors.danger}
              />
            </View>

            {result.error && (
              <View style={s.errorLine}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={s.errorText}>{result.error}</Text>
              </View>
            )}
            {result.url && (
              <View style={s.kv}>
                <Text style={s.k}>Última URL solicitada</Text>
                <Text style={s.code} selectable>
                  {result.url}
                </Text>
              </View>
            )}

            <View style={ui.divider} />
            <View style={s.switchRow}>
              <View style={s.flex1}>
                <Text style={s.v}>Simular servicio caído</Text>
                <Text style={s.hint}>Envía la petición a un dominio inexistente</Text>
              </View>
              <Switch
                value={outages[svc.id]}
                onValueChange={() => toggleOutage(svc.id)}
                trackColor={{ false: colors.border, true: colors.danger }}
                thumbColor="#ffffff"
                activeThumbColor="#ffffff"
                accessibilityLabel={`Simular caída de ${svc.name}`}
              />
            </View>
            <LinkButton label="Documentación" icon="open-outline" onPress={() => Linking.openURL(svc.docs)} />
          </Card>
        );
      })}

      <Pressable
        style={({ pressed }) => [s.retry, (pressed || busy) && ui.pressed]}
        onPress={refresh}
        disabled={busy}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={s.retryText}>Repetir la última consulta</Text>
      </Pressable>
    </ScrollView>
  );
}

function FlowStep({ n, label }) {
  return (
    <View style={s.step}>
      <Text style={s.stepN}>{n}</Text>
      <Text style={s.stepLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, value, icon, color }) {
  return (
    <View style={s.metric}>
      <Text style={s.k}>{label}</Text>
      <View style={s.metricRow}>
        {icon && <Ionicons name={icon} size={13} color={color} />}
        <Text style={[s.metricValue, icon && { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  flex1: { flex: 1 },
  container: { padding: 16, gap: 14, paddingBottom: 32 },
  flowCard: { gap: 10 },
  flowTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flowParallel: { gap: 6 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
  },
  stepN: {
    color: '#fff',
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  stepLabel: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  current: { color: colors.text, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },

  kv: { gap: 4 },
  k: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  v: { color: colors.text, fontWeight: '500' },
  code: {
    color: colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 8,
  },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: 10, gap: 4 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricValue: { color: colors.text, fontWeight: '700' },
  errorLine: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  errorText: { color: colors.danger, flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { color: colors.textMuted, fontSize: 12 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
