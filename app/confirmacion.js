import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { ZONAS } from '../constants/dominio';
import { leerFecha } from '../services/slots';
import { horaTolerancia } from '../services/permisos';
import { useReservaConfirmada } from '../hooks/ReservaConfirmada';
import Boton from '../components/Boton';

export default function ConfirmacionScreen() {
  const { reserva, setReserva } = useReservaConfirmada();
  const [copiado, setCopiado] = useState(false);
  const copia = useRef(null);
  const volver = useCallback(() => {
    setReserva(null);
    router.replace('/inicio');
  }, [setReserva]);
  useFocusEffect(useCallback(() => {
    const evento = BackHandler.addEventListener('hardwareBackPress', () => { volver(); return true; });
    return () => { evento.remove(); if (copia.current) clearTimeout(copia.current); };
  }, [volver]));

  // F5: el cliente copia el código para no perderlo antes de calificar.
  async function copiarCodigo() {
    if (!reserva?.codigo) return;
    await Clipboard.setStringAsync(reserva.codigo);
    setCopiado(true);
    if (copia.current) clearTimeout(copia.current);
    copia.current = setTimeout(() => setCopiado(false), 2000);
  }

  const filas = reserva ? [
    ...(reserva.sede_nombre ? [['Sede', reserva.sede_nombre]] : []),
    ['Mesa', reserva.mesa_nombre],
    ['Zona', ZONAS[reserva.zona]],
    ['Fecha', leerFecha(reserva.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Hora', `${reserva.hora_inicio} a ${reserva.hora_fin}`],
    ['Personas', String(reserva.num_personas)],
    ['Nombre', reserva.cliente_nombre],
    ['Pago', reserva.pago_reportado ? 'Reportado' : 'No reportado'],
  ] : [];
  const limite = reserva ? horaTolerancia(reserva) : null;

  return <SafeAreaView style={styles.pantalla}>
    <ScrollView contentContainerStyle={styles.contenido}>
      <Ionicons name={reserva ? 'checkmark-circle-outline' : 'information-circle-outline'} size={68} color={colors.primario} style={styles.icono} />
      <Text accessibilityRole="header" style={styles.titulo}>{reserva ? 'Reserva confirmada' : 'No hay una confirmación para mostrar'}</Text>
      {reserva && <>
        <Text style={styles.subtitulo}>Te esperamos en Konys Pizza.</Text>
        {!!reserva.codigo && <View style={styles.codigo}>
          <Text style={styles.codigoEtiqueta}>Código de tu reserva</Text>
          <View style={styles.codigoFila}>
            <Text selectable style={styles.codigoValor}>{reserva.codigo}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Copiar el código de la reserva"
              onPress={copiarCodigo} hitSlop={8} style={styles.codigoCopiar}>
              <Ionicons name={copiado ? 'checkmark-outline' : 'copy-outline'} size={22} color={colors.primario} />
            </Pressable>
          </View>
          <Text style={styles.codigoNota}>Guárdalo: lo necesitas para calificar la visita.</Text>
        </View>}
        <View style={styles.tarjeta}>{filas.map(([etiqueta, valor]) => <View key={etiqueta} style={styles.fila}>
          <Text style={styles.etiqueta}>{etiqueta}</Text><Text style={styles.valor}>{valor}</Text>
        </View>)}</View>
        {!!limite && <View style={styles.tolerancia}>
          <Ionicons name="time-outline" size={22} color={colors.primario} />
          <Text style={styles.toleranciaTexto}>Tienes 10 minutos de tolerancia (hasta las {limite}). Después, la mesa se libera.</Text>
        </View>}
      </>}
      <View style={styles.boton}><Boton titulo="Volver al inicio" onPress={volver} /></View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { flexGrow: 1, padding: 16, paddingTop: 40, gap: 16 },
  icono: { alignSelf: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.primario },
  subtitulo: { fontSize: 16, textAlign: 'center', color: colors.secundario },
  tarjeta: { backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, paddingHorizontal: 16 },
  codigo: { backgroundColor: colors.blanco, borderWidth: 1.5, borderColor: colors.primario, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  codigoEtiqueta: { fontSize: 13, color: colors.secundario },
  codigoFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codigoValor: { fontSize: 30, fontWeight: '800', letterSpacing: 3, color: colors.texto },
  codigoCopiar: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  codigoNota: { fontSize: 13, color: colors.secundario, textAlign: 'center' },
  tolerancia: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, padding: 14 },
  toleranciaTexto: { flex: 1, color: colors.texto, fontSize: 14, lineHeight: 21 },
  fila: { flexDirection: 'row', gap: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borde },
  etiqueta: { width: 65, color: colors.secundario, fontSize: 15 },
  valor: { flex: 1, textAlign: 'right', fontSize: 15, color: colors.texto, fontWeight: '500' },
  boton: { marginTop: 'auto', paddingTop: 24, paddingBottom: 16 },
});
