// Fondo de marca (assets/fondo-reservas.jpg) para las pantallas del cliente.
// Bienvenida y acceso: fondo-reservas.jpg completo, como FondoSeccion pero sin área segura
// (esas pantallas ya manejan la suya).
import { ImageBackground, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

const FONDO = require('../assets/fondo-reservas.jpg');

export default function FondoApp({ children, style }) {
  return <ImageBackground source={FONDO} resizeMode="cover" style={[styles.fondo, style]}>
    {children}
  </ImageBackground>;
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.primario },
});