import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';

// Si hay foto_url se usa; si falla o no existe, cae en la foto local del asset.
function Imagen({ uri, fuente, nombre }) {
  const [fallo, setFallo] = useState(false);
  if (!fallo && uri) {
    return <Image source={{ uri }} accessibilityLabel={nombre} style={styles.foto} onError={() => setFallo(true)} />;
  }
  if (fuente) return <Image source={fuente} accessibilityLabel={nombre} style={styles.foto} />;
  return <View style={styles.foto}><Ionicons name="image-outline" size={28} color={colors.secundario} /></View>;
}

export default function Foto({ uri, fuente, nombre }) {
  return <Imagen key={`${uri || 'sin-url'}|${fuente || 'sin-foto'}`} uri={uri} fuente={fuente} nombre={nombre} />;
}

const styles = StyleSheet.create({
  foto: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.fondo, justifyContent: 'center', alignItems: 'center' },
});