// RF-01, RF-02: mesas activas de la sede elegida (RF-16, RN-10; mockups 01, 11 y 12).
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { sombraTexto } from '../../constants/estilos';
import { listarActivas } from '../../services/mesas';
import { useSede } from '../../hooks/SedeSeleccionada';
import Boton from '../../components/Boton';
import BotonCambiarSede from '../../components/BotonCambiarSede';
import FondoSeccion from '../../components/FondoSeccion';
import Logo from '../../components/Logo';
import MesaCard from '../../components/MesaCard';
import EstadoPantalla from '../../components/EstadoPantalla';
import TarjetaVidrio from '../../components/TarjetaVidrio';

export default function InicioScreen() {
  const { sede } = useSede();
  const sedeId = sede?.id;
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const solicitud = useRef(0);
  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarActivas(sedeId);
    if (id === solicitud.current) setEstado({ ...resultado, cargando: false });
  }, [sedeId]);
  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  // Sin sede (por ejemplo, tras recargar en desarrollo) se vuelve a elegir.
  if (!sede) return <Redirect href="/bienvenida" />;

  const reservar = (mesa) => router.push({ pathname: '/reservar/[mesaId]', params: { mesaId: mesa.id } });
  const encabezado = <View style={styles.cabecera}>
    <Logo tamano={56} />
    <View style={styles.marcaCaja}>
      <Text accessibilityRole="header" style={styles.marca}>Konys Pizza</Text>
      <View style={styles.filaIcono}>
        <Ionicons name="location-outline" size={14} color={colors.textoClaroSecundario} />
        <Text style={[styles.detalle, styles.detalleSuelto]} numberOfLines={1}>{sede.nombre}</Text>
      </View>
    </View>
    <BotonCambiarSede onPress={() => router.replace('/bienvenida')} />
  </View>;

  let cuerpo = null;
  if (estado.cargando) cuerpo = <EstadoPantalla cargando claro />;
  else if (estado.error) cuerpo = <EstadoPantalla claro mensaje={estado.error} onReintentar={cargar} />;

  return (
    <FondoSeccion>
      {cuerpo ? <View style={styles.relleno}><View style={styles.lista}>{encabezado}</View>{cuerpo}</View>
        : <FlatList contentContainerStyle={styles.lista} data={estado.data}
          keyExtractor={(mesa) => mesa.id} refreshing={estado.cargando} onRefresh={cargar}
          ListHeaderComponent={<View style={styles.encabezado}>
            {encabezado}
            <TarjetaVidrio estilo={styles.horario}>
              <View style={styles.filaIcono}>
                <Ionicons name="time-outline" size={20} color={colors.textoClaro} />
                <Text style={styles.subtitulo}>Horario de atención</Text>
              </View>
              <Text style={styles.detalle}>12:30 a 2:30 p. m. · 5:00 a 11:00 p. m.</Text>
              {!!sede.direccion && <View style={styles.filaIcono}>
                <Ionicons name="location-outline" size={14} color={colors.textoClaroSecundario} />
                <Text style={styles.detalle}>{sede.direccion}</Text>
              </View>}
              <Text style={styles.detalle}>Consulta las jornadas disponibles al reservar.</Text>
            </TarjetaVidrio>
            <Boton titulo="Reservar mesa" variante="accion" disabled={!estado.data?.length} onPress={() => reservar(estado.data[0])} />
            <Text accessibilityRole="header" style={[styles.subtitulo, styles.subtituloSuelto]}>Mesas disponibles</Text>
          </View>}
          ListEmptyComponent={<EstadoPantalla claro mensaje={`${sede.nombre} no tiene mesas disponibles por ahora.`} onReintentar={cargar} />}
          renderItem={({ item }) => <MesaCard mesa={item} onPress={() => reservar(item)} />} />}
    </FondoSeccion>
  );
}

const styles = StyleSheet.create({
  relleno: { flex: 1 },
  // En tablet el contenido no pasa de 640 px y queda centrado.
  lista: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 640, alignSelf: 'center' },
  encabezado: { gap: 16, marginBottom: 16 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  marcaCaja: { flex: 1, gap: 2 },
  marca: { fontSize: 24, fontWeight: '800', color: colors.textoClaro, ...sombraTexto },
  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  horario: { gap: 8 },
  subtitulo: { fontSize: 18, fontWeight: '700', color: colors.textoClaro },
  subtituloSuelto: sombraTexto,
  detalle: { fontSize: 14, color: colors.textoClaroSecundario, flexShrink: 1 },
  detalleSuelto: sombraTexto,
});
