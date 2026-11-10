// F3 (mockups 05c y 05d): panel de la sede con una tarjeta por sección permitida. Reemplaza la
// barra segmentada Mesas/Horarios/Reservas de la antigua pestaña Admin.
// F4: la tarjeta "Hoy" resume las reservas del día (pago reportado y no asistió).
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import FondoSeccion from '../../components/FondoSeccion';
import { esAdminGeneral, primerNombre, tarjetasPanel } from '../../services/permisos';
import { listarReservas } from '../../services/reservas';
import { listarPuntuaciones, promedioTexto, resumirCalificaciones } from '../../services/calificaciones';
import { fechaLocal } from '../../services/slots';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EncabezadoPersonal from '../../components/EncabezadoPersonal';
import TarjetaPanel from '../../components/TarjetaPanel';

function PanelSedeScreenContenido() {
  const { perfil, sedeGestion, salir, puede } = useSesionPersonal();
  const [saliendo, setSaliendo] = useState(false);
  const [hoy, setHoy] = useState(null);
  const [errorHoy, setErrorHoy] = useState(null);
  const [promedio, setPromedio] = useState(null);
  const montada = useRef(true);
  const sedeId = sedeGestion?.id;
  const gestionaReservas = puede('reservas.gestionar');
  const veCalificaciones = puede('calificaciones.ver');

  const cargarHoy = useCallback(async () => {
    if (!sedeId || !gestionaReservas) return;
    setErrorHoy(null);
    const [reservas, puntos] = await Promise.all([
      listarReservas({ sedeId, fecha: fechaLocal() }),
      veCalificaciones ? listarPuntuaciones(sedeId) : Promise.resolve({ data: [], error: null }),
    ]);
    if (!montada.current) return;
    // RNF-09: si falla la carga, la tarjeta ofrece reintentar en vez de mostrar un resumen vacío.
    if (reservas.error) {
      setErrorHoy(reservas.error);
      return;
    }
    const datos = reservas.data ?? [];
    setHoy({
      total: datos.length,
      conPago: datos.filter((r) => r.pago_reportado).length,
      noAsistio: datos.filter((r) => r.estado === 'no_asistio').length,
    });
    // F5: promedio de la sede para la tarjeta "Hoy" (05c).
    if (veCalificaciones && !puntos.error) setPromedio(resumirCalificaciones(puntos.data ?? []).promedio);
  }, [sedeId, gestionaReservas, veCalificaciones]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    setHoy(null);
    setErrorHoy(null);
    setPromedio(null);
    cargarHoy();
    return () => { montada.current = false; };
  }, [cargarHoy]));

  const guardia = useGuardiaPersonal();
  if (guardia) return guardia;

  const general = esAdminGeneral(perfil);
  const tarjetas = tarjetasPanel(perfil);
  const detalleHoy = errorHoy
    ? `${errorHoy} Toca la tarjeta para reintentar.`
    : hoy
      ? `${hoy.total} reserva${hoy.total === 1 ? '' : 's'} · ${hoy.conPago} con pago reportado · ${hoy.noAsistio} no asistió`
      : 'Reservas de hoy';

  async function cerrarSesion() {
    setSaliendo(true);
    await salir();
    router.replace('/bienvenida');
  }

  return <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.contenido}>
      <EncabezadoPersonal nombre={primerNombre(perfil)}
        detalle={`${perfil.rol.nombre} · ${sedeGestion.nombre}${sedeGestion.activa === false ? ' (inactiva)' : ''}`}
        onSalir={cerrarSesion} saliendo={saliendo} />
      {/* Solo el admin general cambia de sede; los demás gestionan la de su perfil. */}
      {general && <Pressable accessibilityRole="button" accessibilityLabel="Cambiar la sede que se gestiona"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/panel'))} style={styles.cambiar} hitSlop={6}>
        <Ionicons name="swap-horizontal-outline" size={18} color={colors.textoClaro} />
        <Text style={styles.cambiarTexto}>Cambiar sede</Text>
      </Pressable>}
      {gestionaReservas && <TarjetaPanel titulo="Hoy" icono="today-outline" detalle={detalleHoy}
        derecha={promedio != null ? <View style={styles.promedio}>
          <Ionicons name="star" size={16} color={colors.acento} />
          <Text style={styles.promedioTexto}>{promedioTexto(promedio)}</Text>
        </View> : null}
        onPress={() => (errorHoy ? cargarHoy() : router.push('/gestion/reservas'))} />}
      {tarjetas.length
        ? <View style={styles.lista}>
          {tarjetas.map((t) => <TarjetaPanel key={t.clave} titulo={t.titulo} detalle={t.detalle} icono={t.icono}
            onPress={() => router.push(t.ruta)} />)}
        </View>
        : <View style={styles.nota}>
          <Text style={styles.secundario}>Tu rol tiene {perfil?.privilegios?.length ?? 0} permiso(s), pero ninguna sección está disponible todavía. Pide al administrador que revise tus permisos.</Text>
        </View>}
    </ScrollView>
  </SafeAreaView>;
}

// Mismo estilo que Inicio: fondo de sección detrás de toda la pantalla.
export default function PanelSedeScreen() {
  return <FondoSeccion edges={[]}><PanelSedeScreenContenido /></FondoSeccion>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: 'transparent' },
  contenido: { flexGrow: 1, padding: 16, gap: 12 },
  cambiar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44 },
  cambiarTexto: { color: colors.textoClaro, fontSize: 15, fontWeight: '600' },
  lista: { gap: 12 },
  promedio: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  promedioTexto: { fontSize: 15, fontWeight: '700', color: colors.textoClaro },
  nota: { padding: 16, backgroundColor: colors.vidrioRespaldo, borderWidth: 1, borderColor: colors.vidrioBorde, borderRadius: 14 },
  secundario: { color: colors.textoClaroSecundario, fontSize: 14, lineHeight: 21 },
});
