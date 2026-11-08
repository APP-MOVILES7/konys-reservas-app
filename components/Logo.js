// Logo oficial de Konys Pizza (assets/splash-icon.png, con fondo transparente).
import { Image, StyleSheet } from 'react-native';

const LOGO = require('../assets/splash-icon.png');

export default function Logo({ tamano = 96, style }) {
  return <Image source={LOGO} resizeMode="contain" accessibilityLabel="Logo de Konys Pizza"
    style={[styles.logo, { width: tamano, height: tamano }, style]} />;
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
});