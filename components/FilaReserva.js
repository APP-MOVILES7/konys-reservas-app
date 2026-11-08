// RF-12: tarjeta administrativa de reserva con Cancelar y Completar (RN-06: no se borra).
// F4 (08 y 08c): muestra el pago reportado a quien tiene `pagos.ver` y ofrece "No asistió"
// solo pasados 10 minutos y con `reservas.liberar` (RN-14, D-02).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { ESTADOS } from '../constants/dominio';
import { leerFecha } from '../services/slots';

const tono = { confirmada: colors.textoClaro, cancelada: colors.errorClaro, completada: colors.textoClaroSecundario, no_asistio: colors.textoClaroSecundario };

const horaCorta = (valor) => new Date(valor).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function FilaReserva({ reserva, procesando, puedeVerPago, onCancelar, onCompletar, onLiberar, liberarDesde }) {
  const fecha = leerFecha(reserva.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  const confirmada = reserva.estado === 'confirmada';
  const liberable = confirmada && !!onLiberar && !liberarDesde;
  return <View style={styles.tarjeta}>
    <View style={styles.contenido}>
      <Text style={styles.nombre}>{reserva.cliente_nombre}</Text>
      <Text style={styles.detalle}>{reserva.mesa?.nombre ?? 'Mesa'} · {fecha} · {reserva.hora_inicio.slice(0, 5)}–{reserva.hora_fin.slice(0, 5)}</Text>
      <Text style={styles.detalle}>{reserva.num_personas} personas{reserva.cliente_contacto ? ` · ${reserva.cliente_contacto}` : ''}</Text>
      <Text style={[styles.estado, { color: tono[reserva.estado] ?? colors.textoClaro }]}>{ESTADOS[reserva.estado] ?? reserva.estado}</Text>
      {puedeVerPago && <View style={styles.pago}>
        <Ionicons name={reserva.pago_reportado ? 'checkmark-circle-outline' : 'close-circle-outline'} size={16} color={reserva.pago_reportado ? colors.textoClaro : colors.textoClaroSecundario} />
        <Text style={styles.pagoTexto}>
          {reserva.pago_reportado
            ? `Pago reportado${reserva.pago_reportado_en ? ` · ${horaCorta(reserva.pago_reportado_en)}` : ''}`
            : 'Sin pago reportado'}
        </Text>
      </View>}
      {reserva.estado === 'no_asistio' && <Text style={styles.detalle}>
        Mesa liberada{reserva.liberada_en ? ` a las ${horaCorta(reserva.liberada_en)}` : ''}.
      </Text>}
    </View>
    {/* F3: cada acción aparece solo si el rol la tiene (se pasa su función). */}
    {confirmada && (onCancelar || onCompletar) && <View style={styles.acciones}>
      {!!onCancelar && <Pressable accessibilityRole="button" accessibilityLabel={`Cancelar reserva de ${reserva.cliente_nombre}`} disabled={procesando}
        onPress={onCancelar} style={[styles.accion, styles.cancelar]} hitSlop={8}>
        <Text style={styles.textoAccion}>Cancelar</Text>
      </Pressable>}
      {!!onCompletar && <Pressable accessibilityRole="button" accessibilityLabel={`Completar reserva de ${reserva.cliente_nombre}`} disabled={procesando}
        onPress={onCompletar} style={styles.accion} hitSlop={8}>
        <Text style={[styles.textoAccion, styles.claro]}>Completar</Text>
      </Pressable>}
    </View>}
    {confirmada && !!onLiberar && <Pressable accessibilityRole="button"
      accessibilityLabel={liberable ? `Marcar no asistió y liberar la mesa de ${reserva.cliente_nombre}` : `No asistió disponible desde ${liberarDesde}`}
      accessibilityState={{ disabled: procesando || !liberable }} disabled={procesando || !liberable}
      onPress={onLiberar} style={[styles.accion, styles.liberar, !liberable && styles.liberarEspera]} hitSlop={8}>
      <Text style={[styles.textoAccion, liberable && styles.claro]}>
        {liberable ? 'No asistió · liberar mesa' : `No asistió · disponible desde ${liberarDesde ?? 'la hora'}`}
      </Text>
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  tarjeta: { padding: 14, backgroundColor: colors.vidrioRespaldo, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: 14, marginBottom: 10, gap: 10 },
  contenido: { gap: 3 },
  nombre: { fontSize: 16, fontWeight: '700', color: colors.textoClaro },
  detalle: { color: colors.textoClaroSecundario, fontSize: 14, lineHeight: 20 },
  estado: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  pago: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  pagoTexto: { color: colors.textoClaroSecundario, fontSize: 13 },
  acciones: { flexDirection: 'row', gap: 8 },
  accion: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.acento, backgroundColor: colors.acento, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  cancelar: { backgroundColor: colors.vidrioRespaldo, borderColor: colors.errorClaro },
  liberar: { backgroundColor: colors.acento, borderColor: colors.acento },
  liberarEspera: { backgroundColor: colors.vidrio, borderColor: colors.vidrioBorde },
  textoAccion: { color: colors.textoClaro, fontWeight: '600', fontSize: 14 },
  claro: { color: colors.primario },
});
