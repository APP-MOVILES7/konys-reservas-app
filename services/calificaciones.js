// F5 (RF-25, RF-26; RN-15; I-05): calificaciones por estrellas con el código de la reserva
// (mockups 17, 17b y 18). El cliente califica por la función `calificar_reserva`; el
// personal con `calificaciones.ver` lee el resumen de su sede. La RLS de 004_calificaciones
// decide; la app solo muestra lo permitido.
import { supabase } from './supabase';
import { consultar } from './consultas';
import { normalizarCodigo } from './codigos';

// El código se normaliza igual que en la función SQL (trim + mayúsculas).
export function crearPorCodigo(codigo, puntuacion) {
  return consultar(() => supabase.rpc('calificar_reserva', {
    p_codigo: normalizarCodigo(codigo),
    p_puntuacion: Number(puntuacion),
  }));
}

// Puntuaciones de la sede (para el promedio y la distribución de 18). `desde` es un ISO
// opcional para el filtro "Últimos 30 días".
export function listarPuntuaciones(sedeId, { desde = null } = {}) {
  let consulta = supabase.from('calificaciones').select('puntuacion,creado_en').eq('sede_id', sedeId);
  if (desde) consulta = consulta.gte('creado_en', desde);
  return consultar(() => consulta);
}

// Resumen reciente con mesa, fecha y código (18). La función SQL exige el privilegio.
export function listarPorSede(sedeId, limite = 20) {
  return consultar(() => supabase.rpc('calificaciones_de_sede', { p_sede_id: sedeId, p_limite: limite }));
}

// Pura (U-08): promedio, total y conteo por estrella (índices 1 a 5).
export function resumirCalificaciones(filas = []) {
  const conteo = [0, 0, 0, 0, 0, 0];
  let suma = 0;
  for (const fila of filas ?? []) {
    const puntuacion = Number(fila?.puntuacion);
    if (Number.isInteger(puntuacion) && puntuacion >= 1 && puntuacion <= 5) {
      conteo[puntuacion] += 1;
      suma += puntuacion;
    }
  }
  const total = conteo.reduce((acumulado, valor) => acumulado + valor, 0);
  return { total, promedio: total ? suma / total : null, conteo };
}

// "4,6" con coma decimal (es-CO), o null si no hay datos.
export function promedioTexto(promedio) {
  return promedio == null ? null : promedio.toFixed(1).replace('.', ',');
}
