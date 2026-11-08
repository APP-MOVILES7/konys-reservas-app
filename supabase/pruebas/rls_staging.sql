-- =====================================================================
-- rls_staging.sql · Revisión de RLS en staging (F6, CP-35)
--
-- Qué es: script para comprobar en el SQL Editor de konys-reservas-staging
--   que las políticas RLS aíslan los datos por sede y que cada rol solo puede
--   lo suyo. Reproduce, contra la base desplegada, lo que `banco_roles.mjs` ya
--   prueba en PostgreSQL embebido (92/92).
--
-- Cómo se usa:
--   1. Abrir el SQL Editor de konys-reservas-staging.
--   2. Pegar TODO este archivo y ejecutarlo de una sola vez.
--   3. Comparar la tabla final (`caso | esperado | obtenido`) con la columna
--      `esperado`. Todas las filas deben coincidir.
--
-- Seguridad: todo va dentro de `begin; ... rollback;`. Crea sedes, cuentas de
--   auth, perfiles y datos de prueba temporales, prueba la RLS cambiando de
--   rol (`anon` / `authenticated`) y al final hace ROLLBACK: NO deja ningún
--   dato. No toca los datos reales de staging.
--
-- Si el INSERT en `auth.users` fallara por diferencias de esquema de GoTrue,
--   ver la nota al final del archivo.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Utilidades: tabla de resultados y sonda que captura errores de RLS.
-- ---------------------------------------------------------------------
create table public._rls_check (
  caso     text primary key,
  esperado text not null,
  obtenido text
);
grant insert, select on public._rls_check to anon, authenticated;

-- Ejecuta una consulta (que debe devolver un solo valor de texto) como el rol
-- actual y guarda el resultado. Si la RLS o un trigger la rechazan, guarda el
-- error en lugar de abortar la transacción.
create or replace function public._rls_probe(p_caso text, p_esperado text, p_sql text)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v text;
begin
  begin
    execute p_sql into v;
  exception when others then
    v := sqlstate || ': ' || sqlerrm;
  end;
  insert into public._rls_check (caso, esperado, obtenido) values (p_caso, p_esperado, v);
end;
$$;
grant execute on function public._rls_probe(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. Datos de prueba (como postgres: auth.uid() es null; los triggers de
--    personal no aplican). Se crean dos sedes temporales A y B.
-- ---------------------------------------------------------------------
insert into public.sedes (nombre) values ('RLS Test A'), ('RLS Test B');

insert into public.mesas (nombre, zona, capacidad, sede_id)
select 'Mesa RLS A1', 'salon', 4, id from public.sedes where nombre = 'RLS Test A';
insert into public.mesas (nombre, zona, capacidad, sede_id)
select 'Mesa RLS B1', 'salon', 4, id from public.sedes where nombre = 'RLS Test B';

insert into public.platos (nombre, categoria, precio, sede_id)
select 'Plato RLS A', 'pizzas', 20000, id from public.sedes where nombre = 'RLS Test A';
insert into public.platos (nombre, categoria, precio, sede_id)
select 'Plato RLS B', 'pizzas', 20000, id from public.sedes where nombre = 'RLS Test B';

-- Reservas: 2027-01-04 es lunes y la jornada de la noche va de 17:00 a 23:00.
insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
select id, 'Prueba A', 2, '2027-01-04', '18:00', true, true from public.mesas where nombre = 'Mesa RLS A1';
insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
select id, 'Prueba A', 2, '2027-01-04', '20:00', true, true from public.mesas where nombre = 'Mesa RLS A1';
insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
select id, 'Prueba A', 2, '2027-01-04', '17:00', true, true from public.mesas where nombre = 'Mesa RLS A1';
insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
select id, 'Prueba B', 2, '2027-01-04', '18:00', true, true from public.mesas where nombre = 'Mesa RLS B1';
insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
select id, 'Prueba B', 2, '2027-01-04', '20:00', true, true from public.mesas where nombre = 'Mesa RLS B1';
insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
select id, 'Prueba B', 2, '2027-01-04', '17:00', true, true from public.mesas where nombre = 'Mesa RLS B1';

-- Dos reservas completadas para poder calificar.
update public.reservas set estado = 'completada'
where hora_inicio = '17:00'
  and mesa_id in (select id from public.mesas where nombre in ('Mesa RLS A1', 'Mesa RLS B1'));

insert into public.metodos_pago (sede_id, tipo, titular, llave, activo)
select id, 'nequi', 'Konys RLS A', '@rlsa', true from public.sedes where nombre = 'RLS Test A';
insert into public.metodos_pago (sede_id, tipo, titular, llave, activo)
select id, 'nequi', 'Konys RLS A', 'inactiva', false from public.sedes where nombre = 'RLS Test A';
insert into public.metodos_pago (sede_id, tipo, titular, llave, activo)
select id, 'bancolombia', 'Konys RLS B', '000-000', true from public.sedes where nombre = 'RLS Test B';

insert into public.calificaciones (reserva_id, sede_id, puntuacion)
select r.id, r.sede_id, 5 from public.reservas r
join public.mesas m on m.id = r.mesa_id
where m.nombre = 'Mesa RLS A1' and r.hora_inicio = '17:00';
insert into public.calificaciones (reserva_id, sede_id, puntuacion)
select r.id, r.sede_id, 4 from public.reservas r
join public.mesas m on m.id = r.mesa_id
where m.nombre = 'Mesa RLS B1' and r.hora_inicio = '17:00';

-- Cuentas de auth y perfiles de prueba (un rol por usuario).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'rls-admin-general@konys.test'),
  ('22222222-2222-2222-2222-222222222222', 'rls-admin-a@konys.test'),
  ('33333333-3333-3333-3333-333333333333', 'rls-recep-a@konys.test'),
  ('44444444-4444-4444-4444-444444444444', 'rls-mesero-a@konys.test'),
  ('55555555-5555-5555-5555-555555555555', 'rls-cocina-a@konys.test'),
  ('66666666-6666-6666-6666-666666666666', 'rls-recep-b@konys.test');

insert into public.perfiles (id, nombre, email, rol_id, sede_id, debe_cambiar_clave) values
  ('11111111-1111-1111-1111-111111111111', 'RLS Admin General', 'rls-admin-general@konys.test',
     (select id from public.roles where codigo = 'admin_general'), null, false),
  ('22222222-2222-2222-2222-222222222222', 'RLS Admin A', 'rls-admin-a@konys.test',
     (select id from public.roles where codigo = 'admin_sede'), (select id from public.sedes where nombre = 'RLS Test A'), false),
  ('33333333-3333-3333-3333-333333333333', 'RLS Recep A', 'rls-recep-a@konys.test',
     (select id from public.roles where codigo = 'recepcion'), (select id from public.sedes where nombre = 'RLS Test A'), false),
  ('44444444-4444-4444-4444-444444444444', 'RLS Mesero A', 'rls-mesero-a@konys.test',
     (select id from public.roles where codigo = 'mesero'), (select id from public.sedes where nombre = 'RLS Test A'), false),
  ('55555555-5555-5555-5555-555555555555', 'RLS Cocina A', 'rls-cocina-a@konys.test',
     (select id from public.roles where codigo = 'cocina'), (select id from public.sedes where nombre = 'RLS Test A'), false),
  ('66666666-6666-6666-6666-666666666666', 'RLS Recep B', 'rls-recep-b@konys.test',
     (select id from public.roles where codigo = 'recepcion'), (select id from public.sedes where nombre = 'RLS Test B'), false);

-- ---------------------------------------------------------------------
-- 2. anon (cliente sin sesión)
-- ---------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select public._rls_probe('01 anon ve las mesas activas de A y B', '2',
  $q$select count(*)::text from public.mesas where activa
     and sede_id in (select id from public.sedes where nombre in ('RLS Test A','RLS Test B'))$q$);
select public._rls_probe('02 anon NO lee reservas', 'permission denied',
  $q$select count(*)::text from public.reservas$q$);
select public._rls_probe('03 anon NO lee perfiles', 'permission denied',
  $q$select count(*)::text from public.perfiles$q$);
select public._rls_probe('04 anon NO lee calificaciones', 'permission denied',
  $q$select count(*)::text from public.calificaciones$q$);
select public._rls_probe('05 anon ve solo las llaves activas de A y B', '2',
  $q$select count(*)::text from public.metodos_pago
     where sede_id in (select id from public.sedes where nombre in ('RLS Test A','RLS Test B'))$q$);

-- ---------------------------------------------------------------------
-- 3. Admin general (todas las sedes)
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select public._rls_probe('06 admin general ve reservas de A y B', '6',
  $q$select count(*)::text from public.reservas
     where sede_id in (select id from public.sedes where nombre in ('RLS Test A','RLS Test B'))$q$);
select public._rls_probe('07 admin general ve los perfiles de A y B', '5',
  $q$select count(*)::text from public.perfiles
     where sede_id in (select id from public.sedes where nombre in ('RLS Test A','RLS Test B'))$q$);
select public._rls_probe('08 admin general ve las llaves de A y B (incluye inactivas)', '3',
  $q$select count(*)::text from public.metodos_pago
     where sede_id in (select id from public.sedes where nombre in ('RLS Test A','RLS Test B'))$q$);
select public._rls_probe('09 admin general NO elimina la sede principal', 'KONYS_SEDE_PRINCIPAL',
  $q$select 'ok'::text from (select public.eliminar_sede((select id from public.sedes where es_principal))) s$q$);

-- ---------------------------------------------------------------------
-- 4. Admin de sede A (solo su sede)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select public._rls_probe('10 admin de sede A ve solo las reservas de A', '3',
  $q$select count(*)::text from public.reservas
     where sede_id = (select id from public.sedes where nombre = 'RLS Test A')$q$);
select public._rls_probe('11 admin de sede A NO ve las reservas de B', '0',
  $q$select count(*)::text from public.reservas
     where sede_id = (select id from public.sedes where nombre = 'RLS Test B')$q$);
select public._rls_probe('12 admin de sede A NO ve los perfiles de B', '0',
  $q$select count(*)::text from public.perfiles
     where sede_id = (select id from public.sedes where nombre = 'RLS Test B')$q$);
select public._rls_probe('13 admin de sede A ve las llaves de A (incluye inactiva)', '2',
  $q$select count(*)::text from public.metodos_pago
     where sede_id = (select id from public.sedes where nombre = 'RLS Test A')$q$);
select public._rls_probe('14 admin de sede A NO crea sedes', 'row-level security',
  $q$with x as (insert into public.sedes (nombre) values ('RLS Test X') returning 1)
     select count(*)::text from x$q$);
select public._rls_probe('15 admin de sede A NO crea roles', 'row-level security',
  $q$with x as (insert into public.roles (codigo, nombre, alcance) values ('rls_x','RLS X','sede') returning 1)
     select count(*)::text from x$q$);
select public._rls_probe('16 admin de sede A NO edita una mesa de B', '0',
  $q$with x as (update public.mesas set capacidad = 3 where nombre = 'Mesa RLS B1' returning 1)
     select count(*)::text from x$q$);
select public._rls_probe('17 admin de sede A NO mueve su mesa a B', 'row-level security',
  $q$with x as (update public.mesas
       set sede_id = (select id from public.sedes where nombre='RLS Test B')
       where nombre = 'Mesa RLS A1' returning 1) select count(*)::text from x$q$);
select public._rls_probe('18 admin de sede A NO elimina la sede B', 'KONYS_SIN_PERMISO',
  $q$select 'ok'::text from (select public.eliminar_sede((select id from public.sedes where nombre='RLS Test B'))) s$q$);

-- ---------------------------------------------------------------------
-- 5. Recepción A
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select public._rls_probe('19 recepcion A ve solo las reservas de A', '3',
  $q$select count(*)::text from public.reservas
     where sede_id = (select id from public.sedes where nombre = 'RLS Test A')$q$);
select public._rls_probe('20 recepcion A NO ve las reservas de B', '0',
  $q$select count(*)::text from public.reservas
     where sede_id = (select id from public.sedes where nombre = 'RLS Test B')$q$);
select public._rls_probe('21 recepcion A NO ve las calificaciones de B', '0',
  $q$select count(*)::text from public.calificaciones
     where sede_id = (select id from public.sedes where nombre = 'RLS Test B')$q$);
select public._rls_probe('22 recepcion A registra en el local sin pago (A)', '1',
  $q$with x as (insert into public.reservas
       (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
       values ((select id from public.mesas where nombre='Mesa RLS A1'), 'Local', 2, '2027-01-04', '21:00', true, false)
       returning 1) select count(*)::text from x$q$);
select public._rls_probe('23 recepcion A NO registra en B sin pago', 'KONYS_PAGO_REQUERIDO',
  $q$with x as (insert into public.reservas
       (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
       values ((select id from public.mesas where nombre='Mesa RLS B1'), 'Local', 2, '2027-01-04', '22:00', true, false)
       returning 1) select count(*)::text from x$q$);
select public._rls_probe('24 recepcion A NO edita mesas', '0',
  $q$with x as (update public.mesas set capacidad = 3 where nombre = 'Mesa RLS A1' returning 1)
     select count(*)::text from x$q$);
select public._rls_probe('25 recepcion A NO borra reservas (RN-06)', 'permission denied',
  $q$with x as (delete from public.reservas
       where sede_id = (select id from public.sedes where nombre = 'RLS Test A') returning 1)
     select count(*)::text from x$q$);

-- ---------------------------------------------------------------------
-- 6. Mesero A
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);

select public._rls_probe('26 mesero A NO ve las reservas de B', '0',
  $q$select count(*)::text from public.reservas
     where sede_id = (select id from public.sedes where nombre = 'RLS Test B')$q$);
select public._rls_probe('27 mesero A completa una reserva de A', '1',
  $q$with x as (update public.reservas set estado = 'completada'
       where hora_inicio = '20:00'
         and sede_id = (select id from public.sedes where nombre = 'RLS Test A') returning 1)
     select count(*)::text from x$q$);
select public._rls_probe('28 mesero A NO cancela reservas', 'KONYS_SIN_PRIVILEGIO',
  $q$with x as (update public.reservas set estado = 'cancelada'
       where hora_inicio = '18:00'
         and sede_id = (select id from public.sedes where nombre = 'RLS Test A') returning 1)
     select count(*)::text from x$q$);

-- ---------------------------------------------------------------------
-- 7. Cocina A (auxiliar)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

select public._rls_probe('29 cocina A NO lee reservas', '0',
  $q$select count(*)::text from public.reservas
     where sede_id in (select id from public.sedes where nombre in ('RLS Test A','RLS Test B'))$q$);
select public._rls_probe('30 cocina A NO lee calificaciones', '0',
  $q$select count(*)::text from public.calificaciones$q$);
select public._rls_probe('31 cocina A marca agotado un plato de A', '1',
  $q$with x as (update public.platos set disponible = false where nombre = 'Plato RLS A' returning 1)
     select count(*)::text from x$q$);
select public._rls_probe('32 cocina A NO cambia el precio', 'KONYS_SIN_PRIVILEGIO',
  $q$with x as (update public.platos set precio = 1 where nombre = 'Plato RLS A' returning 1)
     select count(*)::text from x$q$);
select public._rls_probe('33 cocina A NO crea platos en B', 'row-level security',
  $q$with x as (insert into public.platos (nombre, categoria, precio, sede_id)
       values ('X','pizzas',1,(select id from public.sedes where nombre='RLS Test B')) returning 1)
     select count(*)::text from x$q$);

-- ---------------------------------------------------------------------
-- 8. Recepción B (otra sede)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);

select public._rls_probe('34 recepcion B NO ve las reservas de A', '0',
  $q$select count(*)::text from public.reservas
     where sede_id = (select id from public.sedes where nombre = 'RLS Test A')$q$);
select public._rls_probe('35 recepcion B ve solo las reservas de B', '3',
  $q$select count(*)::text from public.reservas
     where sede_id = (select id from public.sedes where nombre = 'RLS Test B')$q$);

-- ---------------------------------------------------------------------
-- 9. anon inserta (al final, para no alterar los conteos de arriba)
-- ---------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select public._rls_probe('36 anon inserta reserva con "Ya pague"', '1',
  $q$with x as (insert into public.reservas
       (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
       values ((select id from public.mesas where nombre='Mesa RLS B1'), 'Prueba', 2, '2027-01-04', '19:00', true, true)
       returning 1) select count(*)::text from x$q$);
select public._rls_probe('37 anon NO reserva sin "Ya pague"', 'KONYS_PAGO_REQUERIDO',
  $q$with x as (insert into public.reservas
       (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, acepta_tratamiento_datos, pago_reportado)
       values ((select id from public.mesas where nombre='Mesa RLS B1'), 'Prueba', 2, '2027-01-04', '21:00', true, false)
       returning 1) select count(*)::text from x$q$);

-- ---------------------------------------------------------------------
-- 10. Comprobación estructural (como postgres) y resultado
-- ---------------------------------------------------------------------
reset role;

select public._rls_probe('38 RLS activo en todas las tablas', 'true',
  $q$select bool_and(relrowsecurity)::text from pg_class
     where relnamespace = 'public'::regnamespace and relkind = 'r'
       and relname in ('sedes','mesas','horarios','platos','reservas','metodos_pago',
                       'roles','privilegios','rol_privilegios','perfiles','calificaciones')$q$);

select caso, esperado, obtenido from public._rls_check order by caso;

rollback;

-- =====================================================================
-- Nota: si el INSERT en `auth.users` falla (diferencias de esquema de
-- GoTrue), haz lo siguiente y vuelve a ejecutar:
--   1. En Authentication → Add user crea 6 cuentas confirmadas.
--   2. Copia su `id` y reemplaza los UUID de ejemplo de este script.
--   3. Ajusta los correos de `auth.users` y de `perfiles`.
-- Los resultados de las sondas deben seguir coincidiendo con `esperado`.
-- =====================================================================
