import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useAutoLogout } from '../hooks/useAutoLogout';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const C = {
  primary: '#E95A0C',
  surface: '#FFFFFF',
  t1: '#111827',
  t2: '#6B7280',
  overlay: 'rgba(0,0,0,0.5)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (fontError) {
      console.error("ERROR AL CARGAR LAS FUENTES:", fontError);
    }
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [sesionActiva, setSesionActiva] = useState(false);

  // Ajusta 'index' si tu pantalla de login/pública tiene otro nombre de ruta
  useEffect(() => {
    const rutaActual = segments.join('/');
    const rutasPublicas = ['', 'index'];
    setSesionActiva(!rutasPublicas.includes(rutaActual));
  }, [segments]);

  const { reiniciarTimer, mostrarAviso, segundosRestantes, seguirConectado } =
    useAutoLogout(router, sesionActiva);

  const contenido = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Mi Inicio', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="CategoryDetail/[categoryId]" />
      </Stack>

      {/* Modal de aviso: "tu sesión se cerrará en X segundos" */}
      <Modal visible={mostrarAviso} transparent animationType="fade">
        <View style={st.overlay}>
          <View style={st.card}>
            <Text style={st.titulo}>¿Sigues ahí?</Text>
            <Text style={st.mensaje}>
              Tu sesión se cerrará por inactividad en{' '}
              <Text style={st.segundos}>{segundosRestantes}s</Text>
            </Text>
            <TouchableOpacity style={st.boton} onPress={seguirConectado}>
              <Text style={st.botonTexto}>Seguir conectado</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemeProvider>
  );

  // En móvil no hay eventos globales del DOM, así que envolvemos todo
  // en una vista que detecta cualquier toque para reiniciar el timer.
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1 }} onTouchStart={reiniciarTimer}>
        {contenido}
      </View>
    );
  }

  // En web, el hook ya escucha mousemove/keydown/scroll/click globalmente
  return contenido;
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: C.surface, borderRadius: 16, padding: 24, alignItems: 'center' },
  titulo: { fontSize: 18, fontWeight: '800', color: C.t1, marginBottom: 8 },
  mensaje: { fontSize: 14, color: C.t2, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  segundos: { fontWeight: '800', color: C.primary },
  boton: { backgroundColor: C.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10, width: '100%', alignItems: 'center' },
  botonTexto: { color: C.surface, fontSize: 15, fontWeight: '700' },
});