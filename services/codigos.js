// F5 (RF-25, RN-15): código legible de la reserva. El cliente lo ve en la confirmación
// (03) y lo usa para calificar (17). Se genera en la app y viaja en el INSERT para poder
// mostrarlo sin leer reservas (anon no puede); la tabla lo respalda con un valor por
// defecto y una restricción de unicidad.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones

export const LONGITUD_CODIGO = 8;

export function generarCodigoReserva() {
  let codigo = '';
  for (let i = 0; i < LONGITUD_CODIGO; i += 1) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return codigo;
}

export function normalizarCodigo(codigo) {
  return String(codigo ?? '').trim().toUpperCase();
}
