// RF-15: bienvenida en cada arranque y selección de sede (mockups 00, 00b y 00c).
// La rueda de ajustes lleva al acceso de personal (05a, F3).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { sombraTexto } from '../constants/estilos';
import { entradaDirecta, listarActivas } from '../services/sedes';
import { useSede } from '../hooks/SedeSeleccionada';
import Boton from '../components/Boton';
import FondoApp from '../components/FondoApp';
import Footer from '../components/Footer';
import LogoMarca from '../components/LogoMarca';

// Vive mientras la app está abierta: la entrada directa solo ocurre en el arranque.
let arranqueAtendido = false;
const ESPERA_ENTRADA_MS = 1200;

export default function BienvenidaScreen() {
  const { seleccionar } = useSede();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const solicitud = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarActivas();
    if (id === solicitud.current) setEstado({ data: resultado.data ?? [], error: resultado.error, cargando: false });
  }, []);

  // Recarga al volver a la pantalla (por ejemplo, desde "Cambiar sede").
  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  // RF-16: la sede elegida queda en el contexto; Inicio, Carta y Reservar filtran por ella.
  const entrar = useCallback((sede) => {
    arranqueAtendido = true;
    seleccionar(sede);
    router.replace('/inicio');
  }, [seleccionar]);

  const directa = !estado.cargando && !estado.error && entradaDirecta(estado.data, !arranqueAtendido);
  useEffect(() => {
    if (!directa) return undefined;
    const temporizador = setTimeout(() => entrar(estado.data[0]), ESPERA_ENTRADA_MS);
    return () => clearTimeout(temporizador);
  }, [directa, entrar, estado.data]);

  let contenido;
  if (estado.cargando || directa) {
    contenido = <View style={styles.estado}>
      <ActivityIndicator size="large" color={colors.textoClaro} />
      {directa && <Text style={styles.secundario}>Entrando a {estado.data[0].nombre}…</Text>}
    </View>;
  } else if (estado.error) {
    contenido = <View style={styles.estado}>
      <Ionicons name="warning-outline" size={36} color={colors.textoClaroSecundario} />
      <Text accessibilityRole="alert" style={styles.mensaje}>{estado.error}</Text>
      <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
    </View>;
  } else if (!estado.data.length) {
    contenido = <View style={styles.estado}>
      <Ionicons name="storefront-outline" size={36} color={colors.textoClaroSecundario} />
      <Text style={styles.mensaje}>Por ahora no hay sedes disponibles para reservar. Vuelve a intentarlo más tarde.</Text>
      <Boton titulo="Actualizar" variante="secundario" onPress={cargar} />
    </View>;
  } else {
    contenido = <View style={styles.lista}>
      <Text style={styles.secundario}>Elige la sede donde quieres reservar</Text>
      {estado.data.map((sede) => <Boton key={sede.id} titulo={sede.nombre} variante="secundario" onPress={() => entrar(sede)} />)}
      {/* F5: el cliente califica con el código de su reserva sin elegir sede. */}
      <Pressable accessibilityRole="link" accessibilityLabel="Calificar mi visita"
        onPress={() => router.push('/calificar')} style={styles.calificar} hitSlop={6}>
        <Ionicons name="star-outline" size={18} color={colors.textoClaro} />
        <Text style={styles.calificarTexto}>Calificar mi visita</Text>
      </Pressable>
    </View>;
  }

  return (
    <FondoApp>
      <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.contenido}>
          {/* El saludo y el logotipo ocupan el espacio libre de arriba y quedan centrados en él;
              debajo, las sedes, y al final, ajustes y pie. */}
          <View style={styles.cabecera}>
            <Text style={styles.saludo}>Bienvenido a</Text>
            <LogoMarca />
          </View>
          <View style={styles.centro}>{contenido}</View>
          <View style={styles.pie}>
            <Pressable accessibilityRole="button" accessibilityLabel="Acceso de personal" hitSlop={8}
              onPress={() => router.push('/acceso')} style={({ pressed }) => [styles.ajustes, pressed && styles.presionado]}>
              <Ionicons name="settings-outline" size={24} color={colors.textoClaro} />
            </Pressable>
            <Footer />
          </View>
        </ScrollView>
      </SafeAreaView>
    </FondoApp>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { flexGrow: 1, padding: 16, gap: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cabecera: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 16, minHeight: 200 },
  saludo: { fontSize: 20, color: colors.textoClaro, fontWeight: '500', letterSpacing: 0.5, textAlign: 'center', ...sombraTexto },
  centro: { justifyContent: 'center' },
  lista: { gap: 12 },
  calificar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, marginTop: 4 },
  calificarTexto: { fontSize: 16, color: colors.textoClaro, textDecorationLine: 'underline' },
  estado: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  secundario: { fontSize: 15, color: colors.textoClaroSecundario, textAlign: 'center' },
  mensaje: { fontSize: 15, color: colors.textoClaro, textAlign: 'center' },
  // El pie se queda con parte del espacio libre: así el logo y las sedes suben sin pegarse arriba.
  pie: { flexGrow: 0.6, justifyContent: 'flex-end', gap: 12 },
  ajustes: { alignSelf: 'flex-end', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.vidrioRespaldo, borderWidth: 1, borderColor: colors.vidrioBorde, alignItems: 'center', justifyContent: 'center' },
  presionado: { opacity: 0.7 },
});
