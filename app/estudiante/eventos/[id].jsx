// app/estudiante/eventos/[id].jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  background: '#f8fafc',
  surface: '#ffffff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  border: '#E5E7EB',
};

// Configuración de API
let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'studentAuthToken';

const getTokenAsync = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

const deleteTokenAsync = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (e) {}
};

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const EventDetailStudentScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);

  useEffect(() => {
    const loadEventData = async () => {
      if (!id) {
        setError('ID de evento no válido');
        setLoading(false);
        return;
      }

      try {
        const token = await getTokenAsync();
        if (!token) throw new Error('Token no disponible');

        // Obtener detalles del evento
        const eventRes = await axios.get(`${API_BASE_URL}/eventos/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Procesar datos del evento (evitar objetos anidados)
        const eventData = eventRes.data;
        const processedEvent = {
          id: eventData.idevento || eventData.id,
          title: eventData.nombre || eventData.nombreevento || 'Evento sin título',
          description: eventData.descripcion || 'Sin descripción',
          date: formatDate(eventData.fecha_inicio || eventData.fechaevento),
          time: eventData.hora_inicio || eventData.horaevento || 'Hora no especificada',
          location: eventData.ubicacion || eventData.lugarevento || 'Ubicación no especificada',
          organizer: eventData.organizador || eventData.responsable || 'Organizador no especificado',
          capacity: eventData.capacidad_maxima || eventData.capacidad || null,
          attendees: eventData.inscritos || eventData.participantes || 0,
          category: eventData.tipo_evento || eventData.categoria || 'Evento',
          status: eventData.estado || 'pendiente',
          modalidad: eventData.modalidad || 'presencial',
          // ✅ Evitar renderizar objetos directamente
          objetivos: Array.isArray(eventData.objetivos) 
            ? eventData.objetivos 
            : (typeof eventData.objetivos === 'string' ? [eventData.objetivos] : []),
          resultados: Array.isArray(eventData.resultados) 
            ? eventData.resultados 
            : (typeof eventData.resultados === 'string' ? [eventData.resultados] : []),
        };

        setEvent(processedEvent);

        // Verificar inscripción
        try {
          const enrollmentRes = await axios.get(
            `${API_BASE_URL}/inscripciones/evento/${id}/estudiante`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setIsEnrolled(enrollmentRes.data.isEnrolled || false);
        } catch (err) {
          console.warn('No se pudo verificar inscripción:', err.message);
        }

      } catch (err) {
        console.error('Error:', err);
        setError(err.response?.data?.message || 'Error al cargar el evento');
        if (err.response?.status === 401) {
          await deleteTokenAsync();
          router.replace('/login');
        }
      } finally {
        setLoading(false);
        setCheckingEnrollment(false);
      }
    };

    loadEventData();
  }, [id, router]);

  const handleEnroll = async () => {
    Alert.alert(
      'Inscribirse al Evento',
      `¿Deseas inscribirte a "${event.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const token = await getTokenAsync();
              if (!token) throw new Error('Token no disponible');

              if (event.capacity && event.attendees >= event.capacity) {
                Alert.alert('Evento lleno', 'Capacidad máxima alcanzada');
                return;
              }

              await axios.post(
                `${API_BASE_URL}/inscripciones`,
                { idevento: event.id, fecha_inscripcion: new Date().toISOString() },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
              );

              Alert.alert('¡Éxito!', 'Te has inscrito correctamente', [
                { 
                  text: 'OK', 
                  onPress: () => {
                    setIsEnrolled(true);
                    setEvent(prev => prev ? { ...prev, attendees: prev.attendees + 1 } : null);
                  }
                }
              ]);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo inscribir');
            }
          }
        }
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancelar inscripción',
      '¿Seguro que deseas cancelar tu inscripción?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getTokenAsync();
              if (!token) throw new Error('Token no disponible');

              await axios.delete(
                `${API_BASE_URL}/inscripciones/evento/${event.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              Alert.alert('Cancelado', 'Inscripción eliminada', [
                {
                  text: 'OK',
                  onPress: () => {
                    setIsEnrolled(false);
                    setEvent(prev => prev ? { ...prev, attendees: Math.max(0, prev.attendees - 1) } : null);
                  }
                }
              ]);
            } catch (err) {
              Alert.alert('Error', 'No se pudo cancelar la inscripción');
            }
          }
        }
      ]
    );
  };

  const openMap = () => {
    if (event?.location && event.location !== 'Ubicación no especificada') {
      const url = Platform.OS === 'ios'
        ? `maps://?q=${encodeURIComponent(event.location)}`
        : `geo:0,0?q=${encodeURIComponent(event.location)}`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir mapas'));
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando evento...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color={COLORS.accent} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Evento no encontrado</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {/* Categoría */}
        <View style={[styles.badge, { backgroundColor: getCategoryColor(event.category) + '15' }]}>
          <Text style={[styles.badgeText, { color: getCategoryColor(event.category) }]}>
            {event.category}
          </Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Descripción */}
        <Text style={styles.description}>{event.description}</Text>

        {/* Detalles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Evento</Text>
          
          <DetailItem icon="calendar-outline" label="Fecha" value={event.date} />
          <DetailItem icon="time-outline" label="Hora" value={event.time} />
          <DetailItem 
            icon={event.modalidad === 'virtual' ? 'videocam-outline' : 'location-outline'} 
            label={event.modalidad === 'virtual' ? 'Modalidad' : 'Ubicación'} 
            value={event.modalidad === 'virtual' ? 'Virtual' : event.location}
            onPress={event.modalidad !== 'virtual' ? openMap : undefined}
          />
          <DetailItem icon="person-outline" label="Organizador" value={event.organizer} />
          
          {event.capacity && (
            <DetailItem 
              icon="people-outline" 
              label="Asistentes" 
              value={`${event.attendees} / ${event.capacity}`}
            />
          )}
        </View>

        {/* Objetivos */}
        {event.objetivos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objetivos</Text>
            {event.objetivos.map((obj, i) => (
              <Text key={i} style={styles.listItem}>
                • {typeof obj === 'string' ? obj : (obj.texto || obj.texto_personalizado || 'Objetivo sin descripción')}
              </Text>
            ))}
          </View>
        )}

        {/* Resultados */}
        {event.resultados.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados Esperados</Text>
            {event.resultados.map((res, i) => (
              <Text key={i} style={styles.listItem}>
                • {typeof res === 'string' ? res : (res.descripcion || res.texto || 'Resultado sin descripción')}
              </Text>
            ))}
          </View>
        )}

        {/* Estado */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + '15' }]}>
          <Ionicons name={getStatusIcon(event.status)} size={16} color={getStatusColor(event.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
            {getStatusText(event.status)}
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.actions}>
          {checkingEnrollment ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : isEnrolled ? (
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Ionicons name="close-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Cancelar Inscripción</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.enrollButton]} 
              onPress={handleEnroll}
              disabled={event.capacity && event.attendees >= event.capacity}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>
                {event.capacity && event.attendees >= event.capacity 
                  ? 'Evento Lleno' 
                  : 'Inscribirme al Evento'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.button, styles.backButton]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={[styles.buttonText, { color: COLORS.primary }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const DetailItem = ({ icon, label, value, onPress }) => (
  <TouchableOpacity 
    style={styles.detailRow} 
    onPress={onPress} 
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
    {onPress && <Ionicons name="chevron-forward" size={20} color={COLORS.grayText} />}
  </TouchableOpacity>
);

const getCategoryColor = (cat) => {
  const colors = { taller: '#3B82F6', conferencia: '#EF4444', seminario: '#F59E0B' };
  return colors[cat?.toLowerCase()] || '#6B7280';
};

const getStatusText = (status) => {
  const map = { aprobado: 'Confirmado', publicado: 'Confirmado', programado: 'Próximo' };
  return map[status?.toLowerCase()] || 'Pendiente';
};

const getStatusColor = (status) => {
  const s = status?.toLowerCase();
  if (['aprobado', 'publicado', 'confirmado'].includes(s)) return COLORS.success;
  if (['programado'].includes(s)) return COLORS.info;
  return COLORS.secondary;
};

const getStatusIcon = (status) => {
  const s = status?.toLowerCase();
  if (['aprobado', 'publicado', 'confirmado'].includes(s)) return 'checkmark-circle-outline';
  if (['programado'].includes(s)) return 'time-outline';
  return 'help-circle-outline';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.grayText },
  errorText: { marginTop: 15, fontSize: 16, color: COLORS.accent, textAlign: 'center' },
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  badge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    marginBottom: 15,
  },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 15 },
  description: { fontSize: 15, color: COLORS.grayText, lineHeight: 22, marginBottom: 25 },
  section: { marginBottom: 25 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.darkText, 
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.primaryLight, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: COLORS.grayText, marginBottom: 2 },
  detailValue: { fontSize: 15, color: COLORS.darkText, fontWeight: '500' },
  listItem: { 
    fontSize: 14, 
    color: COLORS.grayText, 
    marginBottom: 8, 
    lineHeight: 20,
    paddingLeft: 5,
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 25,
  },
  statusText: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  actions: { gap: 12, marginTop: 10 },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    borderRadius: 12,
    gap: 10,
  },
  enrollButton: { backgroundColor: COLORS.success },
  cancelButton: { backgroundColor: COLORS.accent },
  backButton: { 
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});

export default EventDetailStudentScreen;