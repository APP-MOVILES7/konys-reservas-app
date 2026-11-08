// Tarjeta de mesa del Inicio del cliente: vidrio sobre fondo-reservas.jpg.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { ZONAS } from '../constants/dominio';
import { fotoLocalMesa } from '../constants/fotosMesas';
import Foto from './Foto';
import TarjetaVidrio from './TarjetaVidrio';

export default function MesaCard({ mesa, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${mesa.nombre}, ${ZONAS[mesa.zona]}, hasta ${mesa.capacidad} personas. Reservar mesa`}
      style={({ pressed }) => [styles.envoltura, pressed && styles.presionada]}>
      <TarjetaVidrio estilo={styles.tarjeta}>
        <Foto uri={mesa.foto_url} fuente={fotoLocalMesa(mesa.nombre)} nombre={mesa.nombre} />
        <View style={styles.contenido}>
          <Text style={styles.nombre}>{mesa.nombre}</Text>
          <Text style={styles.detalle}>{ZONAS[mesa.zona]}</Text>
          <Text style={styles.detalle}>Hasta {mesa.capacidad} personas</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textoClaroSecundario} />
      </TarjetaVidrio>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  envoltura: { marginBottom: 12 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  contenido: { flex: 1, gap: 5 },
  nombre: { fontSize: 18, fontWeight: '700', color: colors.textoClaro },
  detalle: { color: colors.textoClaroSecundario, fontSize: 14 },
  presionada: { opacity: 0.85 },
});
