// Fondo de marca (assets/fondo-reservas.jpg) para las pantallas del cliente.
// La imagen se atenúa sobre colors.fondo para no competir con el contenido.
import { ImageBackground, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

const FONDO = require('../assets/fondo-reservas.jpg');

export default function FondoApp({ children, style }) {
  return <ImageBackground source={FONDO} resizeMode="cover" style={[styles.fondo, style]} imageStyle={styles.imagen}>
    {children}
  </ImageBackground>;
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.fondo },
  imagen: { opacity: 0.45 },
});