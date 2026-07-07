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
  Platform, // 👈 Importado
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuración de API (CORREGIDA)
let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api'; // ✅ Web usa localhost
}*/
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';

const COLORS = {
  primary: '#E95A0C',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  border: '#E5E7EB',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem('adminAuthToken');
    } catch (e) {
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync('adminAuthToken');
    } catch (e) {
      return null;
    }
  }
};

const LayoutsScreen = () => {
  const router = useRouter();
  const [nombreLayout, setNombreLayout] = useState('');
  const [imagenUri, setImagenUri] = useState(null);
  const [loading, setLoading] = useState(false);
  // ❌ Eliminado: const [loadingImage, setLoadingImage] = useState(false);

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
const uriToBlob = async(uri)=>{
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subir Layout</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre del Layout</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Layout Salón Principal"
          value={nombreLayout}
          onChangeText={setNombreLayout}
        />

        <TouchableOpacity style={styles.imageButton} onPress={seleccionarImagen}>
          <Ionicons name="images-outline" size={24} color={COLORS.primary} />
          <Text style={styles.imageButtonText}>
            {imagenUri ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </Text>
        </TouchableOpacity>

        {/* ✅ Vista previa SIN eventos de carga */}
        {imagenUri ? (
          <Image
            source={{ uri: imagenUri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image" size={40} color="#ccc" />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={subirLayout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Subir Layout</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 16,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    gap: 10,
  },
  imageButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  imagePreviewLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 8,
    fontWeight: '500',
  },
  imagePreview: {
  width: '100%',
  height: 200,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ddd',
  backgroundColor: '#f0f0f0',
  justifyContent: 'center',
  alignItems: 'center',
},
imagePlaceholder: {
  width: '100%',
  height: 200,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ddd',
  backgroundColor: '#f0f0f0',
  justifyContent: 'center',
  alignItems: 'center',
},
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LayoutsScreen;