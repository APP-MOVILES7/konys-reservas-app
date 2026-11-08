// Plato de la carta: tarjeta de vidrio sobre fondo-reservas.jpg (mismo estilo que MesaCard),
// con nombre, descripción y precio a la izquierda y la foto a la derecha.
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import Foto from './Foto';
import TarjetaVidrio from './TarjetaVidrio';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function PlatoItem({ plato }) {
  return <TarjetaVidrio estilo={styles.tarjeta}>
    <View style={styles.contenido}>
      <Text style={styles.nombre}>{plato.nombre}</Text>
      {!!plato.descripcion && <Text style={styles.descripcion}>{plato.descripcion}</Text>}
      <Text style={styles.precio}>{pesos.format(plato.precio)}</Text>
    </View>
    <Foto uri={plato.foto_url} nombre={plato.nombre} />
  </TarjetaVidrio>;
}

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 12 },
  contenido: { flex: 1, gap: 5 },
  nombre: { color: colors.textoClaro, fontSize: 17, fontWeight: '700' },
  descripcion: { color: colors.textoClaroSecundario, fontSize: 14, lineHeight: 21 },
  precio: { color: colors.textoClaro, fontWeight: '800', fontSize: 16 },
});
