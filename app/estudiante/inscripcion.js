import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  StatusBar, Platform, TouchableOpacity,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', textPrimary: '#1F2937',
  textSecondary: '#6B7280', border: '#E5E7EB', surface: '#FFFFFF',
  background: '#F9FAFB', white: '#FFFFFF', accent: '#EF4444', success: '#10B981',
};

const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';
const TOKEN_KEY = 'studentAuthToken';

const getToken = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
};

const InscripcionCard = ({ evento }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
      <Text style={styles.cardTitle} numberOfLines={2}>{evento.nombreevento}</Text>
    </View>
    <View style={styles.cardRow}>
      <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
      <Text style={styles.cardText}>
        {evento.fechaevento ? new Date(evento.fechaevento).toLocaleDateString() : '–'}
      </Text>
    </View>
    {evento.lugarevento && (
      <View style={styles.cardRow}>
        <Ionicons name="location-outline" size={14} color={COLORS.primary} />
        <Text style={styles.cardText}>{evento.lugarevento}</Text>
      </View>
    )}
  </View>
);

const InscripcionScreen = () => {
  const router = useRouter();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMisInscripciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { router.replace('/login'); return; }

      const res = await axios.get(`${API_BASE_URL}/eventos/mis-inscripciones`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      setEventos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al cargar inscripciones:', err);
      setError('No se pudieron cargar tus inscripciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchMisInscripciones(); }, [fetchMisInscripciones]));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack.Screen options={{ title: 'Mis Inscripciones', headerShown: true }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.accent} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMisInscripciones}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : eventos.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="calendar-clear-outline" size={44} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Aún no estás inscrito en ningún evento</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {eventos.map(ev => (
              <InscripcionCard key={ev.idevento} evento={ev} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerBox: { alignItems: 'center', paddingVertical: 60 },
  errorText: { marginTop: 10, color: COLORS.textSecondary, textAlign: 'center' },
  emptyText: { marginTop: 12, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardText: { fontSize: 13, color: COLORS.textSecondary },
});

export default InscripcionScreen;