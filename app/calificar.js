// F5 (mockups 17 y 17b, RF-25): el cliente califica con el código de su reserva.
// Solo se califica una reserva completada y una sola vez (RN-15); lo decide la base.
import { useCallback, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import FondoSeccion from '../components/FondoSeccion';
import { crearPorCodigo } from '../services/calificaciones';
import { validarCalificacion } from '../services/validaciones';
import { leerFecha } from '../services/slots';
import { LONGITUD_CODIGO } from '../services/codigos';
import Boton from '../components/Boton';
import Campo from '../components/Campo';
import CalificacionEstrellas from '../components/CalificacionEstrellas';

const fechaCorta = (fecha) => (fecha
  ? leerFecha(fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
  : '');

function CalificarScreenContenido() {
  const [form, setForm] = useState({ codigo: '', puntuacion: 0 });
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [gracias, setGracias] = useState(null);
  const bloqueo = useRef(false);
  const montada = useRef(true);

  // En la pantalla de agradecimiento, "atrás" vuelve al inicio y no al formulario.
  useFocusEffect(useCallback(() => {
    montada.current = true;
    if (!gracias) return () => { montada.current = false; };
    const evento = BackHandler.addEventListener('hardwareBackPress', () => { router.replace('/inicio'); return true; });
    return () => { montada.current = false; evento.remove(); };
  }, [gracias]));

  const validacion = validarCalificacion(form);
  const cambiar = (dato) => setForm((anterior) => ({ ...anterior, ...dato }));

  async function enviar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const resultado = await crearPorCodigo(form.codigo, form.puntuacion);
      if (!montada.current) return;
      if (resultado.error) setAviso(resultado.error);
      else setGracias({ puntuacion: form.puntuacion, ...resultado.data });
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  if (gracias) {
    const resumen = [gracias.sede, gracias.mesa, fechaCorta(gracias.fecha)].filter(Boolean).join(' · ');
    return <View style={styles.gracias}>
      <Ionicons name="checkmark-circle-outline" size={72} color={colors.textoClaro} />
      <Text accessibilityRole="header" style={styles.titulo}>¡Gracias por calificar!</Text>
      <CalificacionEstrellas valor={gracias.puntuacion} tamano={30} neon />
      {!!resumen && <Text style={styles.resumen}>{resumen}</Text>}
      <View style={styles.botonFinal}><Boton titulo="Volver al inicio" onPress={() => router.replace('/inicio')} /></View>
    </View>;
  }

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Escribe el código que recibiste al confirmar tu reserva y califica tu visita.</Text>
      <Campo etiqueta="Código de la reserva" value={form.codigo} maxLength={LONGITUD_CODIGO}
        onChangeText={(v) => cambiar({ codigo: v })} autoCapitalize="characters" autoCorrect={false}
        placeholder="K7Q2M9XD" error={tocado ? validacion.errores.codigo : null}
        ayuda="Son 8 caracteres; aparece en la pantalla de confirmación." />
      <Text style={styles.pregunta}>¿Cómo te fue?</Text>
      <CalificacionEstrellas neon valor={form.puntuacion} onChange={(n) => { cambiar({ puntuacion: n }); setTocado(true); }} />
      {tocado && validacion.errores.puntuacion && <Text accessibilityRole="alert" style={styles.error}>{validacion.errores.puntuacion}</Text>}
      {!!aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      <Boton titulo="Enviar calificación" cargando={enviando} disabled={!validacion.valido} onPress={enviar} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Mismo estilo que Inicio: fondo de sección detrás de toda la pantalla.
export default function CalificarScreen() {
  return <FondoSeccion edges={[]}><CalificarScreenContenido /></FondoSeccion>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: 'transparent' },
  contenido: { padding: 16, paddingBottom: 40, gap: 16 },
  intro: { fontSize: 15, color: colors.textoClaro, lineHeight: 22 },
  pregunta: { fontSize: 17, fontWeight: '700', color: colors.textoClaro, marginTop: 4 },
  error: { color: colors.errorClaro, fontSize: 14, lineHeight: 21 },
  gracias: { flex: 1, backgroundColor: 'transparent', padding: 24, paddingTop: 56, alignItems: 'center', gap: 16 },
  titulo: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: colors.textoClaro },
  resumen: { fontSize: 15, color: colors.textoClaroSecundario, textAlign: 'center' },
  botonFinal: { marginTop: 'auto', alignSelf: 'stretch', paddingBottom: 16 },
});
