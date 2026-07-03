import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  StatusBar, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', secondary: '#4B5563',
  accent: '#EF4444', success: '#10B981', warning: '#F59E0B',
  info: '#3B82F6', purple: '#8B5CF6',
  background: '#F9FAFB', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#6B7280', textTertiary: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6', white: '#FFFFFF',
};

//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY    = 'studentAuthToken';
const USER_DATA_KEY = 'studentUserData';

// ─── Storage helpers ───────────────────────────────────────────────────────────
const getToken = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
};

const getUserData = async () => {
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(USER_DATA_KEY)
      : await SecureStore.getItemAsync(USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveUserData = async (data) => {
  const str = JSON.stringify(data);
  try {
    if (Platform.OS === 'web') localStorage.setItem(USER_DATA_KEY, str);
    else await SecureStore.setItemAsync(USER_DATA_KEY, str);
  } catch {}
};

const clearSession = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_DATA_KEY);
    }
  } catch {}
};

// ─── Data mapper — backend → EventCard format ─────────────────────────────────
const CATEGORY_COLORS = {
  taller: '#3B82F6', conferencia: '#EF4444', seminario: '#F59E0B',
  webinar: '#8B5CF6', capacitacion: '#EC4899', charla: '#10B981',
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

const mapEvento = (e) => {
  // Backend already transforms fields: title, date, time, location, organizer, faculty, category
  const catRaw = (e.category || e.clasificacion?.label || e.categoria || 'evento').toLowerCase();
  const cat = catRaw === 'general' ? 'evento' : catRaw; // normalize "General" → color lookup
  const estado = (e.estado || 'aprobado').toLowerCase();
  const status = STATUS_MAP[estado] || 'Confirmado';

  // Clean up time — remove timezone offset like "00:11:00+00"
  const rawTime = e.time || e.horaevento || e.hora || '–';
  const cleanTime = rawTime.includes('+') ? rawTime.split('+')[0].slice(0, 5) : rawTime.slice(0, 5);

  return {
    id: e.id || e.idevento,
    title: e.title || e.nombreevento || 'Sin título',
    date: e.date || e.submittedDate || '–',
    time: cleanTime,
    location: e.location || e.lugarevento || null,
    category: (e.category || cat).charAt(0).toUpperCase() + (e.category || cat).slice(1),
    categoryColor: CATEGORY_COLORS[cat] || COLORS.info,
    status,
    statusColor: STATUS_COLORS[status] || COLORS.success,
    organizador: e.organizer || e.organizer || e.responsable_evento || null,
    facultad: e.faculty || e.facultad?.nombre || null,
    modalidad: e.modalidad || null,
    duracion: e.duracion ? `${e.duracion} min` : null,
    participantes: e.participantes || null,
    capacidad: e.capacidad || null,
  };
};

// ─── Event Card ────────────────────────────────────────────────────────────────
const EventCard = ({ event, onPress }) => (
  <TouchableOpacity style={styles.eventCard} onPress={onPress} activeOpacity={0.85}>
    {/* Header row */}
    <View style={styles.eventHeader}>
      <View style={[styles.eventBadge, { backgroundColor: event.categoryColor + '18' }]}>
        <Text style={[styles.eventBadgeText, { color: event.categoryColor }]}>{event.category}</Text>
      </View>
      <Text style={styles.eventDate}>{event.date}</Text>
    </View>

    {/* Title */}
    <Text style={styles.eventTitle}>{event.title}</Text>

    {/* Details */}
    <View style={styles.eventDetails}>
      {event.organizador && (
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}><Ionicons name="person-outline" size={13} color={COLORS.primary} /></View>
          <Text style={styles.detailText} numberOfLines={1}>{event.organizador}</Text>
        </View>
      )}
      <View style={styles.detailRow}>
        <View style={styles.detailIconWrap}><Ionicons name="time-outline" size={13} color={COLORS.primary} /></View>
        <Text style={styles.detailText}>{event.time}{event.duracion ? ` · ${event.duracion}` : ''}</Text>
      </View>
      {event.location && (
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}><Ionicons name="location-outline" size={13} color={COLORS.primary} /></View>
          <Text style={styles.detailText} numberOfLines={1}>{event.location}</Text>
        </View>
      )}
      {event.facultad && (
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}><Ionicons name="school-outline" size={13} color={COLORS.primary} /></View>
          <Text style={styles.detailText} numberOfLines={1}>{event.facultad}</Text>
        </View>
      )}
    </View>

    {/* Footer */}
    <View style={styles.eventFooter}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: event.statusColor }]} />
        <Text style={[styles.statusText, { color: event.statusColor }]}>{event.status}</Text>
      </View>
      {event.modalidad && (
        <View style={styles.modalidadBadge}>
          <Ionicons name={event.modalidad === 'virtual' ? 'videocam-outline' : 'home-outline'} size={12} color={COLORS.primary} />
          <Text style={styles.modalidadText}>{event.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

// ─── Action Card ───────────────────────────────────────────────────────────────
const ActionCard = ({ title, description, icon, color, onPress }) => (
  <TouchableOpacity style={[styles.actionCard, { borderColor: color + '20' }]} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.actionIcon, { backgroundColor: color + '12' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      {description && <Text style={styles.actionDesc}>{description}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
  </TouchableOpacity>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
const HomeEstudianteScreen = () => {
  const router = useRouter();

  const [userData, setUserData]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [events, setEvents]       = useState([]);
  const [error, setError]         = useState(null);
  const [stats, setStats]         = useState({ total: 0, proximos: 0, completados: 0 });

  // ── Session load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      if (!token) { redirectToLogin('Sesión expirada, inicia sesión nuevamente.'); return; }

      const user = await getUserData();
      if (!user) { redirectToLogin('No se encontró información de sesión.'); return; }
      if (user.role !== 'student') { redirectToLogin(`Acceso no válido. Rol: ${user.role}`); return; }

      setUserData(user);
    };
    init();
  }, []);

  const redirectToLogin = (msg) => {
    Alert.alert('Sesión no válida', msg, [{ text: 'OK', onPress: () => { clearSession(); router.replace('/login'); } }]);
  };

  // ── Fetch events ─────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (user) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Token no disponible');

      let facultadId = user.facultad_id;

      if (!facultadId) {
        try {
          const meRes = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
          });
          facultadId = meRes.data?.user?.facultad_id || meRes.data?.facultad_id;
           const facultadNombre = meRes.data?.user?.facultad_nombre || meRes.data?.facultad?.nombre;

          if (facultadId) {
             const updated = { ...user, facultad_id: facultadId, facultad_nombre: facultadNombre };
            await saveUserData(updated);
            setUserData(updated);
          }
        } catch (e) {
          console.warn('No se pudo refrescar facultad_id:', e.message);
        }
      }

      if (!facultadId) {
        setError('Tu perfil no tiene facultad asignada. Contacta al administrador.');
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/eventos/aprobados-por-facultad`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { facultad_id: facultadId },
        timeout: 10000,
      });

      const raw = Array.isArray(res.data) ? res.data : [];

      const fase2 = raw.filter(e =>
        e.idfase === 2 || e.idfase === '2' ||
        e.fase?.nrofase === 2 || e.fase?.nrofase === '2'
      );

      const mapped = fase2.map(mapEvento);

      const now = new Date();
      const proximos    = mapped.filter(e => e.status === 'Próximo' || e.status === 'Confirmado').length;
      const completados = mapped.filter(e => e.status === 'Completado').length;

      setEvents(mapped);
      setStats({ total: mapped.length, proximos, completados });

    } catch (err) {
      console.error('Error cargando eventos:', err);
      if (err.response?.status === 400) setError('Tu perfil no tiene facultad asignada. Contacta al administrador.');
      else if (err.response?.status === 404) setError('Endpoint de eventos no encontrado.');
      else setError('No se pudieron cargar los eventos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userData) fetchEvents(userData);
  }, [userData]);

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: async () => { await clearSession(); router.replace('/login'); } },
    ]);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const nombreUsuario = `${userData?.nombre || 'Estudiante'} ${userData?.apellidopat || ''}`.trim();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerGreeting}>{greeting},</Text>
              <Text style={styles.headerName}>{nombreUsuario}</Text>
            </View>
            {(userData?.facultad_nombre || userData?.facultad?.nombre) && (
              <View style={styles.facultadBadge}>
                <Ionicons name="school-outline" size={12} color={COLORS.white} />
                <Text style={styles.facultadBadgeText}>
                  {userData?.facultad_nombre || userData?.facultad?.nombre}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => fetchEvents(userData)}>
              <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Portal del Estudiante</Text>

          <View style={styles.statsRow}>
            {[
              { icon: 'calendar-outline',        value: stats.total,      label: 'Eventos' },
              { icon: 'time-outline',             value: stats.proximos,   label: 'Próximos' },
              { icon: 'checkmark-circle-outline', value: stats.completados, label: 'Completados' },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <View style={styles.statIconWrap}>
                  <Ionicons name={s.icon} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Eventos de tu Facultad</Text>
            <TouchableOpacity onPress={() => router.push('/estudiante/eventos')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {error && !loading && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={36} color={COLORS.accent} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchEvents(userData)}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando eventos…</Text>
            </View>
          ) : !error && events.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={44} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No hay eventos disponibles</Text>
              <Text style={styles.emptySubtitle}>No se encontraron eventos para tu facultad en este momento</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {events.map(ev => (
                <EventCard
                  key={ev.id?.toString()}
                  event={ev}
                  onPress={() => router.push(`/estudiante/eventos/${ev.id}`)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            <ActionCard title="Mis Eventos"  description="Ver eventos inscritos"  icon="calendar-outline"    color={COLORS.primary} onPress={() => router.push('/estudiante/eventos')} />
            <ActionCard title="Inscripción"  description="Unirse a eventos"        icon="add-circle-outline"  color={COLORS.success} onPress={() => router.push('/estudiante/inscripcion')} />
            <ActionCard title="Mi Perfil"    description="Ver y editar perfil"     icon="person-outline"      color={COLORS.info}    onPress={() => router.push('/estudiante/perfil')} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },

  // Header — orange card
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 16,
    paddingBottom: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  headerIconBtn: { padding: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerGreeting: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '400' },
  headerName: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 2 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Section
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
 facultadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', // Fondo semitransparente para que combine con el header naranja
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, marginTop: 6, alignSelf: 'flex-start',
  },
  facultadBadgeText: { fontSize: 11, color: COLORS.white, fontWeight: '600' },
  // Loading / empty / error
  loadingCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySubtitle: { marginTop: 6, fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 18 },
  errorCard: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  errorText: { marginTop: 10, fontSize: 13, color: '#DC2626', textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  // Event card
  eventCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eventBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  eventDate: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  eventTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, lineHeight: 22 },
  eventDetails: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIconWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  detailText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  modalidadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: 6,
  },
  modalidadText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  // Action cards
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  logoutText: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginLeft: 8 },
});

export default HomeEstudianteScreen;