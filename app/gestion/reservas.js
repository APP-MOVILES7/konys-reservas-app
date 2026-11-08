// RF-12 (mockup 08): reservas de la sede gestionada con filtros por día, mesa y estado.
// Las acciones dependen del rol: cancelar exige `reservas.gestionar`; completar,
// `reservas.completar` o `reservas.gestionar` (el mesero completa y no cancela, D-05).
// RN-06: no se borran. F3 (08b, D-06): con `reservas.gestionar` el "+" abre el local.
// F4 (RN-14, D-02): "No asistió" solo con `reservas.liberar` y pasados 10 minutos;
// `pagos.ver` muestra si la reserva tiene pago reportado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { listarTodas } from '../../services/mesas';
import { cambiarEstado, liberar, listarReservas } from '../../services/reservas';
import { fechaLocal } from '../../services/slots';
import { horaTolerancia, puedeLiberar } from '../../services/permisos';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';
import FilaReserva from '../../components/FilaReserva';

const FILTROS = { hoy: 'Hoy', manana: 'Mañana', todas: 'Todas' };
const FILTROS_ESTADO = {
  todas: 'Todos los estados', confirmada: 'Confirmadas', cancelada: 'Canceladas',
  completada: 'Completadas', no_asistio: 'No asistió',
};

function sumarDia(dias) {
  const ahora = new Date();
  return fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias));
}

export default function ReservasScreen() {
  const { perfil, sedeGestion, puede } = useSesionPersonal();
  const sedeId = sedeGestion?.id;
  const cancela = puede('reservas.gestionar');
  const completa = puede('reservas.completar', 'reservas.gestionar');
  const libera = puede('reservas.liberar');
  const vePago = puede('pagos.ver');
  const navigation = useNavigation();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [mesas, setMesas] = useState([]);
  const [filtro, setFiltro] = useState('hoy');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [mesaId, setMesaId] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [aLiberar, setALiberar] = useState(null);
  const [ahora, setAhora] = useState(new Date());
  const solicitud = useRef(0);
  const montada = useRef(true);

  useEffect(() => {
    if (sedeGestion) navigation.setOptions({ title: `Reservas · ${sedeGestion.nombre}` });
  }, [navigation, sedeGestion]);

  // RN-14: el botón se habilita solo; un reloj corto refresca la tarjeta.
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(reloj);
  }, []);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const parametros = filtro === 'hoy' ? { fecha: fechaLocal() }
      : filtro === 'manana' ? { fecha: sumarDia(1), manana: true } : {};
    const resultado = await listarReservas({
      ...parametros, sedeId, mesaId, estado: filtroEstado === 'todas' ? null : filtroEstado,
    });
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, [filtro, filtroEstado, mesaId, sedeId]);

  // Las mesas solo sirven para el filtro; un rol sin acceso a mesas ve la lista sin ese filtro.
  useFocusEffect(useCallback(() => {
    montada.current = true;
    if (sedeId) listarTodas(sedeId).then((r) => { if (montada.current) setMesas(r.data ?? []); });
    return () => { montada.current = false; };
  }, [sedeId]));

  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['reservas.ver', 'reservas.gestionar']);
  if (guardia) return guardia;

  async function transicionar(reserva, nuevo) {
    setProcesandoId(reserva.id);
    setAviso(null);
    const resultado = nuevo === 'no_asistio' ? await liberar(reserva.id) : await cambiarEstado(reserva.id, nuevo);
    setProcesandoId(null);
    if (montada.current) {
      if (resultado.error) setAviso(resultado.error);
      else await cargar();
    }
  }

  function confirmarLiberacion() {
    const reserva = aLiberar;
    setALiberar(null);
    if (reserva) transicionar(reserva, 'no_asistio');
  }

  const chip = (elegido) => [styles.chip, elegido && styles.chipElegido];
  const chipTexto = (elegido) => [styles.chipTexto, elegido && styles.chipTextoElegido];

  return <View style={styles.pantalla}>
    <View style={styles.filtros}>
      {Object.entries(FILTROS).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
        accessibilityState={{ selected: filtro === valor }} onPress={() => setFiltro(valor)} style={chip(filtro === valor)}>
        <Text style={chipTexto(filtro === valor)}>{etiqueta}</Text>
      </Pressable>)}
    </View>
    {!!mesas.length && <ScrollView horizontal style={styles.filtrosMesaContenedor} contentContainerStyle={styles.filtrosMesa} showsHorizontalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !mesaId }} onPress={() => setMesaId(null)} style={chip(!mesaId)}>
        <Text style={chipTexto(!mesaId)}>Todas las mesas</Text>
      </Pressable>
      {mesas.map((m) => <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: mesaId === m.id }}
        onPress={() => setMesaId(m.id)} style={chip(mesaId === m.id)}>
        <Text style={chipTexto(mesaId === m.id)}>{m.nombre}</Text>
      </Pressable>)}
    </ScrollView>}
    <ScrollView horizontal style={styles.filtrosMesaContenedor} contentContainerStyle={styles.filtrosMesa} showsHorizontalScrollIndicator={false}>
      {Object.entries(FILTROS_ESTADO).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
        accessibilityState={{ selected: filtroEstado === valor }} onPress={() => setFiltroEstado(valor)} style={chip(filtroEstado === valor)}>
        <Text style={chipTexto(filtroEstado === valor)}>{etiqueta}</Text>
      </Pressable>)}
    </ScrollView>
    {!!estado.error && <Text accessibilityRole="alert" style={styles.error}>{estado.error}</Text>}
    {!!aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
    {estado.cargando ? <EstadoPantalla cargando />
      : !estado.data?.length ? <EstadoPantalla mensaje="No hay reservas para este filtro." onReintentar={cargar} />
        : <FlatList data={estado.data ?? []} keyExtractor={(r) => r.id} contentContainerStyle={styles.lista}
          onRefresh={cargar} refreshing={estado.cargando}
          renderItem={({ item }) => <FilaReserva reserva={item} procesando={procesandoId === item.id}
            puedeVerPago={vePago}
            onCancelar={cancela ? () => transicionar(item, 'cancelada') : null}
            onCompletar={completa ? () => transicionar(item, 'completada') : null}
            onLiberar={libera ? () => { setALiberar(item); } : null}
            liberarDesde={libera && item.estado === 'confirmada' && !puedeLiberar(item, perfil, ahora)
              ? horaTolerancia(item) : null} />} />}
    {cancela && <Pressable accessibilityRole="button" accessibilityLabel="Registrar reserva en el local"
      onPress={() => router.push('/gestion/reserva-form')} style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>}
    {/* 08c: la liberación no se puede deshacer. */}
    <Modal transparent visible={!!aLiberar} animationType="fade" onRequestClose={() => setALiberar(null)}>
      <View style={styles.modalFondo}>
        <View style={styles.modalCaja}>
          <Text style={styles.modalTitulo}>¿Marcar «No asistió»?</Text>
          <Text style={styles.modalTexto}>
            {aLiberar?.cliente_nombre} · {aLiberar?.mesa?.nombre ?? 'Mesa'} · {aLiberar?.hora_inicio?.slice(0, 5)}.
            La reserva pasa a No asistió y la mesa queda libre para otros clientes. No se puede deshacer.
          </Text>
          <View style={styles.modalAcciones}>
            <Pressable accessibilityRole="button" onPress={() => setALiberar(null)} style={[styles.modalBoton, styles.modalCancelar]}>
              <Text style={styles.modalCancelarTexto}>Volver</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={confirmarLiberacion} style={[styles.modalBoton, styles.modalLiberar]}>
              <Text style={styles.modalLiberarTexto}>Marcar y liberar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 100 },
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filtrosMesaContenedor: { flexGrow: 0 },
  filtrosMesa: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  error: { color: colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 16, paddingTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCaja: { width: '100%', maxWidth: 420, backgroundColor: colors.blanco, borderRadius: 16, padding: 20, gap: 12 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: colors.texto },
  modalTexto: { fontSize: 15, color: colors.texto, lineHeight: 21 },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBoton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelar: { backgroundColor: colors.fondo, borderWidth: 1, borderColor: colors.borde },
  modalCancelarTexto: { color: colors.texto, fontSize: 16, fontWeight: '600' },
  modalLiberar: { backgroundColor: colors.primario },
  modalLiberarTexto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
});
