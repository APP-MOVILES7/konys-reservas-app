// Paleta Konys — conserva los nombres originales que importan las pantallas.
// Colores de marca muestreados de los recursos oficiales (ícono, splash y fondo "RESERVAS").
// Contraste WCAG 2.1 (texto sobre fondo):
//   texto/fondo 14.5:1 · texto/blanco 17.1:1 · secundario/fondo 5.3:1 · error/fondo 6.4:1
//   blanco sobre primario 14.1:1 · primario sobre acento 5.2:1
// Ojo: texto blanco sobre acento da 2.7:1 (no cumple AA). En botones naranjas usar texto primario.

export const colors = {
  primario: '#fffefc',   // petróleo Konys: encabezados, barras, botones principales
  acento: '#EB8404',     // naranja del cono: llamados a la acción, resaltados
  fondo: '#0b323e',      // crema del queso: fondo general de pantallas
  blanco: '#565656',     // tarjetas y superficies sobre el fondo crema
  ocupado: '#CFC8BA',    // slot reservado / deshabilitado (gris cálido, contraste bajo a propósito)
  texto: '#ffffff',      // petróleo oscuro: texto principal
  secundario: '#ffffff', // verde petróleo (línea del fondo, oscurecida para cumplir AA): texto secundario
  borde: '#f3f0ec',      // bordes y separadores sobre crema
  error: '#A12424',      // se conserva: rojo de errores

  // Nuevos (opcionales, no rompen nada): para el fondo de sección y degradados
  primarioOscuro: '#0B1E25', // final del degradado del fondo "RESERVAS"
  lineaFondo: '#497A77',     // letras en contorno del fondo; solo decorativo
};

export default colors;
