-- =====================================================================
-- 003_pagos · Fase F4 (pago simulado y ciclo de la reserva; RN-13,
-- RN-14; D-01, D-02, D-06)
--
-- Requiere 001_sedes y 002_roles.
--
-- Qué hace:
--   1. Crea metodos_pago por sede (Bre-B, Nequi, Bancolombia, otro) con RLS:
--      el cliente lee los activos de sedes activas; el personal con
--      `pagos.gestionar` los administra en su sede.
--   2. Agrega a reservas `pago_reportado`, `pago_reportado_en` y
--      `liberada_en`. El servidor sella las marcas de tiempo con un trigger.
--   3. Exige "Ya pagué" en la inserción pública (RN-13). La inserción de
--      `reservas_en_local` (con `reservas.gestionar`) queda sin esa exigencia
--      (D-06).
--   4. Agrega el estado `no_asistio` (RN-14): solo desde `confirmada`, solo
--      con `reservas.liberar` y solo después de `hora_inicio + 10 min`
--      (D-02). Al pasar a `no_asistio` la mesa queda libre porque
--      `reservas_sin_solape` y `slots_ocupados` solo cuentan `confirmada`.
--   5. Habilita la eliminación controlada de una sede (`eliminar_sede`), que
--      llega completa en esta fase porque ya existen `perfiles` y
--      `metodos_pago` (excepción aprobada a RN-06).
--
-- Impacto en seguridad (regla de seguridad 5 del proyecto):
--   * metodos_pago: nueva tabla con RLS y GRANT explícito. anon solo lee las
--     llaves activas de sedes activas (las necesita para pagar). El personal
--     con `pagos.gestionar` lee todas (también inactivas) y crea/edita/borra
--     solo en su sede. Sin `pagos.gestionar` no ve el listado de gestión.
--   * reservas: la política de inserción pública exige `pago_reportado`; la
--     de `reservas_en_local` no. `pago_reportado` es una declaración del
--     cliente (simulación, no se valida ningún pago, RNF de alcance).
--   * no_asistio: el trigger de servidor comprueba privilegio y tolerancia;
--     la política de UPDATE ya exigía uno de reservas.gestionar/completar/
--     liberar. La restricción de exclusión no cambia.
--   * eliminar_sede: SECURITY DEFINER, solo admin general, nunca la principal
--     (D-03). Es la única excepción aprobada a RN-06 (borra las reservas de la
--     sede). Solo se concede EXECUTE a authenticated.
--   * No se guardan datos de tarjetas ni CVV.
-- =====================================================================

-- 1. Métodos de pago por sede ------------------------------------------
create table public.metodos_pago (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  tipo          text not null check (tipo in ('bre-b', 'nequi', 'bancolombia', 'otro')),
  titular       text not null check (length(trim(titular)) between 2 and 80),
  llave         text not null check (length(trim(llave)) between 1 and 120),
  instrucciones text check (instrucciones is null or length(instrucciones) <= 200),
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

create index metodos_pago_sede_idx on public.metodos_pago (sede_id);

alter table public.metodos_pago enable row level security;

-- El cliente (anon) y el personal con sesión leen las llaves activas.
create policy metodos_pago_lectura_publica on public.metodos_pago
  for select to anon, authenticated
  using (activo and exists (select 1 from public.sedes s where s.id = sede_id and s.activa));

-- La gestión (incluye inactivas) exige `pagos.gestionar` en la sede.
create policy metodos_pago_personal_lectura on public.metodos_pago
  for select to authenticated
  using (public.puede('pagos.gestionar', sede_id));
create policy metodos_pago_gestion_insert on public.metodos_pago
  for insert to authenticated
  with check (public.puede('pagos.gestionar', sede_id));
create policy metodos_pago_gestion_update on public.metodos_pago
  for update to authenticated
  using (public.puede('pagos.gestionar', sede_id))
  with check (public.puede('pagos.gestionar', sede_id));
create policy metodos_pago_gestion_delete on public.metodos_pago
  for delete to authenticated
  using (public.puede('pagos.gestionar', sede_id));

revoke all on public.metodos_pago from anon, authenticated;
grant select on public.metodos_pago to anon;
grant select, insert, update, delete on public.metodos_pago to authenticated;
grant select, insert, update, delete on public.metodos_pago to service_role;

-- 2. Pago reportado y liberación en la reserva -------------------------
alter table public.reservas
  add column pago_reportado    boolean not null default false,
  add column pago_reportado_en timestamptz,
  add column liberada_en       timestamptz;

-- El servidor sella la hora del reporte de pago (D-01); la app solo manda el
-- booleano. `liberada_en` lo sella el trigger de estado (RN-14).
create or replace function public.sellar_pago_reserva()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.pago_reportado then
    if tg_op = 'INSERT' or old.pago_reportado is not true then
      new.pago_reportado_en := now();
    else
      new.pago_reportado_en := old.pago_reportado_en;
    end if;
  else
    new.pago_reportado_en := null;
  end if;
  return new;
end;
$$;

create trigger reservas_sellar_pago
before insert or update on public.reservas
for each row execute function public.sellar_pago_reserva();

-- 3. "Ya pagué" obligatorio en la reserva del cliente (RN-13) -----------
-- Se reemplaza la política pública de 002_roles: el cliente y cualquier
-- sesión que no gestione reservas en esa sede deben reportar el pago. La
-- política `reservas_en_local` (D-06) se mantiene sin esta exigencia.
drop policy reservas_insercion_publica on public.reservas;
create policy reservas_insercion_publica on public.reservas
  for insert to anon, authenticated
  with check (estado = 'confirmada' and pago_reportado);

-- Mensaje claro antes de que RLS rechace la fila. validar_reserva ya es
-- security definer y puede consultar los privilegios de quien llama.
create or replace function public.validar_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mesa     public.mesas%rowtype;
  v_horario  public.horarios%rowtype;
  v_dia      text;
  v_ahora    timestamp := (now() at time zone 'America/Bogota');
begin
  select * into v_mesa from public.mesas where id = new.mesa_id;
  if not found or not v_mesa.activa
     or not exists (select 1 from public.sedes s where s.id = v_mesa.sede_id and s.activa) then
    raise exception 'KONYS_MESA_NO_DISPONIBLE';
  end if;

  if new.num_personas > v_mesa.capacidad then
    raise exception 'KONYS_CAPACIDAD_EXCEDIDA:%', v_mesa.capacidad;
  end if;

  if (new.fecha + new.hora_inicio) < v_ahora then
    raise exception 'KONYS_FECHA_PASADA';
  end if;

  -- RN-13: la reserva del cliente exige "Ya pagué". La registrada en el local
  -- por el personal (D-06) no.
  if not new.pago_reportado
     and not public.puede('reservas.gestionar', v_mesa.sede_id) then
    raise exception 'KONYS_PAGO_REQUERIDO';
  end if;

  v_dia := (array['lunes','martes','miercoles','jueves','viernes','sabado','domingo'])
             [extract(isodow from new.fecha)::int];

  -- La jornada se busca en los horarios de la sede de la mesa.
  select * into v_horario
  from public.horarios h
  where h.sede_id = v_mesa.sede_id
    and h.dia_semana = v_dia
    and h.activo
    and new.hora_inicio >= h.hora_inicio
    and (new.hora_inicio - h.hora_inicio) + make_interval(mins => h.duracion_slot)
        <= (h.hora_fin - h.hora_inicio)
    and (extract(epoch from (new.hora_inicio - h.hora_inicio))::int
         % (h.duracion_slot * 60)) = 0
  limit 1;

  if not found then
    raise exception 'KONYS_FUERA_DE_HORARIO';
  end if;

  -- El servidor decide sede, hora de fin y estado; se ignora lo que envíe la app.
  new.sede_id  := v_mesa.sede_id;
  new.hora_fin := new.hora_inicio + make_interval(mins => v_horario.duracion_slot);
  new.estado   := 'confirmada';
  return new;
end;
$$;

-- 4. Estado no_asistio (RN-14, D-02) -----------------------------------
alter table public.reservas drop constraint reservas_estado_check;
alter table public.reservas add constraint reservas_estado_check
  check (estado in ('confirmada', 'cancelada', 'completada', 'no_asistio'));

-- Se reemplaza el trigger de 002_roles para:
--   * permitir no_asistio solo con reservas.liberar y 10 min después del inicio;
--   * sellar liberada_en en el servidor;
--   * seguir impidiendo que el personal cambie cualquier otro campo.
create or replace function public.controlar_cambio_reserva()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  -- El personal solo cambia el estado (RN-06: tampoco se borran). Las marcas
  -- de tiempo las sella el servidor.
  if (to_jsonb(new) - 'estado' - 'liberada_en') <> (to_jsonb(old) - 'estado' - 'liberada_en') then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;
  if new.estado = old.estado then
    return new;
  end if;
  if old.estado <> 'confirmada' then
    raise exception 'KONYS_TRANSICION_INVALIDA';
  end if;

  new.liberada_en := old.liberada_en;

  if new.estado = 'cancelada' then
    if not public.puede('reservas.gestionar', old.sede_id) then
      raise exception 'KONYS_SIN_PRIVILEGIO';
    end if;
  elsif new.estado = 'completada' then
    if not (public.puede('reservas.completar', old.sede_id)
            or public.puede('reservas.gestionar', old.sede_id)) then
      raise exception 'KONYS_SIN_PRIVILEGIO';
    end if;
  elsif new.estado = 'no_asistio' then
    if not public.puede('reservas.liberar', old.sede_id) then
      raise exception 'KONYS_SIN_PRIVILEGIO';
    end if;
    -- D-02: la tolerancia corre desde la hora de inicio, no desde el pago.
    if (now() at time zone 'America/Bogota')
       < (old.fecha + old.hora_inicio + interval '10 minutes') then
      raise exception 'KONYS_TOLERANCIA';
    end if;
    new.liberada_en := now();
  else
    raise exception 'KONYS_TRANSICION_INVALIDA';
  end if;

  return new;
end;
$$;

-- 5. Eliminación controlada de una sede (F2, habilitada en F4) ---------
-- Excepción aprobada a RN-06: se borran las reservas de la sede. No se
-- permite la principal (D-03). El perfil se borra; la cuenta de Auth queda
-- para una Edge Function de limpieza.
create or replace function public.eliminar_sede(p_sede_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_admin_general() then
    raise exception 'KONYS_SIN_PERMISO';
  end if;
  if exists (select 1 from public.sedes where id = p_sede_id and es_principal) then
    raise exception 'KONYS_SEDE_PRINCIPAL';
  end if;

  -- 1) Desvincular la historia: reservas de las mesas de la sede.
  delete from public.reservas
  where mesa_id in (select id from public.mesas where sede_id = p_sede_id);
  -- 2) Datos operativos de la sede.
  delete from public.metodos_pago where sede_id = p_sede_id;
  delete from public.mesas    where sede_id = p_sede_id;
  delete from public.horarios where sede_id = p_sede_id;
  delete from public.platos   where sede_id = p_sede_id;
  -- 3) Perfiles del personal de la sede.
  delete from public.perfiles where sede_id = p_sede_id;
  -- 4) La sede.
  delete from public.sedes where id = p_sede_id;
end;
$$;

revoke execute on function public.eliminar_sede(uuid) from public, anon;
grant execute on function public.eliminar_sede(uuid) to authenticated;
revoke execute on function public.sellar_pago_reserva() from public, anon, authenticated;
