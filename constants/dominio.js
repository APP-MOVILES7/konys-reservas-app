export const ZONAS = { salon: 'Salón', terraza: 'Terraza' };
export const JORNADAS = { almuerzo: 'Almuerzo', noche: 'Noche' };
export const CATEGORIAS = {
  pizzas: 'Pizzas', entradas: 'Entradas', postres: 'Postres', bebidas: 'Bebidas', combos: 'Combos', otros: 'Otros',
};
export const ESTADOS = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', completada: 'Completada', no_asistio: 'No asistió',
};
// F4: tipos de método de pago (coinciden con el CHECK de metodos_pago.tipo).
export const TIPOS_PAGO = {
  'bre-b': 'Bre-B', nequi: 'Nequi', bancolombia: 'Bancolombia', otro: 'Otro',
};
// F4 (D-02, RN-14): tolerancia después de la hora de inicio para liberar la mesa.
export const MINUTOS_TOLERANCIA = 10;
// F5 (17): texto que acompaña la puntuación elegida.
export const ESTRELLAS_TEXTO = { 1: 'Muy mal', 2: 'Mal', 3: 'Regular', 4: 'Bien', 5: 'Muy bien' };
// El índice coincide con Date.getDay(). Los valores coinciden con los CHECK de SQL.
export const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
// Los valores de SQL van sin tildes; la interfaz usa estas etiquetas.
export const DIAS_LARGO = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};
export const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
export const DIAS_RESERVA = 14;
