import React, { useMemo,  useEffect, useState  } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import {
  listCategories,
  createPost,
  uploadPostImages,
  searchGifs,
  type GifResult,
} from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useForumStore } from '../../stores/forumStore';
import { NeoInput } from '../../components/redesign/NeoInput';
import { NeoButton } from '../../components/redesign/NeoButton';
import { useAppTheme } from '../../theme/ThemeContext';
import { Bot, Camera, Film, X } from 'lucide-react-native';
import { CategoryIcon } from '../../theme/forumIcons';

const POST_TYPES = [
  'GENERAL',
  'PRECIO',
  'EXISTENCIA',
  'EMPLEO',
  'ALQUILER',
  'ANTICROTICO',
  'DIRECCION',
];

export default function NewPostScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuthStore();
  const fetchPosts = useForumStore((s) => s.fetchPosts);
  const [categories, setCategories] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [city, setCity] = useState(user?.forumProfile?.city ?? '');
  const [type, setType] = useState('GENERAL');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [gifUrls, setGifUrls] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifDebounce, setGifDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listCategories()
      .then((cats) => setCategories(cats ?? []))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (gifDebounce) clearTimeout(gifDebounce);
    const q = gifQuery.trim();
    if (q.length < 2) {
      setGifResults([]);
      setGifLoading(false);
      return;
    }
    setGifLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchGifs(q, 12);
        setGifResults(res ?? []);
      } catch {
        setGifResults([]);
      } finally {
        setGifLoading(false);
      }
    }, 300);
    setGifDebounce(t);
    return () => { if (t) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifQuery]);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('mobile.newPost.galleryPermissionTitle'), t('mobile.newPost.galleryPermissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 4));
    }
  };

  const addTag = () => {
    const t = tag.trim().replace(/^#/, '');
    if (!t || tags.length >= 5 || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTag('');
  };

  const handleSubmit = async () => {
    if (title.trim().length < 10) {
      Alert.alert(t('mobile.newPost.titleTooShortTitle'), t('mobile.newPost.titleTooShortMessage'));
      return;
    }
    if (body.trim().length < 20) {
      Alert.alert(t('mobile.newPost.bodyTooShortTitle'), t('mobile.newPost.bodyTooShortMessage'));
      return;
    }
    if (!categoryId) {
      Alert.alert(t('mobile.newPost.missingCategoryTitle'), t('mobile.newPost.missingCategoryMessage'));
      return;
    }
    setSending(true);
    try {
      const post = await createPost({
        title: title.trim(),
        body: body.trim(),
        categoryId,
        city: city.trim() || 'Bolivia',
        type,
        tags,
        images: gifUrls,
      });
      if (images.length > 0 && post?.id) {
        await uploadPostImages(post.id, images.slice(0, 4));
      }
      await fetchPosts({ reset: true });
      Alert.alert(t('mobile.newPost.publishedTitle'), t('mobile.newPost.publishedMessage'), [
        { text: t('mobile.common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>{t('mobile.newPost.titleLabel')}</Text>
      <NeoInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={t('mobile.newPost.titlePlaceholder')}
      />

      <Text style={styles.label}>{t('mobile.newPost.bodyLabel')}</Text>
      <NeoInput
        style={[styles.input, styles.bodyInput]}
        multiline
        value={body}
        onChangeText={setBody}
        placeholder={t('mobile.newPost.bodyPlaceholder')}
      />

      <Text style={styles.label}>{t('mobile.newPost.categoryLabel')}</Text>
      <View style={styles.chips}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, categoryId === c.id && styles.chipActive]}
            onPress={() => setCategoryId(c.id)}
          >
            <View style={styles.chipIconRow}>
              <CategoryIcon slug={c.slug} size={13} color={categoryId === c.id ? colors.forumAccent : colors.forumTextSecondary} />
              <Text
                style={[
                  styles.chipText,
                  categoryId === c.id && styles.chipTextActive,
                ]}
              >
                {c.name}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('mobile.newPost.typeLabel')}</Text>
      <View style={styles.chips}>
        {POST_TYPES.map((pt) => (
          <Pressable
            key={pt}
            style={[styles.chip, type === pt && styles.chipActive]}
            onPress={() => setType(pt)}
          >
            <Text
              style={[styles.chipText, type === pt && styles.chipTextActive]}
            >
              {pt}
            </Text>
          </Pressable>
        ))}
      </View>

      {type === 'PRECIO' || type === 'EXISTENCIA' ? (
        <View style={styles.botNoteRow}>
          <Bot size={14} color={colors.forumAccent} />
          <Text style={styles.botNote}>
            {t('mobile.newPost.botNoteText')}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>{t('mobile.newPost.cityLabel')}</Text>
      <NeoInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder={t('mobile.newPost.cityPlaceholder')}
      />

      <Text style={styles.label}>{t('mobile.newPost.tagsLabel')}</Text>
      <View style={styles.tagRow}>
        <NeoInput
          style={[styles.input, styles.tagInput]}
          value={tag}
          onChangeText={setTag}
          placeholder={t('mobile.newPost.tagPlaceholder')}
        />
        <Pressable style={styles.addTagBtn} onPress={addTag}>
          <Text style={styles.addTagText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {tags.map((tg) => (
          <Pressable
            key={tg}
            style={styles.tagChip}
            onPress={() => setTags((prev) => prev.filter((x) => x !== tg))}
          >
            <View style={styles.tagChipRow}>
              <Text style={styles.tagChipText}>#{tg}</Text>
              <X size={11} color={colors.forumAccent} />
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('mobile.newPost.imagesLabel')}</Text>
      <View style={styles.chips}>
        {images.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.imgPreview} />
        ))}
        {gifUrls.map((u) => (
          <Image key={u} source={{ uri: u }} style={styles.imgPreview} />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Pressable
          style={[styles.imgBtn, images.length + gifUrls.length >= 4 && { opacity: 0.4 }]}
          onPress={pickImages}
          disabled={images.length + gifUrls.length >= 4}
        >
          <View style={styles.imgBtnRow}>
            <Camera size={14} color={colors.forumAccent} />
            <Text style={styles.imgBtnText}>{t('mobile.newPost.addPhotosButton')}</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.imgBtn, images.length + gifUrls.length >= 4 && { opacity: 0.4 }]}
          onPress={() => setGifOpen(true)}
          disabled={images.length + gifUrls.length >= 4}
        >
          <View style={styles.imgBtnRow}>
            <Film size={14} color={colors.forumAccent} />
            <Text style={styles.imgBtnText}>{t('mobile.newPost.searchGifsButton', { count: gifUrls.length })}</Text>
          </View>
        </Pressable>
      </View>

      <NeoButton
        title={sending ? t('mobile.newPost.publishing') : t('mobile.newPost.publishButton')}
        onPress={handleSubmit}
        disabled={sending}
      />

      {/* Modal de GIFs (09-spec G4.3) */}
      <Modal visible={gifOpen} animationType="slide" transparent>
        <View style={styles.gifOverlay}>
          <View style={styles.gifModal}>
            <View style={styles.gifTitleRow}>
              <Film size={16} color={colors.forumAccent} />
              <Text style={styles.gifTitle}>{t('mobile.newPost.gifModalTitle')}</Text>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              value={gifQuery}
              onChangeText={setGifQuery}
              placeholder={t('mobile.newPost.gifSearchPlaceholder')}
              placeholderTextColor={colors.forumMuted}
              autoFocus
            />            {gifLoading ? (
              <ActivityIndicator color={colors.forumAccent} style={{ marginVertical: 24 }} />
            ) : gifQuery.trim().length >= 2 && gifResults.length === 0 ? (
              <Text style={styles.gifEmpty}>{t('mobile.newPost.noGifsFoundMessage')}</Text>
            ) : (
              <FlatList
                data={gifResults}
                keyExtractor={(g) => g.id}
                numColumns={3}
                contentContainerStyle={{ gap: 6 }}
                columnWrapperStyle={{ gap: 6 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setGifUrls((prev) => [...prev, item.url].slice(0, 4));
                      setGifOpen(false);
                      setGifQuery('');
                    }}
                    style={{ flex: 1 / 3 }}
                  >
                    <Image
                      source={{ uri: item.previewUrl }}
                      style={{ width: '100%', aspectRatio: 1, borderRadius: 6 }}
                    />
                  </Pressable>
                )}
              />
            )}
            <Pressable style={styles.gifClose} onPress={() => { setGifOpen(false); setGifQuery(''); }}>
              <Text style={styles.gifCloseText}>{t('mobile.common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forumBg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forumTextSecondary,
  },
  input: {
    minHeight: 42,
    backgroundColor: colors.forumInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    padding: 10,
  },
  bodyInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.forumCard,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.forumAccent,
    backgroundColor: 'rgba(255,107,53,0.12)',
  },
  chipText: {
    fontSize: 12,
    color: colors.forumTextSecondary,
  },
  chipTextActive: {
    color: colors.forumAccent,
    fontWeight: '700',
  },
  chipIconRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  botNote: {
    flex: 1,
    fontSize: 12,
    color: colors.forumAccent,
  },
  botNoteRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,53,0.08)',
    padding: 10,
    borderRadius: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
  },
  addTagBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.forumAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  tagChip: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagChipText: {
    fontSize: 11,
    color: colors.forumAccent,
  },
  tagChipRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  imgPreview: {
    width: 96,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.forumBorder,
  },
  imgBtn: {
    backgroundColor: colors.forumCard,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  imgBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forumAccent,
  },
  imgBtnRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  gifModal: {
    backgroundColor: colors.forumCard,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  gifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forumText,
    marginBottom: 8,
  },
  gifTitleRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  gifEmpty: {
    textAlign: 'center',
    color: colors.forumMuted,
    marginVertical: 24,
  },
  gifClose: {
    marginTop: 12,
    backgroundColor: colors.forumBorder,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  gifCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.forumTextSecondary,
  },
});
