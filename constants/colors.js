// Paleta Konys — conserva los nombres originales que importan las pantallas.
// Colores de marca muestreados de los recursos oficiales (ícono, splash y fondo "RESERVAS").
// Contraste WCAG 2.1 (texto sobre fondo):
//   texto/fondo 14.5:1 · texto/blanco 17.1:1 · secundario/fondo 5.3:1 · error/fondo 6.4:1
//   blanco sobre primario 14.1:1 · primario sobre acento 5.2:1 · blanco sobre error 7.5:1
// Ojo: texto blanco sobre acento da 2.7:1 (no cumple AA). En botones naranjas usar texto primario.

export const colors = {
  primario: '#0A3039',   // petróleo Konys: encabezados, barras, botones principales
  acento: '#EB8404',     // naranja del cono: solo acciones y estados activos
  fondo: '#F0ECDD',      // crema del queso: fondo general de pantallas
  blanco: '#FFFFFF',     // tarjetas y superficies sobre el fondo crema
  ocupado: '#CFC8BA',    // slot reservado / deshabilitado (gris cálido, contraste bajo a propósito)
  texto: '#0B1E25',      // petróleo oscuro: texto principal
  secundario: '#3E6764', // verde petróleo (línea del fondo, oscurecida para cumplir AA): texto secundario
  borde: '#DDD5C5',      // bordes y separadores sobre crema
  error: '#A12424',      // rojo de errores

  // Fondo de sección y degradados
  primarioOscuro: '#0B1E25', // final del degradado del fondo "RESERVAS"; también color de sombras
  lineaFondo: '#497A77',     // letras en contorno del fondo; solo decorativo

  // Vidrio: solo sobre fondo-reservas.jpg o sobre una foto, nunca sobre crema liso.
  vidrio: 'rgba(240,236,221,0.14)',
  vidrioBorde: 'rgba(240,236,221,0.28)',
  vidrioRespaldo: 'rgba(10,48,57,0.72)', // Android y "Reducir transparencia" en iOS
  // Texto sobre vidrio o sobre la imagen (peor caso medido sobre vidrio: 8.1 / 6.5 / 5.6 : 1).
  textoClaro: '#F0ECDD',
  textoClaroSecundario: '#C9D8D4',
  errorClaro: '#FFB4A8',
  // Resplandor neón de las estrellas al calificar con 4 o 5.
  neonEstrella: 'rgba(255,150,30,0.95)',
};

export default colors;
