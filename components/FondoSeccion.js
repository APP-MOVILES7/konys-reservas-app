// Fondo de sección a pantalla completa (fondo-reservas.jpg) para Inicio, Reservar y Confirmación.
// Encima solo van TarjetaVidrio, controles planos o texto claro (colors.textoClaro).
import { useCallback, useState } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

const FONDO = require('../assets/fondo-reservas.jpg');

// edges: bordes seguros que respeta (sin 'top' cuando la pantalla tiene encabezado).
// barraClara: íconos claros en la barra de estado mientras la pantalla está enfocada.
export default function FondoSeccion({ children, edges = ['top'], barraClara = true }) {
  const [enFoco, setEnFoco] = useState(false);
  useFocusEffect(useCallback(() => {
    setEnFoco(true);
    return () => setEnFoco(false);
  }, []));
  return <ImageBackground source={FONDO} resizeMode="cover" style={styles.fondo}>
    {barraClara && enFoco && <StatusBar style="light" />}
    <SafeAreaView style={styles.area} edges={edges}>{children}</SafeAreaView>
  </ImageBackground>;
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.primario },
  area: { flex: 1 },
});
