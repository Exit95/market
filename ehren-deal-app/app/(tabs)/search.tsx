import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  X,
  ChevronDown,
  SlidersHorizontal,
  Truck,
  ShieldCheck,
} from 'lucide-react-native';
import { listingService, categoryService } from '@/services';
import type { ListingFilters } from '@/services';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme';
import type { ListingWithImages, Category } from '@/types';
import ListingCard from '@/components/listing/ListingCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITION_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: 'NEW', label: 'Neu' },
  { value: 'LIKE_NEW', label: 'Wie neu' },
  { value: 'GOOD', label: 'Gut' },
  { value: 'ACCEPTABLE', label: 'Akzeptabel' },
  { value: 'DEFECTIVE', label: 'Defekt' },
];

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Neueste' },
  { value: 'price_asc' as const, label: 'Preis aufsteigend' },
  { value: 'price_desc' as const, label: 'Preis absteigend' },
];

// ─── Search Screen ────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [shippingOnly, setShippingOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Modal state
  const [activeModal, setActiveModal] = useState<
    'category' | 'price' | 'condition' | 'sort' | null
  >(null);

  // Debounce search
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchText]);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Build filters
  const filters: ListingFilters = useMemo(() => {
    const f: ListingFilters = { sortBy, limit: 50 };
    if (debouncedSearch) f.search = debouncedSearch;
    if (selectedCategory) f.categoryId = selectedCategory;
    if (selectedCondition) f.condition = selectedCondition;
    if (shippingOnly) f.shippingAvailable = true;
    if (verifiedOnly) f.verifiedSeller = true;
    if (minPrice) f.minPrice = parseInt(minPrice, 10) * 100;
    if (maxPrice) f.maxPrice = parseInt(maxPrice, 10) * 100;
    return f;
  }, [
    debouncedSearch,
    selectedCategory,
    selectedCondition,
    shippingOnly,
    verifiedOnly,
    sortBy,
    minPrice,
    maxPrice,
  ]);

  const listingsQuery = useQuery<ListingWithImages[]>({
    queryKey: ['listings', 'search', filters],
    queryFn: () => listingService.getListings(filters),
  });

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count++;
    if (selectedCondition) count++;
    if (shippingOnly) count++;
    if (verifiedOnly) count++;
    if (minPrice || maxPrice) count++;
    return count;
  }, [selectedCategory, selectedCondition, shippingOnly, verifiedOnly, minPrice, maxPrice]);

  const clearAllFilters = useCallback(() => {
    setSelectedCategory('');
    setSelectedCondition('');
    setShippingOnly(false);
    setVerifiedOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
  }, []);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory || !categoriesQuery.data) return 'Kategorie';
    const cat = categoriesQuery.data.find((c) => c.id === selectedCategory);
    return cat ? cat.name : 'Kategorie';
  }, [selectedCategory, categoriesQuery.data]);

  const selectedConditionLabel = useMemo(() => {
    if (!selectedCondition) return 'Zustand';
    return CONDITION_OPTIONS.find((o) => o.value === selectedCondition)?.label ?? 'Zustand';
  }, [selectedCondition]);

  const sortLabel = useMemo(() => {
    return SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Neueste';
  }, [sortBy]);

  const results = listingsQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color={colors.neutral[400]} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Suche nach Angeboten..."
            placeholderTextColor={colors.neutral[400]}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            selectionColor={colors.primary[500]}
            cursorColor={colors.primary[500]}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <X size={18} color={colors.neutral[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          style={[
            styles.filterChip,
            selectedCategory ? styles.filterChipActive : null,
          ]}
          onPress={() => setActiveModal('category')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedCategory ? styles.filterChipTextActive : null,
            ]}
          >
            {selectedCategoryName}
          </Text>
          <ChevronDown
            size={14}
            color={selectedCategory ? colors.white : colors.neutral[500]}
          />
        </Pressable>

        <Pressable
          style={[styles.filterChip, (minPrice || maxPrice) ? styles.filterChipActive : null]}
          onPress={() => setActiveModal('price')}
        >
          <Text
            style={[
              styles.filterChipText,
              (minPrice || maxPrice) ? styles.filterChipTextActive : null,
            ]}
          >
            {minPrice || maxPrice
              ? `${minPrice || '0'} - ${maxPrice || '...'}EUR`
              : 'Preis'}
          </Text>
          <ChevronDown
            size={14}
            color={(minPrice || maxPrice) ? colors.white : colors.neutral[500]}
          />
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            selectedCondition ? styles.filterChipActive : null,
          ]}
          onPress={() => setActiveModal('condition')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedCondition ? styles.filterChipTextActive : null,
            ]}
          >
            {selectedConditionLabel}
          </Text>
          <ChevronDown
            size={14}
            color={selectedCondition ? colors.white : colors.neutral[500]}
          />
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            shippingOnly ? styles.filterChipActive : null,
          ]}
          onPress={() => setShippingOnly(!shippingOnly)}
        >
          <Truck
            size={14}
            color={shippingOnly ? colors.white : colors.neutral[500]}
          />
          <Text
            style={[
              styles.filterChipText,
              shippingOnly ? styles.filterChipTextActive : null,
            ]}
          >
            Versand
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            verifiedOnly ? styles.filterChipActive : null,
          ]}
          onPress={() => setVerifiedOnly(!verifiedOnly)}
        >
          <ShieldCheck
            size={14}
            color={verifiedOnly ? colors.white : colors.neutral[500]}
          />
          <Text
            style={[
              styles.filterChipText,
              verifiedOnly ? styles.filterChipTextActive : null,
            ]}
          >
            Verifiziert
          </Text>
        </Pressable>
      </ScrollView>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {listingsQuery.isLoading
            ? 'Suche...'
            : `${results.length} Ergebnis${results.length !== 1 ? 'se' : ''}`}
        </Text>

        <View style={styles.sortAndClear}>
          {activeFilterCount > 0 && (
            <Pressable onPress={clearAllFilters} hitSlop={8}>
              <Text style={styles.clearFilters}>Filter loeschen</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.sortButton}
            onPress={() => setActiveModal('sort')}
          >
            <SlidersHorizontal size={14} color={colors.neutral[600]} />
            <Text style={styles.sortLabel}>{sortLabel}</Text>
            <ChevronDown size={14} color={colors.neutral[500]} />
          </Pressable>
        </View>
      </View>

      {/* Results List */}
      {listingsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <SearchIcon size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Keine Treffer</Text>
          <Text style={styles.emptySubtitle}>
            Versuche andere Suchbegriffe oder passe deine Filter an.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          )}
        />
      )}

      {/* ─── Category Modal ────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === 'category'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveModal(null)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Kategorie waehlen</Text>

            <ScrollView style={styles.modalScroll}>
              <Pressable
                style={[
                  styles.modalOption,
                  !selectedCategory && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedCategory('');
                  setActiveModal(null);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    !selectedCategory && styles.modalOptionTextSelected,
                  ]}
                >
                  Alle Kategorien
                </Text>
              </Pressable>

              {(categoriesQuery.data ?? []).map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.modalOption,
                    selectedCategory === cat.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setActiveModal(null);
                  }}
                >
                  <Text style={styles.modalOptionIcon}>
                    {cat.icon || ''}
                  </Text>
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedCategory === cat.id &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Price Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === 'price'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveModal(null)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Preisbereich</Text>

            <View style={styles.priceInputRow}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Min (EUR)</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  selectionColor={colors.primary[500]}
                />
              </View>

              <Text style={styles.priceDash}>-</Text>

              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Max (EUR)</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Unbegrenzt"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  selectionColor={colors.primary[500]}
                />
              </View>
            </View>

            <Pressable
              style={styles.modalApplyButton}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalApplyText}>Anwenden</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Condition Modal ───────────────────────────────────────────── */}
      <Modal
        visible={activeModal === 'condition'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveModal(null)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Zustand</Text>

            <ScrollView style={styles.modalScroll}>
              {CONDITION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.modalOption,
                    selectedCondition === opt.value &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCondition(opt.value);
                    setActiveModal(null);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedCondition === opt.value &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Sort Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === 'sort'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveModal(null)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sortierung</Text>

            <ScrollView style={styles.modalScroll}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.modalOption,
                    sortBy === opt.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSortBy(opt.value);
                    setActiveModal(null);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      sortBy === opt.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[900],
    height: '100%',
    paddingVertical: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.surface,
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  sortAndClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clearFilters: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error[500],
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.neutral[700],
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  resultsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // ─── Modal Styles ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  modalScroll: {
    paddingHorizontal: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    gap: spacing.sm,
  },
  modalOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  modalOptionIcon: {
    fontSize: 18,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  modalOptionTextSelected: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
    marginBottom: 4,
  },
  priceInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.input,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.neutral[900],
    backgroundColor: colors.white,
  },
  priceDash: {
    fontSize: 18,
    color: colors.neutral[400],
    marginTop: 18,
  },
  modalApplyButton: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.primary[500],
    height: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
