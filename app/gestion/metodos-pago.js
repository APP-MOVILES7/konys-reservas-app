// F4 (mockup 16): métodos de pago de la sede. El cliente ve los activos en 02c; aquí el
// personal con `pagos.gestionar` los crea, edita, activa o desactiva y elimina.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import FondoSeccion from '../../components/FondoSeccion';
import { TIPOS_PAGO } from '../../constants/dominio';
import { cambiarEstado, eliminar, listarTodos } from '../../services/metodosPago';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';

const etiquetaTipo = (tipo) => (tipo === 'bre-b' ? 'Llave Bre-B' : TIPOS_PAGO[tipo] ?? 'Otro');

function MetodosPagoScreenContenido() {
  const { sedeGestion: sede } = useSesionPersonal();
  const sedeId = sede?.id;
  const navigation = useNavigation();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  useEffect(() => {
    if (sede) navigation.setOptions({ title: `Métodos de pago · ${sede.nombre}` });
  }, [navigation, sede]);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodos(sedeId);
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, [sedeId]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['pagos.gestionar']);
  if (guardia) return guardia;
  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;

  async function alternar(metodo) {
    setProcesandoId(metodo.id);
    setAviso(null);
    const resultado = await cambiarEstado(metodo.id, !metodo.activo);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  async function confirmarEliminar(metodo) {
    setAEliminar(null);
    setProcesandoId(metodo.id);
    setAviso(null);
    const resultado = await eliminar(metodo.id);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  return <View style={styles.pantalla}>
    {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
    <FlatList data={estado.data ?? []} keyExtractor={(m) => m.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListHeaderComponent={<Text style={styles.intro}>El cliente ve los métodos activos antes de confirmar su reserva.</Text>}
      ListEmptyComponent={<EstadoPantalla mensaje="Esta sede no tiene métodos de pago. Crea el primero con el botón +." />}
      renderItem={({ item }) => {
        const procesando = procesandoId === item.id;
        return <View style={[styles.fila, !item.activo && styles.inactiva]}>
          <View style={styles.filaTexto}>
            <Text style={styles.tipo}>{etiquetaTipo(item.tipo)}</Text>
            <Text style={styles.detalle}>{item.llave} · {item.titular}</Text>
            {!!item.instrucciones && <Text style={styles.detalle}>{item.instrucciones}</Text>}
            {!item.activo && <Text style={styles.detalle}>Inactivo</Text>}
          </View>
          <Switch accessibilityLabel={`${item.activo ? 'Desactivar' : 'Activar'} ${etiquetaTipo(item.tipo)}`}
            value={item.activo} disabled={procesando} onValueChange={() => alternar(item)}
            trackColor={{ true: colors.acento, false: colors.ocupado }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${etiquetaTipo(item.tipo)}`}
            disabled={procesando} onPress={() => router.push({ pathname: '/gestion/metodo-pago-form', params: { metodoId: item.id } })}
            style={styles.accion} hitSlop={8}>
            <Ionicons name="pencil-outline" size={22} color={colors.textoClaro} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${etiquetaTipo(item.tipo)}`}
            disabled={procesando} onPress={() => { setAviso(null); setAEliminar(item); }}
            style={styles.accion} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.errorClaro} />
          </Pressable>
        </View>;
      }} />
    <Pressable accessibilityRole="button" accessibilityLabel="Nuevo método de pago"
      onPress={() => router.push('/gestion/metodo-pago-form')} style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.primario} />
    </Pressable>
    <Modal transparent visible={!!aEliminar} animationType="fade" onRequestClose={() => setAEliminar(null)}>
      <View style={styles.modalFondo}>
        <View style={styles.modalCaja}>
          <Text style={styles.modalTitulo}>¿Eliminar {etiquetaTipo(aEliminar?.tipo)}?</Text>
          <Text style={styles.modalTexto}>El cliente dejará de ver esta llave. Si solo quieres ocultarla, usa el interruptor.</Text>
          <View style={styles.modalAcciones}>
            <Pressable accessibilityRole="button" onPress={() => setAEliminar(null)} style={[styles.modalBoton, styles.modalCancelar]}>
              <Text style={styles.modalCancelarTexto}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => confirmarEliminar(aEliminar)} style={[styles.modalBoton, styles.modalBorrar]}>
              <Text style={styles.modalBorrarTexto}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

// Mismo estilo que Inicio: fondo de sección detrás de toda la pantalla.
export default function MetodosPagoScreen() {
  return <FondoSeccion edges={[]}><MetodosPagoScreenContenido /></FondoSeccion>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: 'transparent' },
  intro: { fontSize: 14, color: colors.textoClaroSecundario, lineHeight: 20, marginBottom: 4 },
  aviso: { color: colors.errorClaro, fontSize: 14, textAlign: 'center', paddingHorizontal: 16, paddingTop: 12 },
  lista: { padding: 16, paddingBottom: 100, gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14, backgroundColor: colors.vidrioRespaldo, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: 14 },
  inactiva: { opacity: 0.75 },
  filaTexto: { flex: 1, gap: 3 },
  tipo: { fontSize: 16, fontWeight: '700', color: colors.textoClaro },
  detalle: { fontSize: 13, color: colors.textoClaroSecundario },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.acento, alignItems: 'center', justifyContent: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCaja: { width: '100%', maxWidth: 420, backgroundColor: colors.primario, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: 16, padding: 20, gap: 12 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: colors.textoClaro },
  modalTexto: { fontSize: 15, color: colors.textoClaro, lineHeight: 21 },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBoton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelar: { backgroundColor: colors.vidrio, borderWidth: 1, borderColor: colors.vidrioBorde },
  modalCancelarTexto: { color: colors.textoClaro, fontSize: 16, fontWeight: '600' },
  modalBorrar: { backgroundColor: colors.error },
  modalBorrarTexto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
});
