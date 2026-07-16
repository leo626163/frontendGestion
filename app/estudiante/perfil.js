import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', textPrimary: '#1F2937',
  textSecondary: '#6B7280', border: '#E5E7EB', surface: '#FFFFFF',
  background: '#F9FAFB', white: '#FFFFFF', accent: '#EF4444',
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

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '–'}</Text>
    </View>
  </View>
);

const PerfilEstudianteScreen = () => {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPerfil = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { router.replace('/login'); return; }

      const res = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });

      setPerfil(res.data);
    } catch (err) {
      console.error('Error al cargar perfil:', err);
      setError('No se pudo cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPerfil(); }, []);

  const nombreCompleto = `${perfil?.nombre || ''} ${perfil?.apellidopat || ''} ${perfil?.apellidomat || ''}`.trim();
  const facultadNombre = perfil?.facultad_nombre || perfil?.facultad?.nombre || perfil?.academico?.facultad;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack.Screen options={{ title: 'Mi Perfil', headerShown: true }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.accent} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchPerfil}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={COLORS.white} />
              </View>
              <Text style={styles.nombre}>{nombreCompleto || 'Estudiante'}</Text>
              <Text style={styles.correo}>{perfil?.email || perfil?.correo}</Text>
            </View>

            <View style={styles.card}>
              <InfoRow icon="school-outline" label="Facultad" value={facultadNombre} />
              <InfoRow icon="id-card-outline" label="Carnet / CI" value={perfil?.ci || perfil?.carnet} />
              <InfoRow icon="mail-outline" label="Correo" value={perfil?.email || perfil?.correo} />
              <InfoRow icon="call-outline" label="Teléfono" value={perfil?.telefono} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerBox: { alignItems: 'center', paddingVertical: 60 },
  errorText: { marginTop: 10, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontWeight: '600' },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  nombre: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  correo: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', marginTop: 1 },
});

export default PerfilEstudianteScreen;