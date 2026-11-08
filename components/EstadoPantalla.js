import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { sombraTexto } from '../constants/estilos';
import Boton from './Boton';

// claro (por defecto): sobre fondo-reservas.jpg o vidrio. claro={false}: sobre crema.
export default function EstadoPantalla({ cargando, mensaje, onReintentar, claro = true }) {
  return (
    <View style={[styles.contenedor, claro && styles.contenedorClaro]}>
      {cargando && <ActivityIndicator size="large" color={claro ? colors.textoClaro : colors.primario} />}
      <Text accessibilityRole={onReintentar ? 'alert' : 'text'} style={[styles.texto, claro && styles.textoClaro]}>
        {cargando ? 'Cargando…' : mensaje}
      </Text>
      {onReintentar && <Boton titulo="Reintentar" variante={claro ? 'accion' : 'primario'} onPress={onReintentar} />}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.fondo, padding: 24, gap: 16, justifyContent: 'center', alignItems: 'center' },
  contenedorClaro: { backgroundColor: 'transparent' },
  texto: { color: colors.texto, fontSize: 16, textAlign: 'center' },
  textoClaro: { color: colors.textoClaro, ...sombraTexto },
});
