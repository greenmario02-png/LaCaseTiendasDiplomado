import React from 'react';
import { Text, View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { BadgeCheck, MapPin, Users } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export type PayPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Job {
  id: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  city?: string | null;
  locationState?: string | null;
  payPeriod: PayPeriod;
  salaryMin?: string | null;
  salaryMax?: string | null;
  vacancies?: number | null;
  schedule?: string | null;
  contactPhone?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  distanceKm?: number;
  category?: { id: number; name: string; slug?: string; icon?: string | null } | null;
  store?: {
    id: number;
    storeName: string;
    storeLogo?: string | null;
    isVerified?: boolean;
    locationCity?: string | null;
  } | null;
}

export const PAY_PERIOD_LABEL: Record<PayPeriod, string> = {
  DAILY: 'por día',
  WEEKLY: 'por semana',
  MONTHLY: 'por mes',
};

const num = (v: string | number) =>
  Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 });

export function formatSalary(job: Pick<Job, 'salaryMin' | 'salaryMax' | 'payPeriod'>): string {
  const min = job.salaryMin != null ? Number(job.salaryMin) : null;
  const max = job.salaryMax != null ? Number(job.salaryMax) : null;
  const period = PAY_PERIOD_LABEL[job.payPeriod] ?? '';
  let amount: string;
  if (min && max && min !== max) amount = `Bs ${num(min)} – ${num(max)}`;
  else if (min || max) amount = `Bs ${num((min || max) as number)}`;
  else return 'Sueldo a convenir';
  return `${amount} ${period}`.trim();
}

export function timeAgo(date?: string | null): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  if (isNaN(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `Hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
  const y = Math.floor(m / 12);
  return `Hace ${y} ${y === 1 ? 'año' : 'años'}`;
}

export interface JobCardProps {
  job: Job;
  onPress?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export function JobCard({ job, onPress, compact, style }: JobCardProps) {
  const { colors: c, raised } = useAppTheme();
  const city = job.city || job.store?.locationCity;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, compact && styles.compact, { backgroundColor: c.surface, ...raised }, style]}
    >
      {job.category ? (
        <Text style={[styles.category, { color: c.primary }]} numberOfLines={1}>
          {`${job.category.icon ?? ''} ${job.category.name}`.trim()}
        </Text>
      ) : null}
      <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
        {job.title}
      </Text>
      {job.store ? (
        <View style={styles.row}>
          <Text style={[styles.store, { color: c.textSecondary }]} numberOfLines={1}>
            {job.store.storeName}
          </Text>
          {job.store.isVerified ? <BadgeCheck size={14} color={c.success} /> : null}
        </View>
      ) : null}
      <Text style={[styles.salary, { color: c.success }]} numberOfLines={1}>
        {formatSalary(job)}
      </Text>
      <View style={styles.meta}>
        {city ? (
          <View style={styles.row}>
            <MapPin size={12} color={c.textSecondary} />
            <Text style={[styles.metaText, { color: c.textSecondary }]} numberOfLines={1}>
              {city}
            </Text>
          </View>
        ) : null}
        {job.vacancies ? (
          <View style={styles.row}>
            <Users size={12} color={c.textSecondary} />
            <Text style={[styles.metaText, { color: c.textSecondary }]}>
              {`${job.vacancies} ${job.vacancies === 1 ? 'vacante' : 'vacantes'}`}
            </Text>
          </View>
        ) : null}
      </View>
      {job.publishedAt ? (
        <Text style={[styles.metaText, { color: c.textSecondary }]}>{timeAgo(job.publishedAt)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 6, marginBottom: 14 },
  compact: { width: 240, marginBottom: 0 },
  category: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  store: { fontSize: 13, flexShrink: 1 },
  salary: { fontSize: 14, fontWeight: '800' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaText: { fontSize: 12 },
});
