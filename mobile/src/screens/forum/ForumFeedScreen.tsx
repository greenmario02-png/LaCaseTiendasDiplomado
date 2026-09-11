import React, { useMemo,  useEffect, useState, useCallback  } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import { useForumStore } from '../../stores/forumStore';
import { useAuthStore } from '../../stores/authStore';
import * as forumApi from '../../services/forum.api';
import { ForumPostCard } from '../../components/redesign/ForumPostCard';
import { EmptyState, LoadingState } from '../../components/redesign/States';
import { Clock, Flame, CircleQuestionMark, MapPin, X, Pencil, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { VisionBackground } from '../../components/vision';

const MODES = [
  { key: 'RECIENTE', label: 'Reciente', icon: Clock },
  { key: 'POPULAR', label: 'Popular', icon: Flame },
  { key: 'SIN_RESPUESTA', label: 'Sin respuesta', icon: CircleQuestionMark },
  { key: 'MI_CIUDAD', label: 'Mi ciudad', icon: MapPin },
];

// Detección de ciudad una sola vez por sesión (09-spec G6).
let sessionGeoAttempted = false;

export default function ForumFeedScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { posts, loading, activeMode, activeCategory, fetchPosts, loadMorePosts, setMode, setCategory, geo, geoLoaded } =
    useForumStore();
  const [refreshing, setRefreshing] = useState(false);
  const [cityCategories, setCityCategories] = useState<{ categoryId: number; category?: { id: number; name: string; slug: string } }[]>([]);

  useEffect(() => {
    fetchPosts({ reset: true });
    fetchProfileSafe();

    if (!sessionGeoAttempted) {
      sessionGeoAttempted = true;
      const store = useForumStore.getState();
      if (!store.geoLoaded) {
        store
          .fetchGeoSession()
          .then(() => {
            const s = useForumStore.getState();
            if (!s.geo?.cityId) autoDetectCity();
          })
          .catch(() => autoDetectCity());
      } else if (!store.geo?.cityId) {
        autoDetectCity();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfileSafe = useCallback(() => {
    useForumStore.getState().fetchProfile().catch(() => null);
  }, []);

  // Carga los subforos (categorías) de la ciudad activa (chips de etiquetas).
  useEffect(() => {
    if (!geo?.cityId) {
      setCityCategories([]);
      return;
    }
    forumApi
      .listCities()
      .then((cities) => {
        const city = cities.find((c) => c.id === geo.cityId);
        setCityCategories((city?.categories ?? []).filter((cc) => Boolean(cc.category)));
      })
      .catch(() => setCityCategories([]));
  }, [geo?.cityId, geo?.city]);

  const autoDetectCity = useCallback(async () => {
    const { user } = useAuthStore.getState();
    if (!user) return; // sin sesión no guardamos ubicación
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return; // → banner de configuración manual
      const pos = await Location.getCurrentPositionAsync({});
      const resolved = await forumApi.resolveGeo(pos.coords.latitude, pos.coords.longitude);
      if (resolved.cityId) {
        await useForumStore
          .getState()
          .updateGeo({
            cityId: resolved.cityId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
      }
    } catch {
      // silencioso: el banner manual queda visible
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts({ reset: true });
    setRefreshing(false);
  }, [fetchPosts]);

  return (
    <View style={styles.container}>
      <VisionBackground />
      {/* Barra de ciudad / banner de configuración */}
      {geo?.cityId && geo.city ? (
        <Pressable style={styles.cityBar} onPress={() => navigation.navigate('ForumGeoConfig')}>
          <View style={styles.cityBarRow}>
            <MapPin size={13} color={colors.forumAccent} />
            <Text style={styles.cityBarText}>{geo.city}</Text>
            {geo.cityVerified ? <CheckCircle2 size={12} color={colors.karmaUp} /> : null}
            <Text style={styles.cityBarText}>· Cambiar</Text>
          </View>
        </Pressable>
      ) : geoLoaded ? (
        <Pressable style={styles.geoBanner} onPress={() => navigation.navigate('ForumGeoConfig')}>
          <View style={styles.geoBannerRow}>
            <MapPin size={13} color={colors.forumTextSecondary} />
            <Text style={styles.geoBannerText}>
              Configurá tu ciudad para ver los foros de tu zona
            </Text>
          </View>
        </Pressable>
      ) : null}

      {/* Chips de subforos de la ciudad activa */}
      {geo?.city && cityCategories.length > 0 && (
        <View style={styles.subforosWrap}>
          <Text style={styles.subforosLabel}>Subforos de {geo.city}:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subforosRow}>
            {cityCategories.map(({ category }) =>
              category ? (
                <Pressable
                  key={category.id}
                  onPress={() => setCategory(activeCategory === category.slug ? '' : category.slug)}
                  style={[styles.subforoChip, activeCategory === category.slug && styles.subforoChipActive]}
                >
                  <Text
                    style={[
                      styles.subforoChipText,
                      activeCategory === category.slug && styles.subforoChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              ) : null
            )}
            {activeCategory ? (
              <Pressable onPress={() => setCategory('')} style={styles.subforoChipAll}>
                <View style={styles.subforoChipAllRow}>
                  <X size={11} color={colors.forumAccent} />
                  <Text style={styles.subforoChipTextAll}>Ver todo</Text>
                </View>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      )}

      <View style={styles.tabsRow}>
        {MODES.map((m) => {
          const ModeIcon = m.icon;
          const active = activeMode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMode(m.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <View style={styles.tabRow}>
                <ModeIcon size={12} color={active ? colors.forumAccent : colors.forumTextSecondary} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{m.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {loading && posts.length === 0 ? (
        <View style={styles.centerBox}>
          <LoadingState />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => (
            <ForumPostCard
              post={{
                id: item.id,
                title: item.title,
                body: item.body,
                city: item.city,
                category: {
                  icon: item.category?.icon ?? '💬',
                  name: item.category?.name ?? 'General',
                  color: item.category?.color ?? '#6366F1',
                },
                author: { forumUsername: item.author?.forumUsername ?? 'usuario' },
                status: (item.status as 'OPEN' | 'RESOLVED' | 'CLOSED') ?? 'OPEN',
                replyCount: item.replyCount,
                positives: item.score ?? 0,
                createdAt: item.createdAt,
              }}
              onOpen={(id) => navigation.navigate('ForumPost', { id })}
              onPositive={(id) => useForumStore.getState().votePost(id, 1)}
            />
          )}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.forumAccent}
            />
          }
          contentContainerStyle={{ padding: 12, gap: 10 }}
          ListEmptyComponent={
            !loading ? <EmptyState message="No hay preguntas aún" /> : null
          }
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('NewPost')}
      >
        <Pencil size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forumBg,
  },
  cityBar: {
    backgroundColor: 'rgba(255,180,0,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.forumBorder,
  },
  cityBarRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  cityBarText: {
    color: colors.forumAccent,
    fontSize: 13,
    fontWeight: '700',
  },
  geoBanner: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.forumBorder,
  },
  geoBannerRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  geoBannerText: {
    color: colors.forumTextSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 4,
    backgroundColor: colors.forumCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.forumBorder,
  },
  subforosWrap: {
    backgroundColor: colors.forumCard,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.forumBorder,
  },
  subforosLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forumTextSecondary,
    marginBottom: 8,
  },
  subforosRow: {
    gap: 6,
    paddingBottom: 8,
  },
  subforoChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.forumBg,
    borderWidth: 1,
    borderColor: colors.forumBorder,
  },
  subforoChipActive: {
    backgroundColor: colors.forumAccent,
    borderColor: colors.forumAccent,
  },
  subforoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forumTextSecondary,
  },
  subforoChipTextActive: {
    color: '#fff',
  },
  subforoChipAll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderWidth: 1,
    borderColor: colors.forumAccent,
  },
  subforoChipAllRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  subforoChipTextAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forumAccent,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(255,107,53,0.12)',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forumTextSecondary,
  },
  tabTextActive: {
    color: colors.forumAccent,
  },
  empty: {
    textAlign: 'center',
    color: colors.forumMuted,
    marginTop: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.forumAccent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.forumAccent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});
