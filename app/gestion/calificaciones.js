// F5 (mockup 18, RF-26): promedio, distribución y calificaciones recientes de la sede.
// Solo para roles con `calificaciones.ver`; la base limita a la sede del perfil.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { listarPorSede, listarPuntuaciones, promedioTexto, resumirCalificaciones } from '../../services/calificaciones';
import { leerFecha } from '../../services/slots';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';
import CalificacionEstrellas from '../../components/CalificacionEstrellas';

const FILTROS = { reciente: 'Últimos 30 días', todo: 'Todo' };

function hace30Dias() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 30);
  return fecha.toISOString();
}

const fechaCorta = (fecha) => (fecha
  ? leerFecha(fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
  : '');

export default function CalificacionesScreen() {
  const { sedeGestion: sede } = useSesionPersonal();
  const sedeId = sede?.id;
  const navigation = useNavigation();
  const [filtro, setFiltro] = useState('reciente');
  const [estado, setEstado] = useState({ cargando: true, error: null, resumen: null, recientes: [] });
  const solicitud = useRef(0);
  const montada = useRef(true);

  useEffect(() => {
    if (sede) navigation.setOptions({ title: `Calificaciones · ${sede.nombre}` });
  }, [navigation, sede]);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ cargando: true, error: null, resumen: null, recientes: [] });
    const [puntos, recientes] = await Promise.all([
      listarPuntuaciones(sedeId, { desde: filtro === 'reciente' ? hace30Dias() : null }),
      listarPorSede(sedeId),
    ]);
    if (id !== solicitud.current || !montada.current) return;
    const error = puntos.error ?? recientes.error;
    if (error) setEstado({ cargando: false, error, resumen: null, recientes: [] });
    else setEstado({ cargando: false, error: null, resumen: resumirCalificaciones(puntos.data), recientes: recientes.data ?? [] });
  }, [sedeId, filtro]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['calificaciones.ver']);
  if (guardia) return guardia;

  const resumen = estado.resumen;
  const maximo = resumen ? Math.max(1, ...resumen.conteo) : 1;

  return <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
    <View style={styles.filtros}>
      {Object.entries(FILTROS).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
        accessibilityState={{ selected: filtro === valor }} onPress={() => setFiltro(valor)}
        style={[styles.chip, filtro === valor && styles.chipElegido]}>
        <Text style={[styles.chipTexto, filtro === valor && styles.chipTextoElegido]}>{etiqueta}</Text>
      </Pressable>)}
    </View>

    {estado.cargando
      ? <EstadoPantalla cargando />
      : estado.error
        ? <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />
        : !resumen?.total
          ? <EstadoPantalla mensaje="Esta sede aún no tiene calificaciones en este periodo." />
          : <>
            <View style={styles.resumen}>
              <View style={styles.resumenIzquierda}>
                <Text style={styles.promedio}>{promedioTexto(resumen.promedio)}</Text>
                <Text style={styles.votos}>{resumen.total} voto{resumen.total === 1 ? '' : 's'}</Text>
              </View>
              <View style={styles.distribucion}>
                {[5, 4, 3, 2, 1].map((n) => <View key={n} style={styles.distribucionFila}>
                  <Text style={styles.distribucionNumero}>{n}</Text>
                  <Ionicons name="star" size={13} color={colors.acento} />
                  <View style={styles.barra}>
                    <View style={[styles.barraRelleno, { width: `${Math.round((resumen.conteo[n] / maximo) * 100)}%` }]} />
                  </View>
                  <Text style={styles.distribucionConteo}>{resumen.conteo[n]}</Text>
                </View>)}
              </View>
            </View>

            <Text accessibilityRole="header" style={styles.seccion}>Recientes</Text>
            {estado.recientes.length
              ? estado.recientes.map((c) => <View key={c.id} style={styles.tarjeta}>
                <View style={styles.tarjetaTexto}>
                  <Text style={styles.tarjetaTitulo}>{c.mesa} · {fechaCorta(c.fecha)}</Text>
                  <Text style={styles.tarjetaDetalle}>Código {c.codigo}</Text>
                </View>
                <CalificacionEstrellas valor={c.puntuacion} tamano={20} etiqueta={false} />
              </View>)
              : <Text style={styles.vacio}>Todavía no hay calificaciones recientes.</Text>}
          </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 16 },
  filtros: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 16, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  resumenIzquierda: { alignItems: 'flex-start', gap: 2 },
  promedio: { fontSize: 40, fontWeight: '800', color: colors.texto },
  votos: { fontSize: 13, color: colors.secundario },
  distribucion: { flex: 1, gap: 6 },
  distribucionFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distribucionNumero: { width: 10, textAlign: 'right', fontSize: 13, color: colors.secundario },
  barra: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.fondo, overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4, backgroundColor: colors.primario },
  distribucionConteo: { width: 20, textAlign: 'right', fontSize: 13, color: colors.texto },
  seccion: { fontSize: 18, fontWeight: '700', color: colors.texto },
  vacio: { fontSize: 14, color: colors.secundario },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  tarjetaTexto: { flex: 1, gap: 2 },
  tarjetaTitulo: { fontSize: 15, fontWeight: '600', color: colors.texto },
  tarjetaDetalle: { fontSize: 13, color: colors.secundario },
});
