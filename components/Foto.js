import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';

// Si hay foto_url se usa; si falla o no existe, cae en la foto local del asset.
function Imagen({ uri, fuente, nombre, estilo }) {
  const [fallo, setFallo] = useState(false);
  if (!fallo && uri) {
    return <Image source={{ uri }} accessibilityLabel={nombre} style={[styles.foto, estilo]} onError={() => setFallo(true)} />;
  }
  if (fuente) return <Image source={fuente} accessibilityLabel={nombre} style={[styles.foto, estilo]} />;
  return <View style={[styles.foto, estilo]}><Ionicons name="image-outline" size={28} color={colors.secundario} /></View>;
}

// estilo: cambia el tamaño (por ejemplo, foto grande en la carta).
export default function Foto({ uri, fuente, nombre, estilo }) {
  return <Imagen key={`${uri || 'sin-url'}|${fuente || 'sin-foto'}`} uri={uri} fuente={fuente} nombre={nombre} estilo={estilo} />;
}

const styles = StyleSheet.create({
  foto: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.fondo, justifyContent: 'center', alignItems: 'center' },
});