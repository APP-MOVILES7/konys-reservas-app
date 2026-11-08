// RF-07: carta de la sede elegida por categorías (RF-16, RN-10; mockup 04).
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { colors } from '../../constants/colors';
import { radio, sombraTexto } from '../../constants/estilos';
import { CATEGORIAS } from '../../constants/dominio';
import { listar } from '../../services/platos';
import { useSede } from '../../hooks/SedeSeleccionada';
import BotonCambiarSede from '../../components/BotonCambiarSede';
import EstadoPantalla from '../../components/EstadoPantalla';
import FondoSeccion from '../../components/FondoSeccion';
import PlatoItem from '../../components/PlatoItem';

export default function CartaScreen() {
  const { sede } = useSede();
  const sedeId = sede?.id;
  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const solicitud = useRef(0);
  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listar(sedeId);
    if (id === solicitud.current) setEstado({ ...resultado, cargando: false });
  }, [sedeId]);
  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  if (!sede) return <Redirect href="/bienvenida" />;

  // Mismo estilo que Inicio: fondo de sección y platos en tarjetas de vidrio.
  return <FondoSeccion>
    <View style={styles.cabecera}>
      <Text accessibilityRole="header" style={styles.titulo}>Carta</Text>
      {/* En la carta el botón muestra el nombre de la sede (mockup 04). */}
      <BotonCambiarSede titulo={sede.nombre} onPress={() => router.replace('/bienvenida')} />
    </View>
    <View style={styles.categoriasFila}><ScrollView horizontal contentContainerStyle={styles.categorias} showsHorizontalScrollIndicator={false}>
      {Object.entries(CATEGORIAS).map(([valor, etiqueta]) => <Pressable key={valor} onPress={() => setCategoria(valor)}
        accessibilityRole="button" accessibilityState={{ selected: categoria === valor }}
        style={[styles.chip, categoria === valor && styles.elegido]}>
        <Text style={[styles.texto, categoria === valor && styles.claro]}>{etiqueta}</Text>
      </Pressable>)}
    </ScrollView></View>
    {estado.cargando ? <EstadoPantalla cargando claro /> : estado.error ? <EstadoPantalla claro mensaje={estado.error} onReintentar={cargar} />
      : <FlatList data={(estado.data ?? []).filter((p) => p.categoria === categoria)}
        keyExtractor={(p) => p.id} contentContainerStyle={styles.lista} onRefresh={cargar} refreshing={estado.cargando}
        ListEmptyComponent={<EstadoPantalla claro mensaje="No hay platos disponibles en esta categoría." />}
        renderItem={({ item }) => <PlatoItem plato={item} />} />}
  </FondoSeccion>;
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  titulo: { fontSize: 26, fontWeight: '800', color: colors.textoClaro, ...sombraTexto },
  categoriasFila: { flexShrink: 0 },
  categorias: { padding: 16, gap: 8 },
  chip: { minHeight: 44, borderRadius: radio.boton * 2, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  elegido: { backgroundColor: colors.acento, borderColor: colors.acento },
  texto: { color: colors.texto, fontSize: 15 },
  // Categoría activa en naranja; texto primario (blanco sobre naranja no cumple AA).
  claro: { color: colors.primario, fontWeight: '700' },
  lista: { padding: 16, paddingTop: 0, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
