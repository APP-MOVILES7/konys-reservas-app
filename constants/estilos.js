// Estilo plano compartido: radios y una sola sombra suave para tarjetas.
import { colors } from './colors';

export const radio = { tarjeta: 16, boton: 14 };

export const sombra = {
  shadowColor: colors.primarioOscuro,
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

// Texto suelto sobre fondo-reservas.jpg: la sombra lo separa de las letras en contorno.
export const sombraTexto = {
  textShadowColor: colors.primarioOscuro,
  textShadowRadius: 6,
  textShadowOffset: { width: 0, height: 1 },
};
