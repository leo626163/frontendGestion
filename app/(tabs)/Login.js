import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform, 
  ImageBackground
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; 
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
  } else if (Platform.OS === 'ios') {
    determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
    } else { 
      determinedApiBaseUrl = 'http://localhost:3001/api';
  }
  */
 //const API_BASE_URL =  'https://unifrontend.onrender.com';
 
 
 const API_BASE_URL = 'https://backendgestion-production.up.railway.app';
 let determinedApiBaseUrl= API_BASE_URL;


const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [contrasenia, setPassword] = useState(''); // 'contrasenia' es la variable de estado
  const [loading, setLoading] = useState(false);

 const handleLogin = async () => {
  if (!email.trim() || !contrasenia.trim()) {
    Alert.alert('Error', 'Por favor, ingresa tu correo y contraseña.');
    return;
  }

  setLoading(true);
  const trimmedEmail = email.trim();
  const trimmedPassword = contrasenia.trim(); 
  const apiUrl = `${API_BASE_URL}/auth/login`;

  console.log("🔐 Intentando login con:", { email: trimmedEmail });

  try {
    const response = await axios.post(apiUrl, {
      email: trimmedEmail,
      password: trimmedPassword,
    }, { timeout: 120000 });

    console.log("✅ Respuesta del servidor:", response.data);

    if (response.status === 200 && response.data.token && response.data.user) {
      const { token, user } = response.data;
      
      // 🔥 DEFINIR CLAVES SEGÚN EL ROL DEL USUARIO
      let TOKEN_KEY, USER_DATA_KEY;
      
      switch (user.role) {
        case 'admin':
        case 'academico':
        case 'daf':
          TOKEN_KEY = 'adminAuthToken';
          USER_DATA_KEY = 'adminUserData';
          break;
        case 'student':
          TOKEN_KEY = 'studentAuthToken';    // ← ¡Esta es la clave que busca HomeEstudiante!
          USER_DATA_KEY = 'studentUserData';  // ← ¡Esta es la clave que busca HomeEstudiante!
          break;
        case 'comunicacion':
          TOKEN_KEY = 'comunicacionAuthToken';
          USER_DATA_KEY = 'comunicacionUserData';
          break;
        case 'TI':
          TOKEN_KEY = 'tiAuthToken';
          USER_DATA_KEY = 'tiUserData';
          break;
        case 'recursos':
          TOKEN_KEY = 'recursosAuthToken';
          USER_DATA_KEY = 'recursosUserData';
          break;
        case 'Admisiones':
          TOKEN_KEY = 'admisionesAuthToken';
          USER_DATA_KEY = 'admisionesUserData';
          break;
        case 'Serv. Estudiatil':
          TOKEN_KEY = 'serviciosEstudiantilesAuthToken';
          USER_DATA_KEY = 'serviciosEstudiantilesUserData';
          break;
        default:
          console.warn("⚠️ Rol no reconocido:", user.role);
          TOKEN_KEY = 'authToken';
          USER_DATA_KEY = 'userData';
      }

      const allKeys = [
        'adminAuthToken', 'adminUserData',
        'studentAuthToken', 'studentUserData', 
        'academicoAuthToken', 'academicoUserData',
        'dafAuthToken', 'dafUserData',
        'comunicacionAuthToken', 'comunicacionUserData',
        'tiAuthToken', 'tiUserData',
        'recursosAuthToken', 'recursosUserData',
        'admisionesAuthToken', 'admisionesUserData',
        'serviciosEstudiantilesAuthToken', 'serviciosEstudiantilesUserData'
      ];
      await AsyncStorage.setItem('usuario', JSON.stringify({
          id:     user.id,
          nombre: user.nombre,
          role:   user.role   
        }));
        if (Platform.OS === 'web') {
  localStorage.setItem('usuario', JSON.stringify({
    id:     user.id,
    nombre: user.nombre || user.username,
    role:   user.role
  }));
}
      console.log('🧹 Limpiando claves anteriores...');
      if (Platform.OS === 'web') {
        allKeys.forEach(key => localStorage.removeItem(key));
      } else {
        for (const key of allKeys) {
          await SecureStore.deleteItemAsync(key);
        }
      }

      console.log(`💾 Guardando datos con claves: ${TOKEN_KEY} / ${USER_DATA_KEY}`);
      if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
      }

      // 🔥 VERIFICAR QUE SE GUARDÓ CORRECTAMENTE
      const verifySave = async () => {
        const savedToken = Platform.OS === 'web' 
          ? localStorage.getItem(TOKEN_KEY)
          : await SecureStore.getItemAsync(TOKEN_KEY);
        const savedUser = Platform.OS === 'web'
          ? localStorage.getItem(USER_DATA_KEY)
          : await SecureStore.getItemAsync(USER_DATA_KEY);
        
        console.log('✅ Verificación de guardado:', {
          role: user.role,
          tokenSaved: !!savedToken,
          userSaved: !!savedUser,
          userId: savedUser ? JSON.parse(savedUser).id : null,
          facultad_id: savedUser ? JSON.parse(savedUser).facultad_id : null
        });
      };
      await verifySave();
      
      console.log('✨ Login exitoso. Usuario:', {
        id: user.id,
        username: user.username,
        role: user.role,
        facultad_id: user.facultad_id
      });
      
      let targetRoute = '/';
      let routeParams = {};
      
      switch (user.role) {
        case 'admin':
          targetRoute = '/admin/HomeAdministradorScreen';
          routeParams = { nombre: user.nombre };
          break;
        case 'student':
          targetRoute = '/admin/HomeEstudiante';  // ← Ajusta a tu ruta real de Expo Router
          routeParams = {};
          break;
        case 'academico':
          targetRoute = '/admin/HomeAcademico';   // ← Ajusta a tu ruta real
          routeParams = {nombre: user.nombre};
          break;
        case 'daf':
          targetRoute = '/admin/Daf'; 
          break;
        case 'comunicacion':
          targetRoute = '/admin/HomeComunicacion'; 
          break;
        case 'TI':
          targetRoute = '/admin/HomeTI'; 
          break;
        case 'recursos':
          targetRoute = '/admin/HomeRecursosHumanos';
          routeParams = { nombre: user.nombre, idUsuario: user.id };
          break;
        case 'Admisiones':
          targetRoute = '/admin/HomeAdmisiones';
          routeParams = { nombre: user.nombre, idUsuario: user.id };
          break;
        case 'Serv. Estudiatil': 
          targetRoute = '/admin/HomeServiciosEstudiantiles'; 
          routeParams = { nombre: user.nombre, idUsuario: user.id };
          break;
        default:
          console.warn("⚠️ Rol no reconocido:", user.role);
          Alert.alert('Acceso', 'Tu rol no tiene una interfaz asignada.');
          targetRoute = '/';
          break;
      } 
      console.log('🔄 Redirigiendo a:', targetRoute, 'con params:', routeParams);

      setTimeout(() => {
        try {
          console.log('🚀 Ejecutando redirección...');
          router.replace({ pathname: targetRoute, params: routeParams });
        } catch (error) {
          console.error('❌ Error en redirección:', error);
          Alert.alert('Error', 'No se pudo redirigir. Intenta nuevamente.');
        }
      }, 200);
      
    } else {
      Alert.alert('Login Fallido', response.data.message || 'Respuesta inesperada del servidor.');
    }
  } catch (err) {
    console.error("❌ Error en handleLogin:", err.response?.data || err.message);
    
    if (err.response) {
      Alert.alert('Login Fallido', `${err.response.data.message || err.response.data.error || 'Credenciales inválidas.'} (Status: ${err.response.status})`);
    } else if (err.request) {
      Alert.alert('Error de Red', 'No se pudo conectar al servidor. Verifica tu conexión.');
    } else {
      Alert.alert('Error', 'Ocurrió un error inesperado: ' + err.message);
    }
  } finally {
    setLoading(false);
  }
};
    const handleRegisterStudent = () => {
    router.push('../admin/RegistroEstudianteScreen');
  };

    return (
  <ImageBackground
    source={require('../../assets/images/FONDO NARANJA_Mesa de trabajo 1.jpeg')} 
    style={styles.background}
    resizeMode="cover"
  >
    <View style={styles.overlay} />

    <View style={styles.content}>
      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#aaa"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={contrasenia}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="0"
        placeholderTextColor="#aaa"
      />

      <TouchableOpacity
        onPress={handleLogin}
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
       onPress={handleRegisterStudent}
        style={styles.registerLinkContainer}
      >
         <Text style={styles.registerLinkText}>
            ¿No tienes cuenta? <Text style={styles.registerLinkHighlight}>Crear cuenta de estudiante</Text>
          </Text>
      </TouchableOpacity>
    </View>
  </ImageBackground>
);
    
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    paddingHorizontal: 25,
    paddingVertical: 35,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },

  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  
  buttonDisabled: {
    backgroundColor: '#FFA07A', // Un naranja más claro para deshabilitado
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
   background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    padding: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 25,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  button: {
    backgroundColor: '#e95a0c',
    width: '100%',
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#b6470a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
    registerLinkContainer: {
    marginTop: 25,
    paddingVertical: 10,
  },
  registerLinkText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  registerLinkHighlight: {
    color: '#FFD700', // Dorado para destacar
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;