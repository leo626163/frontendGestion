// app/admin/layouts.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';

// Misma paleta que InventarioDAF.js para mantener consistencia visual
const C = {
  primary: '#E95A0C', primaryLight: '#FFF0E6',
  success: '#10B981', successLight: '#D1FAE5',
  danger: '#EF4444',  dangerLight: '#FEE2E2',
  info: '#3B82F6',    infoLight: '#DBEAFE',
  bg: '#F3F4F6', surface: '#FFFFFF',
  t1: '#111827', t2: '#6B7280', t3: '#9CA3AF', border: '#E5E7EB',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem('adminAuthToken'); } catch (e) { return null; }
  }
  try { return await SecureStore.getItemAsync('adminAuthToken'); } catch (e) { return null; }
};

const uriToBlob = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

const LayoutsScreen = () => {
  const router = useRouter();
  const [nombreLayout, setNombreLayout] = useState('');
  const [imagenUri, setImagenUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitas permitir el acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImagenUri(result.assets[0].uri);
    }
  };

  const subirLayout = async () => {
    if (!nombreLayout.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el layout.');
      return;
    }
    if (!imagenUri) {
      Alert.alert('Error', 'Por favor selecciona una imagen.');
      return;
    }

    setLoading(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Error', 'No estás autenticado.');
        return;
      }

      const formData = new FormData();
      formData.append('nombre', nombreLayout);
      if (Platform.OS === 'web') {
        const blob = await uriToBlob(imagenUri);
        formData.append('imagen', blob, `layout_${Date.now()}.jpg`);
      } else {
        formData.append('imagen', {
          uri: imagenUri,
          type: 'image/jpeg',
          name: `layout_${Date.now()}.jpg`,
        });
      }

      await axios.post(`${API_BASE_URL}/layouts`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Éxito', 'Layout subido correctamente.');
      router.back();

    } catch (error) {
      console.error('Error al subir layout:', error);
      Alert.alert('Error', 'No se pudo subir el layout. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  const puedeSubir = nombreLayout.trim().length > 0 && !!imagenUri && !loading;

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header — mismo patrón que InventarioDAF */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.t1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hTitle}>Subir layout</Text>
          <Text style={st.hSub}>Sube un plano o imagen del salón</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Banner informativo, mismo estilo que en Inventario */}
        <View style={st.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={C.info} />
          <Text style={st.infoBannerText}>
            El layout se usará como referencia visual para ubicar mesas y recursos en el evento.
          </Text>
        </View>

        {/* Nombre */}
        <Text style={st.label}>Nombre del layout</Text>
        <View style={st.inputWrap}>
          <Ionicons name="pricetag-outline" size={17} color={C.t3} />
          <TextInput
            style={st.input}
            placeholder="Ej: Layout Salón Principal"
            placeholderTextColor={C.t3}
            value={nombreLayout}
            onChangeText={setNombreLayout}
          />
        </View>

        {/* Zona de imagen */}
        <Text style={st.label}>Imagen del layout</Text>

        {imagenUri ? (
          <View style={st.previewCard}>
            <Image source={{ uri: imagenUri }} style={st.previewImage} resizeMode="contain" />
            <View style={st.previewFooter}>
              <View style={st.previewBadge}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={st.previewBadgeText}>Imagen seleccionada</Text>
              </View>
              <TouchableOpacity style={st.changeBtn} onPress={seleccionarImagen}>
                <Ionicons name="swap-horizontal-outline" size={15} color={C.primary} />
                <Text style={st.changeBtnText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={st.dropZone} onPress={seleccionarImagen} activeOpacity={0.7}>
            <View style={st.dropIconWrap}>
              <Ionicons name="image-outline" size={26} color={C.primary} />
            </View>
            <Text style={st.dropTitle}>Toca para seleccionar una imagen</Text>
            <Text style={st.dropSub}>PNG o JPG · recomendado 4:3</Text>
          </TouchableOpacity>
        )}

        {/* Botón subir */}
        <TouchableOpacity
          style={[st.submitBtn, !puedeSubir && st.submitBtnDisabled]}
          onPress={subirLayout}
          disabled={!puedeSubir}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.surface} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color={C.surface} />
              <Text style={st.submitBtnText}>Subir layout</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: (StatusBar.currentHeight || 40) + 12,
    paddingBottom: 14, borderBottomWidth: 0.5, borderColor: C.border, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: C.border,
  },
  hTitle: { fontSize: 18, fontWeight: '800', color: C.t1 },
  hSub:   { fontSize: 12, color: C.t2, marginTop: 1 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.infoLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 0.5, borderColor: C.info + '40', marginBottom: 20,
  },
  infoBannerText: { fontSize: 13, color: C.info, flex: 1, lineHeight: 18 },

  label: { fontSize: 13, fontWeight: '700', color: C.t1, marginBottom: 8 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 20,
  },
  input: { flex: 1, fontSize: 14, color: C.t1, padding: 0 },

  dropZone: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: C.border, paddingVertical: 36, alignItems: 'center', gap: 6, marginBottom: 24,
  },
  dropIconWrap: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  dropTitle: { fontSize: 14, fontWeight: '600', color: C.t1 },
  dropSub: { fontSize: 12, color: C.t3 },

  previewCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.border,
    overflow: 'hidden', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  previewImage: { width: '100%', height: 220, backgroundColor: C.bg },
  previewFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 0.5, borderColor: C.border,
  },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewBadgeText: { fontSize: 12, fontWeight: '600', color: C.success },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: C.primary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 15, borderRadius: 12,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: C.surface, fontSize: 15, fontWeight: '700' },
});

export default LayoutsScreen;