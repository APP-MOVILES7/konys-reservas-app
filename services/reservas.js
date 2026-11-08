// RF-04, RF-05: disponibilidad pública y creación sin leer datos personales.
// RF-12: listado y cambio de estado para el administrador (las reservas no se borran).
import { supabase } from './supabase';
import { consultar } from './consultas';
import { traducir } from './errores';
import { obtenerActiva } from './mesas';
import { listar } from './horarios';
import { generarFechas, generarSlots } from './slots';
import { validarReserva } from './validaciones';
import { generarCodigoReserva } from './codigos';

export function slotsOcupados(mesaId, fecha) {
  return consultar(() => supabase.rpc('slots_ocupados', { p_mesa_id: mesaId, p_fecha: fecha }));
}

// F4 (D-01): la pantalla de pago crea la reserva con { pagoReportado: true }; la del personal
// puede no reportarlo (D-06). El servidor sella pago_reportado_en (003_pagos).
// La sede la decide el servidor a partir de la mesa (validar_reserva, RN-10); la app no la envía.
export async function crear(mesaId, fecha, horaInicio, form, { pagoReportado = false } = {}) {
  const mesa = await obtenerActiva(mesaId);
  if (mesa.error) return { data: null, error: mesa.error };
  if (!mesa.data) return { data: null, error: traducir({ message: 'KONYS_MESA_NO_DISPONIBLE' }) };
  const horarios = await listar(mesa.data.sede_id);
  if (horarios.error) return { data: null, error: horarios.error };
  const validacion = validarReserva(form, mesa.data.capacidad);
  if (!validacion.valido) return { data: null, error: Object.values(validacion.errores)[0] };
  const ahora = new Date();
  if (!generarFechas(horarios.data, ahora).some((d) => d.fecha === fecha && d.habilitada)) {
    return { data: null, error: traducir({ message: 'KONYS_FUERA_DE_HORARIO' }) };
  }
  const ocupados = await slotsOcupados(mesaId, fecha);
  if (ocupados.error) return { data: null, error: ocupados.error };
  const slot = generarSlots(fecha, horarios.data, ocupados.data, new Date()).find((s) => s.hora_inicio === horaInicio);
  if (!slot || slot.pasado) return { data: null, error: traducir({ message: slot ? 'KONYS_FECHA_PASADA' : 'KONYS_FUERA_DE_HORARIO' }) };
  if (slot.ocupado) return { data: null, error: traducir({ code: '23P01' }) };
  const datos = {
    mesa_id: mesaId,
    fecha,
    hora_inicio: slot.hora_inicio,
    hora_fin: slot.hora_fin,
    cliente_nombre: form.cliente_nombre.trim(),
    cliente_contacto: form.cliente_contacto?.trim() || null,
    num_personas: Number(form.num_personas),
    acepta_tratamiento_datos: true,
    pago_reportado: pagoReportado === true,
    // F5: el código se genera en la app para poder mostrarlo en 03 sin leer reservas
    // (anon no puede). La tabla lo respalda con un valor por defecto y unicidad.
    codigo: generarCodigoReserva(),
  };
  // No encadenar select: anon puede insertar, pero no leer reservas.
  const resultado = await consultar(() => supabase.from('reservas').insert(datos));
  return resultado.error ? resultado : {
    data: { ...datos, mesa_nombre: mesa.data.nombre, zona: mesa.data.zona }, error: null,
  };
}

// RF-12: el admin sí lee reservas de la sede; se trae el nombre de la mesa con un join.
// F4: incluye el pago reportado y la marca de liberación para los roles que los ven.
export function listarReservas({ sedeId, fecha = null, manana = false, mesaId = null, estado = null } = {}) {
  let consulta = supabase.from('reservas')
    .select('id,mesa_id,mesa:mesas(nombre),cliente_nombre,cliente_contacto,num_personas,fecha,hora_inicio,hora_fin,estado,pago_reportado,pago_reportado_en,liberada_en')
    .eq('sede_id', sedeId)
    .order('fecha', { ascending: !manana }).order('hora_inicio');
  if (fecha) consulta = consulta.eq('fecha', fecha);
  if (mesaId) consulta = consulta.eq('mesa_id', mesaId);
  if (estado) consulta = consulta.eq('estado', estado);
  return consultar(() => consulta);
}

// RN-06: no se borran reservas; solo cambian de estado.
export function cambiarEstado(id, estado) {
  return consultar(() => supabase.from('reservas')
    .update({ estado }).eq('id', id).select('id,estado').single());
}

// F4 (RN-14): libera la mesa marcando no_asistio. El servidor exige 10 minutos y
// `reservas.liberar`; la app solo ofrece la acción cuando corresponde.
export function liberar(id) {
  return cambiarEstado(id, 'no_asistio');
}
