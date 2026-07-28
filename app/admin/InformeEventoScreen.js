import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = 'https://backendgestion-production-e2aa.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
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
  logout: '#e74c3c',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  border: '#e2e8f0',
};

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const emptyEgresoRow = () => ({ descripcion: '', cantidad: '', precio_unitario: '', total: 0 });

const InformeEventoScreen = () => {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [readOnly, setReadOnly] = useState(false); // true si el usuario no es el responsable

  const [esperado, setEsperado] = useState(null);

  // --- Estado editable (lo que llena el responsable) ---
  const [segAlcanzado, setSegAlcanzado] = useState({
    estudiantes: '', docentes: '', publico_externo: '', influencers: '', otro_cual: '', otro_cantidad: '',
  });
  const [objAlcanzado, setObjAlcanzado] = useState({
    modelo_pedagogico: false, posicionamiento: false, internacionalizacion: false,
    rsu: false, fidelizacion: false, otro_cual: '',
  });
  const [participacionReal, setParticipacionReal] = useState('');
  const [satisfaccionReal, setSatisfaccionReal] = useState('');
  const [otrosResultadosReal, setOtrosResultadosReal] = useState('');
  const [egresosReales, setEgresosReales] = useState([emptyEgresoRow()]);
  const [ingresosReales, setIngresosReales] = useState([emptyEgresoRow()]);
  const [infoPrensa, setInfoPrensa] = useState('');
  const [analisisDesviaciones, setAnalisisDesviaciones] = useState('');
  const [leccionesAprendidas, setLeccionesAprendidas] = useState('');

  const fetchInforme = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        router.replace('/LoginAdmin');
        return;
      }

      const [infoRes, meRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/eventos/${eventId}/informe`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setEsperado(infoRes.data.esperado);

      // Si el backend te devuelve si el usuario puede editar, úsalo directo.
      // Aquí lo inferimos: admin siempre puede ver, pero solo el responsable edita.
      setReadOnly(meRes.data.role !== 'admin' && meRes.data.role !== 'academico');

      const informe = infoRes.data.informe;
      if (informe) {
        setSegAlcanzado({
          estudiantes: String(informe.segmento_alcanzado_estudiantes ?? ''),
          docentes: String(informe.segmento_alcanzado_docentes ?? ''),
          publico_externo: String(informe.segmento_alcanzado_publico_externo ?? ''),
          influencers: String(informe.segmento_alcanzado_influencers ?? ''),
          otro_cual: informe.segmento_alcanzado_otro_cual || '',
          otro_cantidad: String(informe.segmento_alcanzado_otro_cantidad ?? ''),
        });
        setObjAlcanzado({
          modelo_pedagogico: !!informe.objetivo_alcanzado_modelo_pedagogico,
          posicionamiento: !!informe.objetivo_alcanzado_posicionamiento,
          internacionalizacion: !!informe.objetivo_alcanzado_internacionalizacion,
          rsu: !!informe.objetivo_alcanzado_rsu,
          fidelizacion: !!informe.objetivo_alcanzado_fidelizacion,
          otro_cual: informe.objetivo_alcanzado_otro_cual || '',
        });
        setParticipacionReal(informe.participacion_real || '');
        setSatisfaccionReal(informe.indice_satisfaccion_real || '');
        setOtrosResultadosReal(informe.otros_resultados_real || '');
        setEgresosReales(informe.egresos_reales?.length ? informe.egresos_reales : [emptyEgresoRow()]);
        setIngresosReales(informe.ingresos_reales?.length ? informe.ingresos_reales : [emptyEgresoRow()]);
        setInfoPrensa(informe.info_prensa || '');
        setAnalisisDesviaciones(informe.analisis_desviaciones || '');
        setLeccionesAprendidas(informe.lecciones_aprendidas || '');
      }
    } catch (err) {
      setError('Error al cargar el informe: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    if (eventId) fetchInforme();
    else { setError('No se proporcionó un ID de evento.'); setLoading(false); }
  }, [fetchInforme, eventId]);

  // --- Helpers de filas dinámicas (egresos/ingresos reales) ---
  const updateRow = (setter, rows, index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'cantidad' || field === 'precio_unitario') {
      const cantidad = parseFloat(updated[index].cantidad) || 0;
      const precio = parseFloat(updated[index].precio_unitario) || 0;
      updated[index].total = cantidad * precio;
    }
    setter(updated);
  };
  const addRow = (setter, rows) => setter([...rows, emptyEgresoRow()]);
  const removeRow = (setter, rows, index) => setter(rows.filter((_, i) => i !== index));

  const totalEgresosReal = egresosReales.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
  const totalIngresosReal = ingresosReales.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const balanceReal = totalIngresosReal - totalEgresosReal;

  const handleGuardar = async (estadoFinal) => {
    setSaving(true);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');

      const payload = {
        segmento_alcanzado_estudiantes: Number(segAlcanzado.estudiantes) || 0,
        segmento_alcanzado_docentes: Number(segAlcanzado.docentes) || 0,
        segmento_alcanzado_publico_externo: Number(segAlcanzado.publico_externo) || 0,
        segmento_alcanzado_influencers: Number(segAlcanzado.influencers) || 0,
        segmento_alcanzado_otro_cual: segAlcanzado.otro_cual,
        segmento_alcanzado_otro_cantidad: Number(segAlcanzado.otro_cantidad) || 0,
        objetivo_alcanzado_modelo_pedagogico: objAlcanzado.modelo_pedagogico,
        objetivo_alcanzado_posicionamiento: objAlcanzado.posicionamiento,
        objetivo_alcanzado_internacionalizacion: objAlcanzado.internacionalizacion,
        objetivo_alcanzado_rsu: objAlcanzado.rsu,
        objetivo_alcanzado_fidelizacion: objAlcanzado.fidelizacion,
        objetivo_alcanzado_otro_cual: objAlcanzado.otro_cual,
        participacion_real: participacionReal,
        indice_satisfaccion_real: satisfaccionReal,
        otros_resultados_real: otrosResultadosReal,
        egresos_reales: egresosReales.filter(e => e.descripcion || e.total),
        ingresos_reales: ingresosReales.filter(i => i.descripcion || i.total),
        info_prensa: infoPrensa,
        analisis_desviaciones: analisisDesviaciones,
        lecciones_aprendidas: leccionesAprendidas,
        estado: estadoFinal,
      };

      await axios.post(`${API_BASE_URL}/eventos/${eventId}/informe`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Éxito', estadoFinal === 'finalizado' ? 'Informe finalizado correctamente' : 'Borrador guardado correctamente');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar el informe: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const buildInformeHtml = () => {
    const rowsHtml = (rows) => rows.map(r => `<tr><td>${r.descripcion || ''}</td><td style="text-align:right">${r.cantidad || ''}</td><td style="text-align:right">Bs ${parseFloat(r.precio_unitario || 0).toFixed(2)}</td><td style="text-align:right">Bs ${parseFloat(r.total || 0).toFixed(2)}</td></tr>`).join('');

    return `<html><head><meta charset="UTF-8"><style>
      @page { margin: 1cm; }
      body { font-family: Arial, sans-serif; padding: 1cm; color: #333; }
      h1 { color: #E95A0C; border-bottom: 2px solid #E95A0C; padding-bottom: 0.3cm; }
      .section-title { background: #f6a06b; color: #fff; font-weight: bold; padding: 6px 10px; margin-top: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      td, th { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
      .two-col { display: flex; gap: 16px; }
      .two-col > div { flex: 1; }
      .label { font-weight: bold; color: #2980b9; }
      .balance { font-weight: bold; background: #ecf0f1; padding: 8px; margin-top: 8px; }
    </style></head><body>
      <h1>Informe del Evento</h1>

      <div class="section-title">I. Datos Generales</div>
      <table>
        <tr><td class="label">Nombre del Evento</td><td>${esperado?.nombreEvento || ''}</td></tr>
        <tr><td class="label">Lugar del Evento</td><td>${esperado?.lugarEvento || ''}</td></tr>
        <tr><td class="label">Fecha de Realización</td><td>${formatDate(esperado?.fechaEvento)}</td></tr>
        <tr><td class="label">Hora del Evento</td><td>${esperado?.horaEvento || ''}</td></tr>
        <tr><td class="label">Responsable del Evento</td><td>${esperado?.responsable || ''}</td></tr>
      </table>

      <div class="section-title">II. Resultados del Evento</div>
      <div class="two-col">
        <div>
          <strong>Segmento Objetivo Alcanzado</strong>
          <table>
            <tr><td>Estudiantes</td><td>${segAlcanzado.estudiantes || 0}</td></tr>
            <tr><td>Docentes</td><td>${segAlcanzado.docentes || 0}</td></tr>
            <tr><td>Público Externo</td><td>${segAlcanzado.publico_externo || 0}</td></tr>
            <tr><td>Influencers</td><td>${segAlcanzado.influencers || 0}</td></tr>
            <tr><td>Otro (${segAlcanzado.otro_cual || '-'})</td><td>${segAlcanzado.otro_cantidad || 0}</td></tr>
          </table>
        </div>
        <div>
          <strong>Objetivos Alcanzados</strong>
          <table>
            <tr><td>Modelo Pedagógico</td><td>${objAlcanzado.modelo_pedagogico ? 'Sí' : 'No'}</td></tr>
            <tr><td>Posicionamiento</td><td>${objAlcanzado.posicionamiento ? 'Sí' : 'No'}</td></tr>
            <tr><td>Internacionalización</td><td>${objAlcanzado.internacionalizacion ? 'Sí' : 'No'}</td></tr>
            <tr><td>RSU</td><td>${objAlcanzado.rsu ? 'Sí' : 'No'}</td></tr>
            <tr><td>Fidelización</td><td>${objAlcanzado.fidelizacion ? 'Sí' : 'No'}</td></tr>
            <tr><td>Otro (${objAlcanzado.otro_cual || '-'})</td><td></td></tr>
          </table>
        </div>
      </div>

      <table>
        <tr><th></th><th>Esperado</th><th>Real</th></tr>
        <tr><td>Participación Efectiva</td><td>${esperado?.participacionEsperada || '-'}</td><td>${participacionReal || '-'}</td></tr>
        <tr><td>Índice de Satisfacción</td><td>${esperado?.satisfaccionEsperada || '-'}</td><td>${satisfaccionReal || '-'}</td></tr>
        <tr><td>Otro</td><td>${esperado?.otrosResultadosEsperados || '-'}</td><td>${otrosResultadosReal || '-'}</td></tr>
      </table>

      <div class="section-title">III. Balance Económico</div>
      <strong>Egresos</strong>
      <table>
        <tr><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr>
        ${rowsHtml(egresosReales)}
      </table>
      <strong>Ingresos</strong>
      <table>
        <tr><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr>
        ${rowsHtml(ingresosReales)}
      </table>
      <div class="balance">Balance Económico: Bs ${balanceReal.toFixed(2)}</div>

      <div class="section-title">IV. Información para la Nota de Prensa</div>
      <table><tr><td>${(infoPrensa || '').replace(/\n/g, '<br/>')}</td></tr></table>

      <div class="section-title">V. Análisis de Desviaciones Críticas/Significativas</div>
      <table><tr><td>${(analisisDesviaciones || '').replace(/\n/g, '<br/>')}</td></tr></table>

      <div class="section-title">VI. Lecciones Aprendidas</div>
      <table><tr><td>${(leccionesAprendidas || '').replace(/\n/g, '<br/>')}</td></tr></table>
    </body></html>`;
  };

  const generarPDF = async () => {
    const html = buildInformeHtml();
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`${html}<script>setTimeout(() => { window.print(); window.close(); }, 500);</script>`);
      printWindow.document.close();
      return;
    }
    try {
      const result = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartir Informe del Evento' });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF: ' + err.message);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Cargando informe...</Text></View>;
  }
  if (error) {
    return <View style={styles.centered}><Ionicons name="alert-circle-outline" size={50} color={COLORS.accent} /><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.white} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Informe del Evento</Text>
        <TouchableOpacity onPress={generarPDF}><Ionicons name="print-outline" size={24} color={COLORS.white} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        {/* I. Datos Generales - solo lectura, ya existen en el evento */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>I. Datos Generales</Text>
          <View style={styles.readOnlyRow}><Text style={styles.readOnlyLabel}>Nombre del Evento</Text><Text style={styles.readOnlyValue}>{esperado?.nombreEvento}</Text></View>
          <View style={styles.readOnlyRow}><Text style={styles.readOnlyLabel}>Lugar</Text><Text style={styles.readOnlyValue}>{esperado?.lugarEvento}</Text></View>
          <View style={styles.readOnlyRow}><Text style={styles.readOnlyLabel}>Fecha</Text><Text style={styles.readOnlyValue}>{formatDate(esperado?.fechaEvento)}</Text></View>
          <View style={styles.readOnlyRow}><Text style={styles.readOnlyLabel}>Hora</Text><Text style={styles.readOnlyValue}>{esperado?.horaEvento}</Text></View>
          <View style={styles.readOnlyRow}><Text style={styles.readOnlyLabel}>Responsable</Text><Text style={styles.readOnlyValue}>{esperado?.responsable}</Text></View>
        </View>

        {readOnly && (
          <View style={[styles.sectionCard, { backgroundColor: '#FFF3E0', flexDirection: 'row', alignItems: 'center' }]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.warning} />
            <Text style={{ marginLeft: 10, color: COLORS.darkText, flex: 1 }}>Solo el responsable del evento puede completar este informe. Puedes verlo, pero no editarlo.</Text>
          </View>
        )}

        {/* II. Segmento y Objetivos Alcanzados */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>II. Segmento Objetivo Alcanzado</Text>
          {['estudiantes', 'docentes', 'publico_externo', 'influencers'].map((key) => (
            <View key={key} style={styles.inputRow}>
              <Text style={styles.inputLabel}>{key.replace('_', ' ')}</Text>
              <TextInput
                style={styles.numberInput}
                keyboardType="numeric"
                editable={!readOnly}
                value={segAlcanzado[key]}
                onChangeText={(v) => setSegAlcanzado(prev => ({ ...prev, [key]: v }))}
                placeholder="0"
              />
            </View>
          ))}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { flex: 2 }]}
              editable={!readOnly}
              value={segAlcanzado.otro_cual}
              onChangeText={(v) => setSegAlcanzado(prev => ({ ...prev, otro_cual: v }))}
              placeholder="Otro: ¿cuál?"
            />
            <TextInput
              style={styles.numberInput}
              keyboardType="numeric"
              editable={!readOnly}
              value={segAlcanzado.otro_cantidad}
              onChangeText={(v) => setSegAlcanzado(prev => ({ ...prev, otro_cantidad: v }))}
              placeholder="0"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Objetivos Alcanzados</Text>
          {[
            ['modelo_pedagogico', 'Modelo Pedagógico'],
            ['posicionamiento', 'Posicionamiento'],
            ['internacionalizacion', 'Internacionalización'],
            ['rsu', 'RSU'],
            ['fidelizacion', 'Fidelización'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={styles.checkRow}
              disabled={readOnly}
              onPress={() => setObjAlcanzado(prev => ({ ...prev, [key]: !prev[key] }))}
            >
              <Ionicons name={objAlcanzado[key] ? 'checkbox' : 'square-outline'} size={22} color={COLORS.primary} />
              <Text style={styles.checkLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.textInput}
            editable={!readOnly}
            value={objAlcanzado.otro_cual}
            onChangeText={(v) => setObjAlcanzado(prev => ({ ...prev, otro_cual: v }))}
            placeholder="Otro: ¿cuál?"
          />
        </View>

        {/* Participación / Satisfacción */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Participación e Índice de Satisfacción</Text>
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Participación</Text>
            <Text style={styles.compareExpected}>Esperado: {esperado?.participacionEsperada || '-'}</Text>
          </View>
          <TextInput style={styles.textInput} editable={!readOnly} value={participacionReal} onChangeText={setParticipacionReal} placeholder="Real" />

          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Índice de Satisfacción</Text>
            <Text style={styles.compareExpected}>Esperado: {esperado?.satisfaccionEsperada || '-'}</Text>
          </View>
          <TextInput style={styles.textInput} editable={!readOnly} value={satisfaccionReal} onChangeText={setSatisfaccionReal} placeholder="Real" />

          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Otro</Text>
            <Text style={styles.compareExpected}>Esperado: {esperado?.otrosResultadosEsperados || '-'}</Text>
          </View>
          <TextInput style={styles.textInput} editable={!readOnly} value={otrosResultadosReal} onChangeText={setOtrosResultadosReal} placeholder="Real" />
        </View>

        {/* III. Balance Económico Real */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>III. Balance Económico (Real)</Text>

          <Text style={styles.subLabel}>Egresos</Text>
          {egresosReales.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <TextInput style={[styles.textInput, { flex: 2 }]} editable={!readOnly} placeholder="Descripción" value={row.descripcion} onChangeText={(v) => updateRow(setEgresosReales, egresosReales, index, 'descripcion', v)} />
              <TextInput style={[styles.numberInput, { flex: 1 }]} keyboardType="numeric" editable={!readOnly} placeholder="Cant." value={String(row.cantidad)} onChangeText={(v) => updateRow(setEgresosReales, egresosReales, index, 'cantidad', v)} />
              <TextInput style={[styles.numberInput, { flex: 1 }]} keyboardType="numeric" editable={!readOnly} placeholder="Precio" value={String(row.precio_unitario)} onChangeText={(v) => updateRow(setEgresosReales, egresosReales, index, 'precio_unitario', v)} />
              <Text style={styles.rowTotal}>Bs {(row.total || 0).toFixed(2)}</Text>
              {!readOnly && <TouchableOpacity onPress={() => removeRow(setEgresosReales, egresosReales, index)}><Ionicons name="trash-outline" size={20} color={COLORS.logout} /></TouchableOpacity>}
            </View>
          ))}
          {!readOnly && (
            <TouchableOpacity style={styles.addRowButton} onPress={() => addRow(setEgresosReales, egresosReales)}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} /><Text style={styles.addRowText}>Agregar egreso</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.subLabel, { marginTop: 16 }]}>Ingresos</Text>
          {ingresosReales.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <TextInput style={[styles.textInput, { flex: 2 }]} editable={!readOnly} placeholder="Descripción" value={row.descripcion} onChangeText={(v) => updateRow(setIngresosReales, ingresosReales, index, 'descripcion', v)} />
              <TextInput style={[styles.numberInput, { flex: 1 }]} keyboardType="numeric" editable={!readOnly} placeholder="Cant." value={String(row.cantidad)} onChangeText={(v) => updateRow(setIngresosReales, ingresosReales, index, 'cantidad', v)} />
              <TextInput style={[styles.numberInput, { flex: 1 }]} keyboardType="numeric" editable={!readOnly} placeholder="Precio" value={String(row.precio_unitario)} onChangeText={(v) => updateRow(setIngresosReales, ingresosReales, index, 'precio_unitario', v)} />
              <Text style={styles.rowTotal}>Bs {(row.total || 0).toFixed(2)}</Text>
              {!readOnly && <TouchableOpacity onPress={() => removeRow(setIngresosReales, ingresosReales, index)}><Ionicons name="trash-outline" size={20} color={COLORS.logout} /></TouchableOpacity>}
            </View>
          ))}
          {!readOnly && (
            <TouchableOpacity style={styles.addRowButton} onPress={() => addRow(setIngresosReales, ingresosReales)}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} /><Text style={styles.addRowText}>Agregar ingreso</Text>
            </TouchableOpacity>
          )}

          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>Balance Económico</Text>
            <Text style={[styles.balanceValue, { color: balanceReal >= 0 ? COLORS.success : COLORS.logout }]}>Bs {balanceReal.toFixed(2)}</Text>
          </View>
        </View>

        {/* IV, V, VI */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>IV. Información para la Nota de Prensa</Text>
          <TextInput style={styles.multilineInput} editable={!readOnly} multiline numberOfLines={4} value={infoPrensa} onChangeText={setInfoPrensa} placeholder="¿Qué se hizo, quiénes, por qué/para qué, cuándo, dónde?" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>V. Análisis de Desviaciones Críticas/Significativas</Text>
          <TextInput style={styles.multilineInput} editable={!readOnly} multiline numberOfLines={4} value={analisisDesviaciones} onChangeText={setAnalisisDesviaciones} placeholder="Análisis de causas de las desviaciones detectadas" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>VI. Lecciones Aprendidas</Text>
          <TextInput style={styles.multilineInput} editable={!readOnly} multiline numberOfLines={4} value={leccionesAprendidas} onChangeText={setLeccionesAprendidas} placeholder="Lecciones aprendidas del evento" />
        </View>

        {!readOnly && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.draftButton} disabled={saving} onPress={() => handleGuardar('borrador')}>
              {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.draftButtonText}>Guardar borrador</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.finalButton} disabled={saving} onPress={() => handleGuardar('finalizado')}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.finalButtonText}>Finalizar informe</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.pdfButton} onPress={generarPDF}>
          <Ionicons name="print-outline" size={20} color={COLORS.white} />
          <Text style={styles.pdfButtonText}>Generar PDF</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

InformeEventoScreen.options = { headerShown: false };

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.grayText },
  errorText: { marginTop: 15, fontSize: 16, color: COLORS.accent, textAlign: 'center', marginHorizontal: 20 },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 8 } }) },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 12 },
  readOnlyRow: { marginBottom: 10 },
  readOnlyLabel: { fontSize: 12, color: COLORS.grayText, textTransform: 'uppercase' },
  readOnlyValue: { fontSize: 15, color: COLORS.darkText, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  inputLabel: { flex: 1, fontSize: 14, color: COLORS.darkText, textTransform: 'capitalize' },
  numberInput: { width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 8, textAlign: 'right', backgroundColor: COLORS.background },
  textInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.background, marginBottom: 8 },
  multilineInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.background, minHeight: 90, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  checkLabel: { fontSize: 14, color: COLORS.darkText },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  compareLabel: { fontSize: 14, fontWeight: '600', color: COLORS.darkText },
  compareExpected: { fontSize: 13, color: COLORS.grayText },
  subLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowTotal: { width: 70, textAlign: 'right', fontSize: 13, fontWeight: '600', color: COLORS.darkText },
  addRowButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addRowText: { color: COLORS.primary, fontWeight: '600' },
  balanceBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.grayLight, padding: 12, borderRadius: 10, marginTop: 16 },
  balanceLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.darkText },
  balanceValue: { fontSize: 16, fontWeight: 'bold' },
  actionButtonsContainer: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 12 },
  draftButton: { flex: 1, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  draftButtonText: { color: COLORS.primary, fontWeight: 'bold' },
  finalButton: { flex: 1, backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  finalButtonText: { color: COLORS.white, fontWeight: 'bold' },
  pdfButton: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 },
  pdfButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});

export default InformeEventoScreen;