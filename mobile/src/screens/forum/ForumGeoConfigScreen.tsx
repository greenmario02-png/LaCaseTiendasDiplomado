import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { listCities, resolveGeo, ForumCity } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { useForumStore } from '../../stores/forumStore';
import { useAuthStore } from '../../stores/authStore';
import { LoadingState } from '../../components/redesign/States';
import { NeoButton } from '../../components/redesign/NeoButton';
import { MapPin } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function ForumGeoConfigScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const geo = useForumStore((s) => s.geo);
  const updateGeo = useForumStore((s) => s.updateGeo);
  const { user } = useAuthStore();

  const [cities, setCities] = useState<ForumCity[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [cityId, setCityId] = useState<number | null>(geo?.cityId ?? null);
  const [radioKm, setRadioKm] = useState(geo?.radioKm ?? 25);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCities()
      .then((all) => {
        const depts = [...new Set(all.map((c) => c.department))].sort();
        setCities(all);
        setDepartments(depts);
        const current = geo?.cityId ? all.find((c) => c.id === geo.cityId) : null;
        if (current) setSelectedDept(current.department);
      })
      .catch(() => Alert.alert('Error', 'No se pudieron cargar las ciudades.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleCities = selectedDept
    ? cities.filter((c) => c.department === selectedDept)
    : cities;

  const useGps = async () => {
    if (!user) {
      Alert.alert('Iniciá sesión', 'Necesitás sesión para guardar tu zona.');
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Elegí tu ciudad manualmente.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const res = await resolveGeo(pos.coords.latitude, pos.coords.longitude);
      setCityId(res.cityId);
      const city = cities.find((c) => c.id === res.cityId);
      if (city) setSelectedDept(city.department);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!cityId) {
      Alert.alert('Elegí una ciudad', 'Seleccioná tu ciudad para continuar.');
      return;
    }
    setSaving(true);
    try {
      await updateGeo({ cityId, radioKm });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, gap: 14 }}>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <MapPin size={18} color={colors.forumAccent} />
          <Text style={styles.title}>Tu zona del foro</Text>
        </View>
        <Text style={styles.muted}>
          Elegí tu departamento y ciudad para ver los foros de tu zona (estilo Facebook
          Marketplace). Podés usar el GPS para detectarla automáticamente.
        </Text>
        <NeoButton
          title={locating ? 'Ubicando...' : 'Usar mi ubicación GPS'}
          onPress={useGps}
          disabled={locating}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Departamento</Text>
        <View style={styles.chipsRow}>
          {departments.map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                setSelectedDept(d);
                const first = cities.find((c) => c.department === d);
                if (first) setCityId(first.id);
              }}
              style={[styles.chip, selectedDept === d && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedDept === d && styles.chipTextActive]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ciudad</Text>
        <View style={styles.chipsRow}>
          {visibleCities.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCityId(c.id)}
              style={[styles.chip, cityId === c.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, cityId === c.id && styles.chipTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Radio de zona: {radioKm} km
        </Text>
        <Text style={styles.muted}>
          Ajustá el rango para que los foros cercanos también aparezcan (5–200 km).
        </Text>
        <Slider
          style={{ height: 40 }}
          minimumValue={5}
          maximumValue={200}
          step={5}
          value={radioKm}
          onValueChange={setRadioKm}
          minimumTrackTintColor={colors.forumAccent}
          maximumTrackTintColor={colors.forumBorder}
          thumbTintColor={colors.forumAccent}
        />
        <View style={styles.radioRow}>
          <Text style={styles.muted}>5 km</Text>
          <Text style={styles.muted}>200 km</Text>
        </View>
      </View>

      <NeoButton
        title={saving ? 'Guardando...' : 'Guardar zona'}
        onPress={save}
        disabled={saving || !cityId}
      />
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forumBg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forumBg,
  },
  card: {
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.forumText,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forumText,
  },
  muted: {
    fontSize: 12,
    color: colors.forumMuted,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    backgroundColor: colors.forumInput,
  },
  chipActive: {
    backgroundColor: colors.forumAccent,
    borderColor: colors.forumAccent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forumTextSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
