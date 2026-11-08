import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../constants/colors';
import { radio } from '../constants/estilos';
import { ZONAS } from '../constants/dominio';
import { leerFecha } from '../services/slots';
import { horaTolerancia } from '../services/permisos';
import { useReservaConfirmada } from '../hooks/ReservaConfirmada';
import Boton from '../components/Boton';
import FondoSeccion from '../components/FondoSeccion';
import TarjetaVidrio from '../components/TarjetaVidrio';

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

  // Tarjeta de vidrio grande y centrada sobre el fondo de sección, con el resumen y el botón naranja.
  return <FondoSeccion edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.contenido}>
      <TarjetaVidrio estilo={styles.tarjeta}>
        <Ionicons name={reserva ? 'checkmark-circle-outline' : 'information-circle-outline'} size={68} color={colors.textoClaro} style={styles.icono} />
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
          <View>{filas.map(([etiqueta, valor]) => <View key={etiqueta} style={styles.fila}>
            <Text style={styles.etiqueta}>{etiqueta}</Text><Text style={styles.valor}>{valor}</Text>
          </View>)}</View>
          {!!limite && <View style={styles.tolerancia}>
            <Ionicons name="time-outline" size={22} color={colors.textoClaro} />
            <Text style={styles.toleranciaTexto}>Tienes 10 minutos de tolerancia (hasta las {limite}). Después, la mesa se libera.</Text>
          </View>}
        </>}
        <View style={styles.boton}><Boton titulo="Volver al inicio" variante="accion" onPress={volver} /></View>
      </TarjetaVidrio>
    </ScrollView>
  </FondoSeccion>;
}

const styles = StyleSheet.create({
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 16, paddingVertical: 32 },
  tarjeta: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, gap: 16 },
  icono: { alignSelf: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.textoClaro },
  subtitulo: { fontSize: 16, textAlign: 'center', color: colors.textoClaroSecundario },
  // El código queda en una superficie plana blanca para leerlo y copiarlo sin esfuerzo.
  codigo: { backgroundColor: colors.blanco, borderRadius: radio.tarjeta, padding: 16, alignItems: 'center', gap: 6 },
  codigoEtiqueta: { fontSize: 13, color: colors.secundario },
  codigoFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codigoValor: { fontSize: 30, fontWeight: '800', letterSpacing: 3, color: colors.texto },
  codigoCopiar: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  codigoNota: { fontSize: 13, color: colors.secundario, textAlign: 'center' },
  tolerancia: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: radio.boton, padding: 14 },
  toleranciaTexto: { flex: 1, color: colors.textoClaro, fontSize: 14, lineHeight: 21 },
  fila: { flexDirection: 'row', gap: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.vidrioBorde },
  etiqueta: { width: 65, color: colors.textoClaroSecundario, fontSize: 15 },
  valor: { flex: 1, textAlign: 'right', fontSize: 15, color: colors.textoClaro, fontWeight: '500' },
  boton: { paddingTop: 8 },
});
