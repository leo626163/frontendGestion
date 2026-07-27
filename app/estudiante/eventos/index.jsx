// app/estudiante/eventos/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FFEDD5',
  secondary: '#4B5563',
  accent: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  white: '#FFFFFF',
};

const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';
const TOKEN_KEY = 'studentAuthToken';

const getToken = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

const STATUS_MAP = {
  aprobado: 'Confirmado', publicado: 'Confirmado', confirmado: 'Confirmado',
  pendiente: 'Pendiente', programado: 'Próximo', en_curso: 'En curso',
  completado: 'Completado', finalizado: 'Completado', cancelado: 'Cancelado',
};

const STATUS_COLORS = {
  Confirmado: '#10B981', Próximo: '#3B82F6', 'En curso': '#F59E0B',
  Completado: '#6B7280', Cancelado: '#EF4444', Pendiente: '#F59E0B',
};

// El backend puede devolver la inscripción con el evento anidado
// (e.evento) o los campos del evento directamente en el registro.
const mapInscripcion = (item) => {
  const e = item.evento || item.Evento || item;

  const id = e.idevento || e.id || item.idevento || item.evento_id;
  const estado = (e.estado || 'aprobado').toLowerCase();
  const status = STATUS_MAP[estado] || 'Confirmado';

  const rawDate = e.fecha_inicio || e.fechaevento || e.date || null;
  let date = '–';
  if (rawDate) {
    try {
      date = new Date(rawDate).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      date = rawDate;
    }
  }

  const rawTime = e.hora_inicio || e.horaevento || e.time || null;
  const time = rawTime
    ? (rawTime.includes('+') ? rawTime.split('+')[0].slice(0, 5) : String(rawTime).slice(0, 5))
    : null;

  return {
    id,
    title: e.nombre || e.nombreevento || e.title || 'Evento sin título',
    date,
    time,
    location: e.ubicacion || e.lugarevento || e.location || null,
    status,
    statusColor: STATUS_COLORS[status] || COLORS.success,
  };
};

const InscritoCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.cardTop}>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: item.statusColor }]} />
        <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
      </View>
    </View>

    <View style={styles.cardDetails}>
      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
        <Text style={styles.detailText}>
          {item.date}{item.time ? ` · ${item.time}` : ''}
        </Text>
      </View>
      {item.location && (
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.primary} />
          <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
        </View>
      )}
    </View>

    <View style={styles.cardFooter}>
      <Text style={styles.verMas}>Ver detalle</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
    </View>
  </TouchableOpacity>
);

const MisEventosScreen = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMisInscripciones = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Sesión expirada. Inicia sesión nuevamente.');
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/eventos/mis-inscripciones`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const raw = Array.isArray(res.data) ? res.data : (res.data?.inscripciones || []);
      const mapped = raw.map(mapInscripcion).filter(ev => ev.id);
      setItems(mapped);
    } catch (err) {
      console.error('Error al cargar mis inscripciones:', err);
      if (err.response?.status === 404) {
        setError('No se encontró el endpoint de inscripciones.');
      } else {
        setError('No se pudieron cargar tus eventos. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMisInscripciones();
  }, [fetchMisInscripciones]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMisInscripciones();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Mis Eventos' }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando tus eventos…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.accent} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMisInscripciones}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerCard}>
            <Ionicons name="calendar-clear-outline" size={44} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>Aún no estás inscrito en eventos</Text>
            <Text style={styles.emptySubtitle}>
              Cuando te inscribas a un evento, aparecerá aquí.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {items.map(item => (
              <InscritoCard
                key={item.id.toString()}
                item={item}
                onPress={() => router.push(`/estudiante/eventos/${item.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  centerCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginTop: 12,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  emptySubtitle: { marginTop: 6, fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 18 },

  errorCard: {
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA', marginTop: 12,
  },
  errorText: { marginTop: 10, fontSize: 13, color: '#DC2626', textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  cardDetails: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
    marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  verMas: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});

export default MisEventosScreen;