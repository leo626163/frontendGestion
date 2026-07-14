import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import CustomAlert from '../../components/CustomAlert';

const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al acceder a localStorage en web:", e);
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al obtener token de SecureStore en nativo:", e);
      return null;
    }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de localStorage en web:", e);
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de SecureStore en nativo:", e);
    }
  }
};

const COLORS = {
  accent: '#0052A0',
  secondary: '#2980b9',
  primary: '#E95A0C',
  background: '#f8fafc',
  surface: '#ffffff',
  success: '#27ae60',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  logout: '#e74c3c',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  overlay: 'rgba(15, 23, 42, 0.7)',
  cardShadow: '#000000',
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
  } catch (error) {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return 'No especificada';
  try {
    if (timeString.includes(':')) {
      return timeString.substring(0, 5); // Asegura formato HH:mm
    }
    return timeString;
  } catch (error) {
    return timeString;
  }
};

const EventDetailScreen = () => {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApproveAlert, setShowApproveAlert] = useState(false);
  const [showRejectAlert, setShowRejectAlert] = useState(false);

  const getCurrentPhaseFromFases = useCallback((fases) => {
    if (!Array.isArray(fases) || fases.length === 0) {
      return { number: 1, label: 'Planeación', key: 'phase1', color: COLORS.info, icon: 'document-text-outline' };
    }
    const faseToShow = fases[0];
    const phaseConfig = {
      1: { label: 'Planeación', icon: 'document-text-outline', color: COLORS.info },
      2: { label: 'Revisión y aprobación', icon: 'clipboard-outline', color: COLORS.secondary },
      3: { label: 'Programación del evento', icon: 'calendar-outline', color: COLORS.success },
      4: { label: 'Ejecución', icon: 'play-circle-outline', color: COLORS.purple },
      5: { label: 'Cierre y evaluación', icon: 'checkmark-done-outline', color: COLORS.grayText },
    };
    const config = phaseConfig[faseToShow.nrofase] || { label: `Fase ${faseToShow.nrofase}`, icon: 'help-circle-outline', color: COLORS.grayText };
    return { number: faseToShow.nrofase, label: config.label, key: `phase${faseToShow.nrofase}`, color: config.color, icon: config.icon };
  }, []);

  const fetchEventDetails = useCallback(async () => {
    let processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
    if (typeof processedEventId === 'string' && processedEventId.startsWith('event-')) {
      processedEventId = processedEventId.replace('event-', '');
    }
    const numericId = Number(processedEventId);
    if (isNaN(numericId) || !processedEventId) {
      setError('ID de evento inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
        return;
      }

      const eventResponse = await axios.get(`${API_BASE_URL}/eventos/${numericId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const eventData = eventResponse.data;
      console.log('Respuesta completa del backend:', eventData);

      if (!eventData || typeof eventData !== 'object' || Object.keys(eventData).length === 0) {
        throw new Error('Datos de evento vacíos o inválidos del servidor.');
      }

      // Parsear resultados esperados (puede venir como string JSON o como objeto)
      let resultadosParsed = {};
      if (typeof eventData.resultados_esperados === 'string') {
        try {
          resultadosParsed = JSON.parse(eventData.resultados_esperados);
        } catch (e) {
          console.warn('Error al parsear resultados_esperados:', e);
        }
      } else if (eventData.Resultados && eventData.Resultados.length > 0) {
        resultadosParsed = eventData.Resultados[0];
      }

      const transformedEvent = {
        id: eventData.idevento || eventData.id || null,
        title: eventData.nombreevento || 'Sin título',
        date: formatDate(eventData.fechaevento),
        time: formatTime(eventData.horaevento),
        location: eventData.lugarevento || 'Ubicación no especificada',
        organizer: eventData.responsable_evento || 'Organizador no especificado',
        attendees: eventData.participantes_esperados || 'No especificado',
        status: (eventData.estado || 'pendiente').toLowerCase(),
        imageUrl: eventData.imagenUrl || null,
        idfase: eventData.idfase || 1,
        fases: eventData.fases || [],
        
        Clasificacion: eventData.Clasificacion || eventData.clasificacion || null,
        subcategoria: eventData.Subcategoria || eventData.subcategoria || null,
        
        // Mapeo flexible para Tipos de Evento
        tiposEvento: Array.isArray(eventData.tipos_de_evento) 
          ? eventData.tipos_de_evento 
          : (Array.isArray(eventData.TiposDeEvento) ? eventData.TiposDeEvento : []),
        
        // Mapeo flexible para Objetivos
        objetivos: Array.isArray(eventData.objetivos) 
          ? eventData.objetivos.map(obj => ({
              nombre_objetivo: obj.nombre_objetivo || `Objetivo ID ${obj.id}`,
              texto_personalizado: obj.texto_personalizado || 'Sin descripción',
              segmentos: obj.segmentos || []
            }))
          : (Array.isArray(eventData.Objetivos) ? eventData.Objetivos : []),
          
        objetivosPDI: Array.isArray(eventData.objetivosPDI) 
          ? eventData.objetivosPDI 
          : (typeof eventData.objetivos_pdi === 'string' ? JSON.parse(eventData.objetivos_pdi || '[]') : []),
        
        // Mapeo flexible para Segmentos (ahora vienen en segmentos_objetivo)
        segmentos: Array.isArray(eventData.segmentos_objetivo)
          ? eventData.segmentos_objetivo.map(seg => ({
              idsegmento: seg.id,
              nombre_segmento: seg.nombre_segmento || `Segmento ID ${seg.id}`,
              texto_personalizado: seg.texto_personalizado
            }))
          : (Array.isArray(eventData.segmentos) ? eventData.segmentos : []),
          
        argumentacion: eventData.argumentacion || 'Sin argumentación',
        
        // Unificación de campos de resultados
        resultados: {
          participacion_esperada: resultadosParsed.participacion || resultadosParsed.participacion_esperada,
          satisfaccion_esperada: resultadosParsed.satisfaccion || resultadosParsed.satisfaccion_esperada,
          otros_resultados: resultadosParsed.otro || resultadosParsed.otros_resultados,
          satisfaccion_real: resultadosParsed.satisfaccion_real || null
        },
        
        // Unificación de recursos (nuevos y existentes)
        recursos: [
          ...(Array.isArray(eventData.recursos_nuevos) ? eventData.recursos_nuevos : []),
          ...(Array.isArray(eventData.Recursos) ? eventData.Recursos : [])
        ],
        
        // Mapeo flexible para Comité
        comite: Array.isArray(eventData.comite) 
          ? eventData.comite.map(c => ({
              nombre: c.nombre || c.nombreCompleto || `Usuario ID ${c.id || c}`,
              apellidopat: c.apellidopat || '',
              apellidomat: c.apellidomat || '',
              role: c.role || 'academico',
              email: c.email || 'No disponible'
            }))
          : (Array.isArray(eventData.Comite) ? eventData.Comite : []),
          
        // Mapeo flexible para Presupuesto
        presupuesto: eventData.presupuesto || eventData.Presupuesto || {},
        egresos: Array.isArray(eventData.presupuesto?.egresos) 
          ? eventData.presupuesto.egresos 
          : (Array.isArray(eventData.Egresos) ? eventData.Egresos : []),
        ingresos: Array.isArray(eventData.presupuesto?.ingresos) 
          ? eventData.presupuesto.ingresos 
          : (Array.isArray(eventData.Ingresos) ? eventData.Ingresos : []),
          
        tags: eventData.tags || [],
        
        creador: eventData.creador ? {
          nombre: `${eventData.creador.nombre || ''} ${eventData.creador.apellidopat || ''} ${eventData.creador.apellidomat || ''}`.trim() || 'Creador no especificado',
          email: eventData.creador.email || 'No disponible',
          role: eventData.creador.role || 'No especificado'
        } : null,

        evento_externo: eventData.evento_externo,
        facultad_dirigida: eventData.facultad_dirigida,
      };
     
      if (!transformedEvent.id) {
        throw new Error('El evento no tiene un ID válido.');
      }

      setEvent(transformedEvent);
    } catch (err) {
      let errorMessage = `Error al cargar evento: ${err.message}`;
      if (err.response?.status === 401 || err.response?.status === 403) {
        Alert.alert('Acceso Denegado', 'No tienes permiso para ver este recurso o tu sesión ha expirado.');
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
        errorMessage = 'Sesión expirada. Redirigiendo...';
      } else if (err.response?.status === 404) {
        errorMessage = 'Evento no encontrado. Verifica si el ID es correcto.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    } else {
      setError('No se proporcionó un ID de evento.');
      setLoading(false);
    }
  }, [fetchEventDetails, eventId]);

  const handleApproveEvent = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');
      await axios.put(`${API_BASE_URL}/eventos/${event.id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Éxito', 'Evento aprobado correctamente');
      router.back();
    } catch (error) {
      console.error('Approve error:', error);
      Alert.alert('Error', 'No se pudo aprobar el evento: ' + error.message);
    }
  };

  const handleRejectEvent = async () => {
    if (!event || !event.id) {
      Alert.alert('Error', 'No hay evento cargado para rechazar.');
      return;
    }
    Alert.alert(
      'Rechazar Evento',
      '¿Estás seguro de que quieres rechazar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getTokenAsync();
              if (!token) throw new Error('Token inválido');
              await axios.put(`${API_BASE_URL}/eventos/${event.id}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
              Alert.alert('Evento Rechazado', 'El evento ha sido rechazado');
              router.back();
            } catch (error) {
              console.error('Reject error:', error);
              Alert.alert('Error', 'No se pudo rechazar el evento: ' + error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando detalles del evento...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color={COLORS.accent} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEventDetails}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event || Object.keys(event).length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="information-circle-outline" size={50} color={COLORS.grayText} />
        <Text style={styles.errorText}>No se encontraron datos del evento.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Evento</Text>
        <TouchableOpacity onPress={fetchEventDetails}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />}

        <View style={styles.card}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event && (() => {
            const phaseInfo = getCurrentPhaseFromFases([{ nrofase: event.idfase }]);
            return (
              <View style={[styles.phaseBadge, { backgroundColor: phaseInfo.color }]}>
                <Ionicons name={phaseInfo.icon} size={16} color={COLORS.white} />
                <Text style={styles.phaseBadgeText}>
                  Fase {phaseInfo.number}: {phaseInfo.label}
                </Text>
              </View>
            );
          })()}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.detailRow}>
            <Ionicons
              name={event.status === 'aprobado' ? 'checkmark-circle-outline' : 'time-outline'}
              size={20}
              color={event.status === 'aprobado' ? COLORS.success : COLORS.warning}
              style={styles.detailIcon}
            />
            <Text style={[styles.detailText, { color: event.status === 'aprobado' ? COLORS.success : COLORS.warning }]}>
              Estado: {event.status}
            </Text>
          </View>
        </View>

        {/* Datos Generales */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Datos Generales</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>Fecha: {event.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>Hora: {event.time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>Ubicación: {event.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>Organizador: {event.organizer}</Text>
          </View>
        </View>

        {/* Creador */}
        {event.creador && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Propuesto por</Text>
            <Text style={styles.creatorName}>{event.creador.nombre}</Text>
            <Text style={styles.creatorRole}>Rol: {event.creador.role}</Text>
            <Text style={styles.creatorEmail}>Email: {event.creador.email}</Text>
          </View>
        )}

        {/* Clasificación Estratégica */}
        {event.Clasificacion && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Clasificación Estratégica</Text>
            <Text style={styles.detailText}>
              • {event.Clasificacion.nombreClasificacion || event.Clasificacion.nombre || 'Sin nombre'} 
              {event.subcategoria ? ` - ${event.subcategoria.nombre || event.subcategoria.nombre_subcategoria}` : ''}
            </Text>
          </View>
        )}

        {/* Tipos de Evento */}
        {event.tiposEvento && event.tiposEvento.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tipos de Evento</Text>
            {event.tiposEvento.map((tipo, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>
                  {tipo.nombretipo || tipo.nombre || `Tipo ID ${tipo.id}`}
                  {tipo.texto_personalizado ? ` - ${tipo.texto_personalizado}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Objetivos Principales */}
        {event.objetivos && event.objetivos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Objetivos Principales</Text>
            {event.objetivos.map((obj, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="bulb-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>
                  {obj.nombre_objetivo || `Objetivo ID ${obj.id}`} — {obj.texto_personalizado || 'Sin descripción'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Objetivos PDI */}
        {event.objetivosPDI && event.objetivosPDI.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Objetivos del PDI Institucional</Text>
            {event.objetivosPDI.map((pdi, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listText, { fontWeight: 'bold', color: COLORS.primary, marginRight: 8 }]}>
                  {index + 1}.
                </Text>
                <Text style={styles.listText}>{pdi.texto_personalizado || pdi}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Segmentos Objetivo (Simplificado y directo) */}
        {event.segmentos && event.segmentos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Segmentos Objetivo</Text>
            {event.segmentos.map((seg, index) => (
              <View key={`seg-${seg.idsegmento || seg.id || index}`} style={styles.segmentItem}>
                <View style={styles.segmentHeader}>
                  <Ionicons name="person-outline" size={16} color={COLORS.primary} style={styles.segmentIcon} />
                  <Text style={styles.segmentName}>
                    {seg.nombre_segmento || `Segmento ID ${seg.idsegmento || seg.id}`}
                  </Text>
                </View>
                {seg.texto_personalizado ? (
                  <Text style={styles.segmentDescription}>{seg.texto_personalizado}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Resultados Esperados */}
        {event.resultados && (event.resultados.participacion_esperada || event.resultados.satisfaccion_esperada || event.resultados.otros_resultados) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Resultados Esperados</Text>
            {event.resultados.participacion_esperada && (
              <View style={styles.listItem}>
                <Ionicons name="people-circle-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>Participación: {event.resultados.participacion_esperada}</Text>
              </View>
            )}
            {event.resultados.satisfaccion_esperada && (
              <View style={styles.listItem}>
                <Ionicons name="happy-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>Satisfacción: {event.resultados.satisfaccion_esperada}</Text>
              </View>
            )}
            {event.resultados.otros_resultados && (
              <View style={styles.listItem}>
                <Ionicons name="document-text-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>Otros: {event.resultados.otros_resultados}</Text>
              </View>
            )}
          </View>
        )}

        {/* Recursos Solicitados */}
        {event.recursos && event.recursos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recursos Solicitados</Text>
            
            {event.recursos.filter(r => r.recurso_tipo === 'tecnologico').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Tecnológicos</Text>
                {event.recursos.filter(r => r.recurso_tipo === 'tecnologico').map((r, i) => (
                  <View key={`tec-${i}`} style={styles.listItem}>
                    <Ionicons name="hardware-chip-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                    <Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso || r.nombre || 'Recurso'}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {event.recursos.filter(r => r.recurso_tipo === 'mobiliario').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Mobiliario</Text>
                {event.recursos.filter(r => r.recurso_tipo === 'mobiliario').map((r, i) => (
                  <View key={`mob-${i}`} style={styles.listItem}>
                    <Ionicons name="home-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                    <Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso || r.nombre || 'Recurso'}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {event.recursos.filter(r => r.recurso_tipo === 'vajilla').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Vajilla</Text>
                {event.recursos.filter(r => r.recurso_tipo === 'vajilla').map((r, i) => (
                  <View key={`vaj-${i}`} style={styles.listItem}>
                    <Ionicons name="restaurant-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                    <Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso || r.nombre || 'Recurso'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Comité del Evento */}
        {event.comite && event.comite.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Comité del Evento</Text>
            {event.comite.map((miembro, index) => (
              <View key={index} style={styles.committeeMember}>
                <Text style={styles.committeeName}>
                  {[miembro.nombre, miembro.apellidopat, miembro.apellidomat].filter(Boolean).join(' ') || 'Miembro sin nombre'}
                </Text>
                <Text style={styles.committeeRole}>Rol: {miembro.role === 'academico' ? 'Académico' : miembro.role}</Text>
                <Text style={styles.committeeEmail}>Email: {miembro.email}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Presupuesto del Evento */}
        {event.presupuesto && (event.egresos.length > 0 || event.ingresos.length > 0) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Presupuesto del Evento</Text>
            
            {/* EGRESOS */}
            {event.egresos && event.egresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}>
                  <Ionicons name="arrow-down-circle" size={20} color={COLORS.logout} />
                  <Text style={styles.budgetSubtitle}>Egresos</Text>
                </View>
                <View style={styles.budgetTableHeader}>
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
                </View>
                {event.egresos.map((egreso, index) => (
                  <View key={egreso.idegreso || index} style={styles.budgetTableRow}>
                    <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{egreso.descripcion}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>{egreso.cantidad}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(egreso.precio_unitario || egreso.precio || 0).toFixed(2)}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>
                      Bs {parseFloat(egreso.total || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL EGRESOS:</Text>
                  <Text style={styles.budgetTotalValue}>Bs {(event.presupuesto.total_egresos || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}
            
            {/* INGRESOS */}
            {event.ingresos && event.ingresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}>
                  <Ionicons name="arrow-up-circle" size={20} color={COLORS.success} />
                  <Text style={styles.budgetSubtitle}>Ingresos</Text>
                </View>
                <View style={styles.budgetTableHeader}>
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
                </View>
                {event.ingresos.map((ingreso, index) => (
                  <View key={ingreso.idingreso || index} style={styles.budgetTableRow}>
                    <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{ingreso.descripcion}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>{ingreso.cantidad}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(ingreso.precio_unitario || ingreso.precio || 0).toFixed(2)}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>
                      Bs {parseFloat(ingreso.total || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL INGRESOS:</Text>
                  <Text style={[styles.budgetTotalValue, { color: COLORS.success }]}>
                    Bs {(event.presupuesto.total_ingresos || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
            
            {/* BALANCE FINAL */}
            <View style={styles.balanceFinal}>
              <Text style={styles.balanceFinalLabel}>BALANCE ECONÓMICO:</Text>
              <Text style={[styles.balanceFinalValue, { color: (event.presupuesto.balance || 0) >= 0 ? COLORS.success : COLORS.logout }]}>
                Bs {(event.presupuesto.balance || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Botones de Acción (solo si es admin y está pendiente) */}
        {event.status === 'pendiente' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.approveButton} onPress={() => setShowApproveAlert(true)}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rejectButton, { backgroundColor: COLORS.logout }]} onPress={() => setShowRejectAlert(true)}>
              <Ionicons name="close-circle" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      <CustomAlert
        visible={showApproveAlert}
        title="¿Aprobar evento?"
        message="¿Estás seguro de que quieres aprobar este evento?"
        cancelText="Cancelar"
        confirmText="Aprobar"
        onCancel={() => setShowApproveAlert(false)}
        onConfirm={async () => {
          setShowApproveAlert(false);
          try {
            const token = await getTokenAsync();
            if (!token) throw new Error('Token inválido');
            await axios.put(`${API_BASE_URL}/eventos/${event.id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert('Éxito', 'Evento aprobado correctamente');
            router.back();
          } catch (error) {
            Alert.alert('Error', `No se pudo aprobar: ${error.response?.data?.message || error.message}`);
          }
        }}
      />

      <CustomAlert
        visible={showRejectAlert}
        title="¿Rechazar evento?"
        message="¿Estás seguro de que quieres rechazar este evento?"
        cancelText="Cancelar"
        confirmText="Rechazar"
        confirmDestructive
        onCancel={() => setShowRejectAlert(false)}
        onConfirm={async () => {
          setShowRejectAlert(false);
          try {
            const token = await getTokenAsync();
            if (!token) throw new Error('Token inválido');
            await axios.put(`${API_BASE_URL}/eventos/${event.id}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert('Evento Rechazado', 'El evento ha sido rechazado');
            router.back();
          } catch (error) {
            Alert.alert('Error', `No se pudo rechazar: ${error.response?.data?.message || error.message}`);
          }
        }}
      />
    </View>
  );
};

EventDetailScreen.options = { headerShown: false };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: 40, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.primary },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  sectionCard: { width: '90%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 12, ...Platform.select({ ios: { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 3 } }) },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  phaseBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '600', marginLeft: 6 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 8 },
  listIcon: { marginRight: 8 },
  listText: { fontSize: 14, color: COLORS.darkText, flex: 1 },
  segmentItem: { backgroundColor: COLORS.grayLight, borderRadius: 8, padding: 12, marginTop: 8 },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  segmentIcon: { marginRight: 6 },
  segmentName: { fontSize: 14, fontWeight: '600', color: COLORS.darkText },
  segmentDescription: { fontSize: 13, color: COLORS.grayText, paddingLeft: 22 },
  resourceCategory: { marginTop: 12, paddingLeft: 8 },
  resourceCategoryTitle: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 8, paddingLeft: 8 },
  committeeMember: { backgroundColor: COLORS.grayLight, borderRadius: 8, padding: 12, marginTop: 8 },
  committeeName: { fontSize: 14, fontWeight: '600', color: COLORS.darkText, marginBottom: 2 },
  committeeRole: { fontSize: 13, color: COLORS.grayText, marginBottom: 2 },
  committeeEmail: { fontSize: 13, color: COLORS.grayText, fontStyle: 'italic' },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.grayText },
  errorText: { marginTop: 15, fontSize: 16, color: COLORS.accent, textAlign: 'center', marginHorizontal: 20 },
  retryButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 10, backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backButtonText: { color: COLORS.darkText, fontSize: 16 },
  creatorName: { fontSize: 16, color: COLORS.darkText, fontWeight: '500', marginBottom: 3 },
  creatorRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 3 },
  creatorEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },
  eventImage: { width: '100%', height: 250, resizeMode: 'cover', marginBottom: 20 },
  card: { width: '90%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, ...Platform.select({ ios: { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 8 } }) },
  eventTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailIcon: { marginRight: 10 },
  detailText: { fontSize: 16, color: COLORS.darkText, flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 8 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 10, width: '90%' },
  approveButton: { flexDirection: 'row', backgroundColor: COLORS.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flex: 0.48 },
  rejectButton: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flex: 0.48 },
  actionButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  budgetSubsection: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  budgetSubtitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText, marginLeft: 8 },
  budgetTableHeader: { flexDirection: 'row', backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 8 },
  budgetTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  budgetCell: { fontSize: 13, color: COLORS.darkText },
  budgetCellDesc: { flex: 3, fontWeight: '500' },
  budgetCellNum: { flex: 1, textAlign: 'right' },
  budgetCellTotal: { fontWeight: '600', color: COLORS.primary },
  budgetTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: COLORS.primary },
  budgetTotalLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.darkText },
  budgetTotalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  balanceFinal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.grayLight, padding: 15, borderRadius: 12, marginTop: 10 },
  balanceFinalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  balanceFinalValue: { fontSize: 18, fontWeight: 'bold' },
});

export default EventDetailScreen;