-- =====================================================================
-- 004_calificaciones · Fase F5 (calificaciones por estrellas con código;
-- RF-25, RF-26; RN-15; I-05)
--
-- Requiere 001_sedes, 002_roles y 003_pagos.
--
-- Qué hace:
--   1. Agrega `codigo` a `reservas`: un código legible único que el cliente
--      ve en la confirmación (03) y usa para calificar.
--   2. Crea `calificaciones` (1 a 5 estrellas, una sola vez por reserva) con
--      RLS: solo el personal con `calificaciones.ver` lee las de su sede.
--      El cliente no toca la tabla: califica por la función.
--   3. `calificar_reserva(codigo, puntuación)`: SECURITY DEFINER. Solo
--      califica una reserva `completada` y una sola vez (RN-15). La tabla de
--      reservas sigue sin ser legible por anon.
--   4. `calificaciones_de_sede(sede, límite)`: SECURITY DEFINER. Devuelve el
--      resumen reciente (mesa, fecha y código) para el panel (18) sin exigir
--      que el rol también pueda leer las reservas.
--
-- Impacto en seguridad (regla 5 de AGENTS.md):
--   * `codigo` no añade acceso: es un identificador legible, no un permiso.
--     Su unicidad la garantiza `reservas_codigo_key`.
--   * `calificaciones`: tabla nueva con RLS y GRANT explícito. anon no tiene
--     ningún privilegio sobre la tabla (42501 si la intenta leer). El personal
--     con `calificaciones.ver` en la sede lee las suyas; el admin general,
--     todas.
--   * `calificar_reserva` es SECURITY DEFINER: escribe pese a que anon no
--     puede insertar en la tabla, pero solo tras comprobar estado `completada`
--     y sin permitir repetir la reserva (unique). No expone datos personales.
--   * `calificaciones_de_sede` comprueba `puede('calificaciones.ver', sede)`
--     dentro de la función, así que no filtra la función `puede` a anon.
--   * No cambia `reservas_sin_solape` ni el trigger de reservas.
-- =====================================================================

-- 1. Código legible en la reserva --------------------------------------
alter table public.reservas add column codigo text;

-- Backfill de las reservas existentes con un código único cada una.
update public.reservas
set codigo = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where codigo is null;

alter table public.reservas
  alter column codigo set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
alter table public.reservas alter column codigo set not null;
alter table public.reservas add constraint reservas_codigo_key unique (codigo);

-- 2. Calificaciones ----------------------------------------------------
create table public.calificaciones (
  id          uuid primary key default gen_random_uuid(),
  reserva_id  uuid not null unique references public.reservas(id) on delete cascade,
  sede_id     uuid not null references public.sedes(id) on delete restrict,
  puntuacion  smallint not null check (puntuacion between 1 and 5),
  creado_en   timestamptz not null default now()
);

create index calificaciones_sede_idx on public.calificaciones (sede_id);

alter table public.calificaciones enable row level security;

-- El personal con `calificaciones.ver` lee las calificaciones de su sede.
create policy calificaciones_personal_lectura on public.calificaciones
  for select to authenticated
  using (public.puede('calificaciones.ver', sede_id));

revoke all on public.calificaciones from anon, authenticated;
grant select on public.calificaciones to authenticated;
grant select, insert, update, delete on public.calificaciones to service_role;

-- 3. Calificar por código (RN-15) --------------------------------------
-- Devuelve un resumen (sede, mesa y fecha) para la pantalla de agradecimiento
-- (17b). No devuelve datos personales del cliente.
create or replace function public.calificar_reserva(p_codigo text, p_puntuacion smallint)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_reserva public.reservas%rowtype;
  v_sede    text;
  v_mesa    text;
begin
  if p_puntuacion is null or p_puntuacion < 1 or p_puntuacion > 5 then
    raise exception 'KONYS_PUNTUACION_INVALIDA';
  end if;

  select * into v_reserva from public.reservas where codigo = upper(trim(p_codigo));
  if not found then
    raise exception 'KONYS_RESERVA_NO_ENCONTRADA';
  end if;
  if v_reserva.estado <> 'completada' then
    raise exception 'KONYS_RESERVA_NO_COMPLETADA';
  end if;

  -- reserva_id es unique: una segunda calificación da 23505 y se traduce.
  insert into public.calificaciones (reserva_id, sede_id, puntuacion)
  values (v_reserva.id, v_reserva.sede_id, p_puntuacion);

  select s.nombre into v_sede from public.sedes s where s.id = v_reserva.sede_id;
  select m.nombre into v_mesa from public.mesas m where m.id = v_reserva.mesa_id;

  return jsonb_build_object('sede', v_sede, 'mesa', v_mesa, 'fecha', v_reserva.fecha);
end;
$$;

revoke execute on function public.calificar_reserva(text, smallint) from public;
grant execute on function public.calificar_reserva(text, smallint) to anon, authenticated;

-- 4. Resumen para el panel (18) ----------------------------------------
create or replace function public.calificaciones_de_sede(p_sede_id uuid, p_limite int default 20)
returns table (id uuid, puntuacion smallint, creado_en timestamptz, codigo text, mesa text, fecha date)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.puede('calificaciones.ver', p_sede_id) then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;
  return query
  select c.id, c.puntuacion, c.creado_en, r.codigo, m.nombre, r.fecha
  from public.calificaciones c
  join public.reservas r on r.id = c.reserva_id
  join public.mesas m on m.id = r.mesa_id
  where c.sede_id = p_sede_id
  order by c.creado_en desc
  limit greatest(1, least(coalesce(p_limite, 20), 100));
end;
$$;

revoke execute on function public.calificaciones_de_sede(uuid, int) from public, anon;
grant execute on function public.calificaciones_de_sede(uuid, int) to authenticated;
