import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { listCategories, getCitiesStats } from '../../services/forum.api';
import { useForumStore } from '../../stores/forumStore';
import { getErrorMessage } from '../../services/api';
import { MapPin } from 'lucide-react-native';
import { CategoryIcon } from '../../theme/forumIcons';
import { EmptyState } from '../../components/redesign/States';
import { useAppTheme } from '../../theme/ThemeContext';

export default function ForumCategoriesScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const setCategory = useForumStore((s) => s.setCategory);
  const setCity = useForumStore((s) => s.setCity);

  useEffect(() => {
    (async () => {
      try {
        const [cats, citiesData] = await Promise.all([
          listCategories(),
          getCitiesStats(),
        ]);
        setCategories(cats);
        setCities(citiesData);
      } catch (e) {
        Alert.alert('Error', getErrorMessage(e));
      }
    })();
  }, []);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      data={[{ type: 'header' }, ...categories] as any[]}
      keyExtractor={(item, i) =>
        item.type === 'header' ? 'header' : `c-${item.id}-${i}`
      }
      renderItem={({ item }) => {
        if (item.type === 'header') {
          return (
            <>
              <Text style={styles.sectionTitle}>Subforos</Text>
              <View style={styles.catsRow}>
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.catCard}
                    onPress={() => {
                      setCategory(c.slug);
                      navigation.navigate('ForumFeed');
                    }}
                  >
                    <CategoryIcon slug={c.slug} size={26} color={colors.forumAccent} />
                    <Text style={styles.catName}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionTitle}>Ciudades</Text>
              <View style={styles.citiesRow}>
                {cities.map((c) => (
                  <Pressable
                    key={c.city}
                    style={styles.cityChip}
                    onPress={() => {
                      setCity(c.city);
                      navigation.navigate('ForumFeed');
                    }}
                  >
                    <View style={styles.cityRow}>
                      <MapPin size={12} color={colors.warning} />
                      <Text style={styles.cityText}>
                        {c.city} ({c.count})
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          );
        }
        return null;
      }}
      ListEmptyComponent={<EmptyState message="Sin categorías aún" />}
    />
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forumBg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forumText,
    marginBottom: 6,
  },
  catsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '31%',
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  catName: {
    fontSize: 11,
    color: colors.forumTextSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  citiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    backgroundColor: 'rgba(249,168,37,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249,168,37,0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cityRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  cityText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
});
