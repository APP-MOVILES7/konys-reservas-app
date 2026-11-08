import { Tabs } from 'expo-router/js-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';

// La pestaña Inicio vive en /inicio porque la raíz abre la bienvenida (RF-15).
// F3: sin pestaña Admin; el personal entra por la rueda de ajustes de la bienvenida (05a).
const iconos = { inicio: 'home-outline', carta: 'restaurant-outline' };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: colors.primario },
      headerTintColor: colors.primario,
      // Barra en tono vidrio (petróleo con borde translúcido) y pestaña activa en naranja (5.2:1).
      // Sin desenfoque: la barra no flota sobre el contenido y en Carta quedaría vidrio sobre crema.
      tabBarActiveTintColor: colors.acento,
      tabBarInactiveTintColor: colors.textoClaroSecundario,
      tabBarStyle: { backgroundColor: colors.primario, borderTopColor: colors.vidrioBorde, borderTopWidth: 1 },
      tabBarIcon: ({ color, size }) => <Ionicons name={iconos[route.name]} color={color} size={size} />,
    })}>
      {/* Inicio y Carta dibujan su propio encabezado con la sede y "Cambiar sede" (mockups 01 y 04). */}
      <Tabs.Screen name="inicio" options={{ title: 'Inicio', headerShown: false }} />
      <Tabs.Screen name="carta" options={{ title: 'Carta', headerShown: false }} />
    </Tabs>
  );
}
