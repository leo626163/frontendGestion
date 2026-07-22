import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

//const API_BASE_URL = 'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FFEDD5',
  accent: '#EF4444',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#DC2626',
  white: '#FFFFFF',
};

// ── Helpers de fecha (Zona horaria local) ────────────────────────
const getDaysRemaining = (eventDate) => {
  if (!eventDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let eventDateObj;

  if (typeof eventDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(eventDate)) {
      const datePart = eventDate.substring(0, 10);
      const [year, month, day] = datePart.split('-').map(Number);
      eventDateObj = new Date(year, month - 1, day);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(eventDate)) {
      const [day, month, year] = eventDate.split('/').map(Number);
      eventDateObj = new Date(year, month - 1, day);
    } else {
      eventDateObj = new Date(eventDate);
    }
  } else {
    eventDateObj = new Date(eventDate);
  }

  if (isNaN(eventDateObj.getTime())) return null;

  eventDateObj.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((eventDateObj - today) / (1000 * 60 * 60 * 24));
  return diffDays;
};

const isEventExpired = (eventDate) => {
  const days = getDaysRemaining(eventDate);
  return days !== null && days < 0;
};

const getDaysSinceExpired = (eventDate) => {
  const days = getDaysRemaining(eventDate);
  return days !== null && days < 0 ? Math.abs(days) : null;
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'Sin fecha';
  try {
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Sin fecha';
  }
};

// ── Tarjeta de evento vencido ────────────────────────────────────
const ExpiredEventCard = ({ event, onPress }) => {
  const eventDate = event.fechaevento || event.date || event.fecha;
  const daysSinceExpired = getDaysSinceExpired(eventDate);
  const hasDescription = event.descripcion && event.descripcion.trim().length > 0;
  const hasFacultad = event.facultad && event.facultad !== 'Sin facultad';

  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => onPress(event)}
      activeOpacity={0.85}
    >
      <View style={styles.expiredIndicator} />

      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={13} color={COLORS.danger} />
            <Text style={styles.statusText}>Vencido</Text>
          </View>
          {daysSinceExpired !== null && (
            <Text style={styles.daysExpired}>
              Hace {daysSinceExpired} día{daysSinceExpired !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <Text style={styles.eventDate}>{formatDate(eventDate)}</Text>
      </View>

      <Text style={styles.eventTitle} numberOfLines={2}>
        {event.nombreevento || 'Sin título'}
      </Text>

      {hasDescription && (
        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.descripcion}
        </Text>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.lugarevento || 'Sin ubicación'}
          </Text>
        </View>
        {hasFacultad && (
          <View style={styles.metaItem}>
            <Ionicons name="school-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.facultad}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.academicoInfo}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={14} color={COLORS.white} />
          </View>
          <Text style={styles.academicoName} numberOfLines={1}>
            {event.academico?.nombre || 'Académico'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const EventosVencidos = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultad, setSelectedFacultad] = useState(null);

  const fetchExpiredEvents = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente.');
        router.replace('/');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/eventos/vencidos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const data = response.data;
      let rawExpiredEvents = [];

      if (data && Array.isArray(data.vencidos)) {
        rawExpiredEvents = data.vencidos;
      } else if (Array.isArray(data)) {
        rawExpiredEvents = data.filter(event => {
          const fecha = event.fechaevento || event.date;
          return isEventExpired(fecha);
        });
      }

      const expiredEvents = rawExpiredEvents.map(event => ({
        idevento: event.idevento || event.id,
        nombreevento: event.nombreevento || event.title || 'Sin título',
        descripcion: event.descripcion || event.description || '',
        fechaevento: event.fechaevento || event.date,
        horaevento: event.horaevento || event.time,
        lugarevento: event.lugarevento || event.location,
        estado: event.estado,
        idfase: event.idfase,
        idacademico: event.idacademico,
        academico: event.academicoCreador ? {
          nombre: `${event.academicoCreador.nombre || ''} ${event.academicoCreador.apellidopat || ''}`.trim() || 'Académico'
        } : (event.academico || null),
        facultad: event.facultad || event.faculty || null,
      }));

      setEvents(expiredEvents);
    } catch (error) {
      console.error('❌ Error fetching expired events:', error);

      let message = 'No se pudieron cargar los eventos vencidos.';

      if (error.response?.status === 401) {
        message = 'Sesión expirada. Inicia sesión nuevamente.';
        router.replace('/');
      } else if (error.response?.status === 403) {
        message = 'No tienes permisos para ver esta sección.';
      } else if (error.response?.status === 404) {
        message = 'Endpoint no encontrado.';
      } else if (error.code === 'ECONNABORTED') {
        message = 'Tiempo de espera agotado.';
      }

      Alert.alert('Error', message, [
        { text: 'Reintentar', onPress: fetchExpiredEvents },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchExpiredEvents();
  }, [fetchExpiredEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpiredEvents();
  }, [fetchExpiredEvents]);

  const facultades = useMemo(() => {
    return [...new Set(events.map(e => e.facultad).filter(Boolean))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = events;

    if (selectedFacultad) {
      result = result.filter(event => event.facultad === selectedFacultad);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(event =>
        event.nombreevento?.toLowerCase().includes(query) ||
        event.descripcion?.toLowerCase().includes(query) ||
        event.lugarevento?.toLowerCase().includes(query) ||
        event.facultad?.toLowerCase().includes(query) ||
        event.academico?.nombre?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [events, searchQuery, selectedFacultad]);

  const handleEventPress = (event) => {
    router.push({
      pathname: '/admin/EventDetailScreenVencido',
      params: {
        id: event.idevento || event.id,
        from: 'vencidos',
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando eventos vencidos...</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Eventos Vencidos</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="close-circle-outline" size={80} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Sin eventos vencidos</Text>
          <Text style={styles.emptyText}>
            No hay eventos pendientes con fecha de ejecución vencida
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
            <Text style={styles.emptyButtonText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Eventos Vencidos</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Stats siempre visibles arriba, fuera del scroll de la lista */}
      <View style={styles.statsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
        >
          <View style={[styles.statCard, { backgroundColor: COLORS.danger }]}>
            <Ionicons name="close-circle-outline" size={18} color={COLORS.white} />
            <Text style={styles.statNumber}>{events.length}</Text>
            <Text style={styles.statLabel}>Vencidos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
            <Ionicons name="school-outline" size={18} color={COLORS.white} />
            <Text style={styles.statNumber}>{facultades.length}</Text>
            <Text style={styles.statLabel}>Facultades</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="person-outline" size={18} color={COLORS.white} />
            <Text style={styles.statNumber}>
              {[...new Set(events.map(e => e.idacademico).filter(Boolean))].length}
            </Text>
            <Text style={styles.statLabel}>Académicos</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, facultad, académico..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {facultades.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            <TouchableOpacity
              style={[styles.chip, !selectedFacultad && styles.chipActive]}
              onPress={() => setSelectedFacultad(null)}
            >
              <Text style={[styles.chipText, !selectedFacultad && styles.chipTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            {facultades.map((facultad) => (
              <TouchableOpacity
                key={facultad}
                style={[styles.chip, selectedFacultad === facultad && styles.chipActive]}
                onPress={() => setSelectedFacultad(facultad === selectedFacultad ? null : facultad)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedFacultad === facultad && styles.chipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {facultad}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.resultsCount}>
          {filteredEvents.length} de {events.length} eventos
        </Text>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => `event-${item.idevento || item.id}`}
        renderItem={({ item }) => <ExpiredEventCard event={item} onPress={handleEventPress} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Ionicons name="search-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptySearchTitle}>Sin resultados</Text>
            <Text style={styles.emptySearchText}>
              {selectedFacultad
                ? `No hay eventos vencidos en "${selectedFacultad}"`
                : `No se encontraron eventos que coincidan con "${searchQuery}"`}
            </Text>
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => { setSearchQuery(''); setSelectedFacultad(null); }}
            >
              <Text style={styles.clearSearchText}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  refreshButton: { padding: 4 },

  statsWrapper: {
    backgroundColor: COLORS.primary,
    paddingBottom: 14,
  },
  statsScroll: { paddingHorizontal: 16, gap: 10 },
  statCard: {
    width: 104,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 10, color: COLORS.white, opacity: 0.9, textAlign: 'center', includeFontPadding: false },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, padding: 0 },
  resultsCount: { fontSize: 12, color: COLORS.textTertiary, marginTop: 8, textAlign: 'right' },

  chipsScroll: {
    gap: 8,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },

  listContent: { padding: 16, gap: 12 },

  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    paddingLeft: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  expiredIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    backgroundColor: COLORS.danger + '15',
  },
  statusText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  daysExpired: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '500' },
  eventDate: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },

  eventTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6, lineHeight: 22 },
  eventDescription: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 18 },

  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 120 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  academicoInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  academicoName: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },

  emptySearch: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptySearchTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySearchText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  clearSearchButton: { marginTop: 8 },
  clearSearchText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});

EventosVencidos.options = { headerShown: false };

export default EventosVencidos;