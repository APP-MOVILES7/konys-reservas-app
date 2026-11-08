// F4 (I-06, D-01): métodos de pago simulados de cada sede (mockups 02c, 16 y 16b).
// El cliente lee solo los activos; el personal con `pagos.gestionar` administra todos
// los de su sede. La RLS de 003_pagos decide; la app solo muestra lo permitido.
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,sede_id,tipo,titular,llave,instrucciones,activo';

export function listarActivos(sedeId) {
  return consultar(() => supabase.from('metodos_pago').select(columnas)
    .eq('sede_id', sedeId).eq('activo', true).order('creado_en'));
}

export function listarTodos(sedeId) {
  return consultar(() => supabase.from('metodos_pago').select(columnas)
    .eq('sede_id', sedeId).order('creado_en'));
}

export function obtener(id) {
  return consultar(() => supabase.from('metodos_pago').select(columnas).eq('id', id).maybeSingle());
}

export function crear(metodo) {
  return consultar(() => supabase.from('metodos_pago')
    .insert({
      sede_id: metodo.sede_id,
      tipo: metodo.tipo,
      titular: String(metodo.titular ?? '').trim(),
      llave: String(metodo.llave ?? '').trim(),
      instrucciones: String(metodo.instrucciones ?? '').trim() || null,
      activo: metodo.activo !== false,
    }).select(columnas).single());
}

export function actualizar(id, cambios) {
  const datos = {};
  if (cambios.tipo !== undefined) datos.tipo = cambios.tipo;
  if (cambios.titular !== undefined) datos.titular = String(cambios.titular).trim();
  if (cambios.llave !== undefined) datos.llave = String(cambios.llave).trim();
  if (cambios.instrucciones !== undefined) {
    const texto = cambios.instrucciones == null ? '' : String(cambios.instrucciones);
    datos.instrucciones = texto.trim() || null;
  }
  if (cambios.activo !== undefined) datos.activo = Boolean(cambios.activo);
  return consultar(() => supabase.from('metodos_pago')
    .update(datos).eq('id', id).select(columnas).single());
}

export function cambiarEstado(id, activo) {
  return actualizar(id, { activo });
}

// Igual que mesas.borrar: se pide la fila borrada para detectar 0 filas.
export async function eliminar(id) {
  const resultado = await consultar(() => supabase.from('metodos_pago').delete().eq('id', id).select('id'));
  if (!resultado.error && (resultado.data ?? []).length === 0) {
    return { data: null, error: 'No se pudo eliminar el método de pago. Actualiza la lista e inténtalo de nuevo.' };
  }
  return resultado;
}
