// F5 (17, 17b y 18): estrellas de 1 a 5. Editable cuando recibe `onChange`; si no,
// solo muestra la puntuación. Áreas táctiles de al menos 44x44 (CP-23).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { ESTRELLAS_TEXTO } from '../constants/dominio';

export default function CalificacionEstrellas({ valor = 0, onChange, tamano = 34, etiqueta = true }) {
  const editable = typeof onChange === 'function';
  const puntuacion = Number(valor) || 0;
  return <View style={styles.contenedor}>
    <View style={styles.fila} accessibilityLabel={`${puntuacion} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const activa = n <= puntuacion;
        const estrella = <Ionicons name={activa ? 'star' : 'star-outline'} size={tamano}
          color={activa ? colors.acento : colors.ocupado} />;
        return editable
          ? <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} estrella${n === 1 ? '' : 's'}`}
            accessibilityState={{ selected: activa }} onPress={() => onChange(n)} hitSlop={6}
            style={[styles.toque, { width: Math.max(44, tamano + 6), height: Math.max(44, tamano + 6) }]}>
            {estrella}
          </Pressable>
          : <View key={n} style={styles.soloLectura}>{estrella}</View>;
      })}
    </View>
    {etiqueta && editable && puntuacion >= 1 && <Text style={styles.texto}>{ESTRELLAS_TEXTO[puntuacion]}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  toque: { alignItems: 'center', justifyContent: 'center' },
  soloLectura: { paddingHorizontal: 2 },
  texto: { fontSize: 15, color: colors.secundario },
});
