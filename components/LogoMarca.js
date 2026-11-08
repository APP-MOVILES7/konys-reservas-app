// Logotipo horizontal de Konys (neón, fondo transparente: assets/icon.png).
// Ocupa el 88 % del ancho de la pantalla, sin pasar de 440 px (tablet).
import { Image, StyleSheet, useWindowDimensions } from 'react-native';

const LOGO = require('../assets/icon.png');
const PROPORCION = 1798 / 624; // ancho / alto del archivo recortado

export default function LogoMarca({ style }) {
  const { width } = useWindowDimensions();
  const ancho = Math.min(width * 0.88, 440);
  return <Image source={LOGO} resizeMode="contain" accessibilityRole="header"
    accessibilityLabel="Konys, la pizza más ikónica de la ciudad"
    style={[styles.logo, { width: ancho, height: ancho / PROPORCION }, style]} />;
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
});
