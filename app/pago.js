// F4 (mockup 02c, D-01): pago simulado. Muestra las llaves activas de la sede y exige
// "Ya pagué" antes de crear la reserva. No valida pagos ni guarda datos de tarjetas.
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../constants/colors';
import FondoSeccion from '../components/FondoSeccion';
import { TIPOS_PAGO, ZONAS } from '../constants/dominio';
import { crear } from '../services/reservas';
import { listarActivos } from '../services/metodosPago';
import { leerFecha } from '../services/slots';
import { horaTolerancia } from '../services/permisos';
import { useReservaPendiente } from '../hooks/ReservaPendiente';
import { useReservaConfirmada } from '../hooks/ReservaConfirmada';
import Boton from '../components/Boton';
import EstadoPantalla from '../components/EstadoPantalla';

const etiquetaLlave = (tipo) => (tipo === 'bre-b' ? 'Llave Bre-B' : TIPOS_PAGO[tipo] ?? 'Llave');

function PagoScreenContenido() {
  const { pendiente, setPendiente } = useReservaPendiente();
  const { setReserva } = useReservaConfirmada();
  const [metodos, setMetodos] = useState({ data: [], cargando: true, error: null });
  const [yaPague, setYaPague] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [copiada, setCopiada] = useState(null);
  const bloqueo = useRef(false);
  const montada = useRef(true);
  const copia = useRef(null);

  const sedeId = pendiente?.sede?.id;

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    setMetodos({ data: [], cargando: true, error: null });
    const resultado = await listarActivos(sedeId);
    if (montada.current) setMetodos({ ...resultado, cargando: false });
  }, [sedeId]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; if (copia.current) clearTimeout(copia.current); };
  }, [cargar]));

  async function copiar(metodo) {
    await Clipboard.setStringAsync(metodo.llave);
    setCopiada(metodo.id);
    if (copia.current) clearTimeout(copia.current);
    copia.current = setTimeout(() => { if (montada.current) setCopiada(null); }, 2000);
  }

  async function confirmar() {
    if (bloqueo.current || !yaPague || !pendiente) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const resultado = await crear(pendiente.mesaId, pendiente.fecha, pendiente.hora_inicio,
        pendiente.form, { pagoReportado: true });
      if (!montada.current) return;
      if (resultado.error) {
        setAviso(resultado.error);
      } else {
        setReserva({ ...resultado.data, sede_nombre: pendiente.sede?.nombre ?? null });
        setPendiente(null);
        // La confirmación reemplaza la pila para no volver al pago ya enviado.
        router.dismissAll();
        router.replace('/confirmacion');
      }
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  if (!pendiente) {
    return <View style={styles.vacio}>
      <Text accessibilityRole="alert" style={styles.vacioTexto}>No hay una reserva por pagar. Elige una mesa para empezar.</Text>
      <Boton titulo="Elegir mesa" onPress={() => router.replace('/inicio')} />
    </View>;
  }

  const filas = [
    ...(pendiente.sede?.nombre ? [['Sede', pendiente.sede.nombre]] : []),
    ['Mesa', `${pendiente.mesa?.nombre ?? 'Mesa'}${pendiente.mesa?.zona ? ` · ${ZONAS[pendiente.mesa.zona]}` : ''}`],
    ['Fecha', leerFecha(pendiente.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Hora', `${pendiente.hora_inicio} a ${pendiente.hora_fin}`],
    ['Personas', String(pendiente.form.num_personas)],
    ['Nombre', pendiente.form.cliente_nombre.trim()],
  ];
  const limite = horaTolerancia({ fecha: pendiente.fecha, hora_inicio: pendiente.hora_inicio });
  const sinMetodos = !metodos.cargando && !metodos.error && (metodos.data ?? []).length === 0;

  return <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
    <View style={styles.tarjeta}>
      {filas.map(([etiqueta, valor]) => <View key={etiqueta} style={styles.fila}>
        <Text style={styles.etiqueta}>{etiqueta}</Text><Text style={styles.valor}>{valor}</Text>
      </View>)}
    </View>

    <Text accessibilityRole="header" style={styles.titulo}>Cómo pagar</Text>
    <Text style={styles.secundario}>Transfiere a cualquiera de estas cuentas de {pendiente.sede?.nombre ?? 'la sede'}. El pago se hace por fuera de la app.</Text>

    {!!aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}

    {metodos.cargando
      ? <EstadoPantalla cargando />
      : metodos.error
        ? <EstadoPantalla mensaje={metodos.error} onReintentar={cargar} />
        : sinMetodos
          ? <EstadoPantalla mensaje="Esta sede todavía no tiene métodos de pago configurados. Pregunta en el local." onReintentar={cargar} />
          : (metodos.data ?? []).map((m) => <View key={m.id} style={styles.metodo}>
            <View style={styles.metodoTexto}>
              <Text style={styles.metodoTipo}>{etiquetaLlave(m.tipo)}</Text>
              <Text style={styles.metodoLlave}>{m.llave}</Text>
              <Text style={styles.secundario}>{m.titular}</Text>
              {!!m.instrucciones && <Text style={styles.secundario}>{m.instrucciones}</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Copiar ${etiquetaLlave(m.tipo)}`}
              onPress={() => copiar(m)} style={styles.copiar} hitSlop={6}>
              <Ionicons name={copiada === m.id ? 'checkmark-outline' : 'copy-outline'} size={18} color={colors.textoClaro} />
              <Text style={styles.copiarTexto}>{copiada === m.id ? 'Copiado' : 'Copiar'}</Text>
            </Pressable>
          </View>)}

    <View style={styles.tolerancia}>
      <Ionicons name="time-outline" size={22} color={colors.textoClaro} />
      <Text style={styles.secundario}>Tolerancia de 10 minutos. Si no llegas a más tardar a las {limite}, la mesa se libera para otros clientes.</Text>
    </View>

    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: yaPague }}
      onPress={() => setYaPague((v) => !v)} style={styles.consentimiento}>
      <Ionicons name={yaPague ? 'checkbox' : 'square-outline'} size={26} color={colors.textoClaro} />
      <Text style={styles.autorizacion}>Ya pagué. Hice la transferencia a una de las cuentas de la sede.</Text>
    </Pressable>

    {!!aviso && <Boton titulo="Elegir otro horario" variante="secundario" onPress={() => router.back()} />}
    <Boton titulo="Confirmar reserva" cargando={enviando}
      disabled={!yaPague || metodos.cargando || !!metodos.error || sinMetodos} onPress={confirmar} />
  </ScrollView>;
}

// Mismo estilo que Inicio: fondo de sección detrás de toda la pantalla.
export default function PagoScreen() {
  return <FondoSeccion edges={[]}><PagoScreenContenido /></FondoSeccion>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: 'transparent' },
  contenido: { padding: 16, paddingBottom: 40, gap: 14 },
  vacio: { flex: 1, backgroundColor: 'transparent', padding: 24, gap: 16, justifyContent: 'center' },
  vacioTexto: { color: colors.textoClaro, fontSize: 16, textAlign: 'center', lineHeight: 23 },
  tarjeta: { backgroundColor: colors.vidrioRespaldo, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: 14, paddingHorizontal: 16 },
  fila: { flexDirection: 'row', gap: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.vidrioBorde },
  etiqueta: { width: 78, color: colors.textoClaroSecundario, fontSize: 15 },
  valor: { flex: 1, textAlign: 'right', fontSize: 15, color: colors.textoClaro, fontWeight: '500' },
  titulo: { fontSize: 18, fontWeight: '700', color: colors.textoClaro },
  secundario: { color: colors.textoClaroSecundario, fontSize: 14, lineHeight: 21 },
  metodo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.vidrioRespaldo, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: 14, padding: 14 },
  metodoTexto: { flex: 1, gap: 2 },
  metodoTipo: { fontSize: 13, color: colors.textoClaroSecundario },
  metodoLlave: { fontSize: 17, fontWeight: '700', color: colors.textoClaro },
  copiar: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1.5, borderColor: colors.textoClaro },
  copiarTexto: { color: colors.textoClaro, fontWeight: '600', fontSize: 14 },
  tolerancia: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.vidrioRespaldo, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: 14, padding: 14 },
  consentimiento: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  autorizacion: { flex: 1, color: colors.textoClaro, fontSize: 14, lineHeight: 21 },
  error: { color: colors.errorClaro, fontSize: 14, lineHeight: 21 },
});
