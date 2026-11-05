import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  bg: '#F3F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  primary: '#0B4F8A',
  primarySoft: '#E7F0F9',
  accent: '#F59E0B',
  success: '#15803D',
  successSoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  skeleton: '#E5E9F0',
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
const shadow = { boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.06), 0px 2px 8px rgba(15, 23, 42, 0.04)' };

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Título de sección con la API de origen a la derecha (relaciona cada bloque con su fuente).
export function SectionHeader({ title, source }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {source && <Text style={styles.source}>Fuente: {source}</Text>}
    </View>
  );
}

export function Fact({ icon, label, value }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

export function Skeleton({ width = '100%', height = 14, style }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.skeleton, { width, height, opacity }, style]} />;
}

// Bloque de carga accesible: esqueleto + texto para lectores de pantalla.
export function LoadingBlock({ label, lines = 3 }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" style={styles.loadingBlock}>
      <Text style={styles.loadingText}>{label}</Text>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

export function ErrorNotice({ title, message, onRetry }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <View style={styles.errorBody}>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorText}>{message}</Text>
        {onRetry && (
          <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
            <Ionicons name="refresh" size={14} color={colors.danger} />
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function LinkButton({ label, icon = 'arrow-forward', onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
      accessibilityRole="link"
    >
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </Pressable>
  );
}

/** Sección que pinta el estado de una API: cargando, error o contenido. */
export function ApiSection({ title, source, result, loadingText, errorTitle, onRetry, children }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} source={source} />
      <Card>
        {result.status === 'loading' && <LoadingBlock label={loadingText} />}
        {result.status === 'error' && (
          <ErrorNotice title={errorTitle} message={result.error} onRetry={onRetry} />
        )}
        {result.status === 'success' && result.data && children(result.data)}
      </Card>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  source: { color: colors.textMuted, fontSize: 12 },
  fact: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  factValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  factLabel: { color: colors.textSecondary, fontSize: 11 },
  skeleton: { backgroundColor: colors.skeleton, borderRadius: 6 },
  loadingBlock: { gap: 10 },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  error: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  errorBody: { flex: 1, gap: 2 },
  errorTitle: { color: colors.danger, fontWeight: '700' },
  errorText: { color: '#7F1D1D', lineHeight: 19 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6 },
  retryText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { color: colors.primary, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  body: { color: colors.textSecondary, lineHeight: 21 },
  muted: { color: colors.textSecondary },
});
