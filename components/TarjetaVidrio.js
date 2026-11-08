// Tarjeta de vidrio para los momentos clave del cliente (sobre fondo-reservas.jpg o una foto).
// Android usa un respaldo sólido translúcido: en expo-blur 58 el desenfoque real exige envolver
// el fondo en un BlurTargetView y cuesta rendimiento en equipos modestos, y sobre este fondo
// casi uniforme apenas se nota. En iOS, "Reducir transparencia" también usa el respaldo.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../constants/colors';
import { radio } from '../constants/estilos';

function useReducirTransparencia() {
  const [reducir, setReducir] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    let vigente = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((valor) => { if (vigente) setReducir(valor); });
    const suscripcion = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReducir);
    return () => { vigente = false; suscripcion.remove(); };
  }, []);
  return reducir;
}

export default function TarjetaVidrio({ children, intensidad = 40, estilo }) {
  const reducir = useReducirTransparencia();
  if (Platform.OS === 'android' || reducir) {
    return <View style={[styles.base, styles.respaldo, estilo]}>{children}</View>;
  }
  return <BlurView intensity={intensidad} tint="dark" style={[styles.base, styles.vidrio, estilo]}>{children}</BlurView>;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderRadius: radio.tarjeta, borderWidth: 1, borderColor: colors.vidrioBorde, padding: 16 },
  vidrio: { backgroundColor: colors.vidrio },
  respaldo: { backgroundColor: colors.vidrioRespaldo },
});
