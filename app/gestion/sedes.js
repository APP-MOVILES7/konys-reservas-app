// RF-16: lista de sedes del administrador (mockup 13).
// La principal no muestra interruptor ni papelera (D-03). F4 (13d): una sede no principal
// se puede desactivar (reversible) o eliminar escribiendo su nombre exacto; la función
// eliminar_sede del servidor borra sus reservas y su personal (excepción aprobada a RN-06).
import { useCallback, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { cambiarEstado, eliminar, listarTodas } from '../../services/sedes';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';

export default function SedesScreen() {
  // F3: solo con sedes.gestionar (admin general).
  const { sedeGestion: sedeActual, elegirSede: seleccionar } = useSesionPersonal();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [confirmacion, setConfirmacion] = useState('');
  const solicitud = useRef(0);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodas();
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, []);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  async function alternar(sede) {
    setProcesandoId(sede.id);
    setAviso(null);
    const resultado = await cambiarEstado(sede.id, !sede.activa);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) { setAviso(resultado.error); return; }
    // Mantiene al día la sede que se está gestionando (nombre y estado).
    if (sedeActual?.id === sede.id) seleccionar(resultado.data);
    await cargar();
  }

  function abrirEliminar(sede) {
    setAviso(null);
    setConfirmacion('');
    setAEliminar(sede);
  }

  async function confirmarEliminar() {
    if (!aEliminar || confirmacion.trim() !== aEliminar.nombre) return;
    const sede = aEliminar;
    setAEliminar(null);
    setProcesandoId(sede.id);
    const resultado = await eliminar(sede.id);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) { setAviso(resultado.error); return; }
    if (sedeActual?.id === sede.id) seleccionar(null);
    await cargar();
  }

  async function desactivarEnLugar() {
    if (!aEliminar) return;
    const sede = aEliminar;
    setAEliminar(null);
    await alternar({ ...sede, activa: true });
  }

  const guardia = useGuardiaPersonal(['sedes.gestionar'], { conSede: false });
  if (guardia) return guardia;
  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;

  return <View style={styles.pantalla}>
    <FlatList data={estado.data ?? []} keyExtractor={(s) => s.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListHeaderComponent={<View style={styles.cabecera}>
        <Text style={styles.secundario}>Cada sede tiene sus mesas, horarios, carta y reservas.</Text>
        {!!aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      </View>}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay sedes registradas." />}
      ListFooterComponent={<View style={styles.nota}>
        <Text style={styles.secundario}>La sede principal no se puede desactivar ni eliminar. Desactivar una sede la oculta a los clientes y conserva sus datos; eliminarla borra sus reservas y su personal.</Text>
      </View>}
      renderItem={({ item }) => <View style={[styles.fila, !item.activa && styles.inactiva]}>
        <View style={styles.filaTexto}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          <Text style={styles.secundario}>{[item.es_principal && 'Principal', !item.activa && 'Inactiva', item.direccion].filter(Boolean).join(' · ')}</Text>
        </View>
        {!item.es_principal && <Switch accessibilityLabel={`${item.activa ? 'Desactivar' : 'Activar'} ${item.nombre}`}
          value={item.activa} disabled={procesandoId === item.id} onValueChange={() => alternar(item)}
          trackColor={{ true: colors.primario, false: colors.ocupado }} />}
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.nombre}`} disabled={procesandoId === item.id}
          onPress={() => router.push({ pathname: '/gestion/sede-form', params: { sedeId: item.id } })} style={styles.accion} hitSlop={8}>
          <Ionicons name="pencil-outline" size={22} color={colors.primario} />
        </Pressable>
        {!item.es_principal && <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.nombre}`}
          disabled={procesandoId === item.id} onPress={() => abrirEliminar(item)} style={styles.accion} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </Pressable>}
      </View>} />
    <Pressable accessibilityRole="button" accessibilityLabel="Crear sede" onPress={() => router.push('/gestion/sede-form')} style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>
    {/* 13d: la eliminación es definitiva y exige escribir el nombre exacto. */}
    <Modal transparent visible={!!aEliminar} animationType="fade" onRequestClose={() => setAEliminar(null)}>
      <View style={styles.modalFondo}>
        <View style={styles.modalCaja}>
          <Text style={styles.modalTitulo}>Eliminar «{aEliminar?.nombre}»</Text>
          <Text style={styles.modalTexto}>Se borrarán sus mesas, horarios, carta, reservas y cuentas de personal. No se puede deshacer. Si solo quieres ocultarla, desactívala.</Text>
          <Text style={styles.etiqueta}>Escribe el nombre exacto para continuar</Text>
          <TextInput accessibilityLabel="Nombre de la sede para confirmar" value={confirmacion}
            onChangeText={setConfirmacion} autoCapitalize="none" autoCorrect={false}
            style={styles.input} placeholder={aEliminar?.nombre} placeholderTextColor={colors.secundario} />
          <View style={styles.modalAcciones}>
            <Pressable accessibilityRole="button" onPress={() => setAEliminar(null)} style={[styles.modalBoton, styles.modalCancelar]}>
              <Text style={styles.modalCancelarTexto}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={desactivarEnLugar} style={[styles.modalBoton, styles.modalSecundario]}>
              <Text style={styles.modalSecundarioTexto}>Desactivar en su lugar</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={confirmacion.trim() !== aEliminar?.nombre}
            onPress={confirmarEliminar} style={[styles.modalBoton, styles.modalBorrar, confirmacion.trim() !== aEliminar?.nombre && styles.deshabilitado]}>
            <Text style={styles.modalBorrarTexto}>Eliminar definitivamente</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 100, gap: 12 },
  cabecera: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  inactiva: { opacity: 0.75 },
  filaTexto: { flex: 1, gap: 3 },
  nombre: { fontSize: 16, fontWeight: '700', color: colors.texto },
  secundario: { fontSize: 14, color: colors.secundario },
  error: { color: colors.error, fontSize: 14 },
  nota: { padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCaja: { width: '100%', maxWidth: 420, backgroundColor: colors.blanco, borderRadius: 16, padding: 20, gap: 10 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: colors.texto },
  modalTexto: { fontSize: 15, color: colors.texto, lineHeight: 21 },
  etiqueta: { fontSize: 14, color: colors.secundario },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 12, fontSize: 16, color: colors.texto },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBoton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelar: { backgroundColor: colors.fondo, borderWidth: 1, borderColor: colors.borde },
  modalCancelarTexto: { color: colors.texto, fontSize: 16, fontWeight: '600' },
  modalSecundario: { borderWidth: 1, borderColor: colors.primario },
  modalSecundarioTexto: { color: colors.primario, fontSize: 15, fontWeight: '600' },
  modalBorrar: { backgroundColor: colors.error },
  modalBorrarTexto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
  deshabilitado: { opacity: 0.45 },
});
