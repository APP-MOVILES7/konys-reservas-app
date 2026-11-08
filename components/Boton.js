import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
import { radio } from '../constants/estilos';

// variante: 'primario' o 'accion' (naranja; toda la app va sobre fondo oscuro) y 'secundario'
// (blanco con borde). En naranja el texto es primario: blanco sobre naranja no cumple AA.
export default function Boton({ titulo, onPress, disabled = false, cargando = false, variante = 'primario' }) {
  const secundario = variante === 'secundario';
  const accion = !secundario;
  const inactivo = disabled || cargando;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo} onPress={onPress}
      style={({ pressed }) => [styles.boton, secundario && styles.secundario, accion && styles.accion,
        inactivo && (accion ? styles.accionDeshabilitado : styles.deshabilitado), pressed && styles.presionado]}>
      {cargando
        ? <ActivityIndicator color={secundario || accion ? colors.primario : colors.blanco} />
        : <Text style={[styles.texto, (secundario || accion) && styles.textoSecundario, accion && styles.textoAccion]}>{titulo}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { minHeight: 48, padding: 14, borderRadius: radio.boton, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  secundario: { backgroundColor: colors.blanco, borderWidth: 1.5, borderColor: colors.primario },
  accion: { backgroundColor: colors.acento },
  texto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
  textoSecundario: { color: colors.primario },
  textoAccion: { fontWeight: '700' },
  deshabilitado: { opacity: 0.5 },
  accionDeshabilitado: { backgroundColor: colors.ocupado },
  presionado: { opacity: 0.85 },
});
