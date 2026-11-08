// Banco de pruebas de RLS, roles, pagos y calificaciones (F3/F4/F5: 002_roles + 003_pagos +
// 004_calificaciones) en PostgreSQL embebido.
// No es dependencia de la app: PGlite se instala en una carpeta aparte.
//   mkdir ../banco-pg && cd ../banco-pg && npm init -y && npm i @electric-sql/pglite
//   cp ../konys-reservas-app/supabase/pruebas/banco_roles.mjs . && node banco_roles.mjs ../konys-reservas-app
// Aplica schema.sql + 001 + 002 + 003 + 004 sobre una base vacía y prueba cada rol.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.argv[2];
const leer = (r) => fs.readFileSync(path.join(raiz, r), 'utf8');
const db = await PGlite.create({ extensions: { btree_gist } });

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text unique,
    raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`);

const U = {
  admin: '00000000-0000-0000-0000-00000000000a',
  adminA: '00000000-0000-0000-0000-0000000000a1',
  recepA: '00000000-0000-0000-0000-0000000000a2',
  meseroA: '00000000-0000-0000-0000-0000000000a3',
  jefeA: '00000000-0000-0000-0000-0000000000a4',
  cocinaA: '00000000-0000-0000-0000-0000000000a5',
  nuevoA: '00000000-0000-0000-0000-0000000000a6',
  suspA: '00000000-0000-0000-0000-0000000000a7',
  recepB: '00000000-0000-0000-0000-0000000000b2',
};
await db.query(`insert into auth.users (id, email, raw_app_meta_data) values ($1, 'admin@konys.test', '{"rol":"admin"}')`, [U.admin]);

await db.exec(leer('supabase/schema.sql'));
await db.exec(leer('supabase/migrations/001_sedes.sql'));
await db.exec(leer('supabase/migrations/002_roles.sql'));
await db.exec(leer('supabase/migrations/003_pagos.sql'));
await db.exec(leer('supabase/migrations/004_calificaciones.sql'));
console.log('Migraciones 000 + 001 + 002 + 003 + 004 aplicadas.\n');

// Datos de prueba (como postgres; auth.uid() es null).
await db.exec(`
  insert into public.sedes (nombre) values ('Sede B');
  insert into public.mesas (nombre, zona, capacidad, sede_id)
    select 'Mesa B1', 'salon', 4, id from public.sedes where nombre = 'Sede B';
  insert into public.platos (nombre, categoria, precio, sede_id)
    select 'Pizza B', 'pizzas', 20000, id from public.sedes where nombre = 'Sede B';
`);
const sedeA = (await db.query(`select id from public.sedes where es_principal`)).rows[0].id;
const sedeB = (await db.query(`select id from public.sedes where nombre = 'Sede B'`)).rows[0].id;
const perfiles = [
  ['adminA', 'admin_sede', sedeA, true, false], ['recepA', 'recepcion', sedeA, true, false],
  ['meseroA', 'mesero', sedeA, true, false], ['jefeA', 'jefe_cocina', sedeA, true, false],
  ['cocinaA', 'cocina', sedeA, true, false], ['nuevoA', 'recepcion', sedeA, true, true],
  ['suspA', 'recepcion', sedeA, false, false], ['recepB', 'recepcion', sedeB, true, false],
];
for (const [k, rol, sede, activo, temp] of perfiles) {
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [U[k], `${k}@konys.test`]);
  await db.query(`insert into public.perfiles (id, nombre, email, rol_id, sede_id, activo, debe_cambiar_clave)
    values ($1, $2, $3, (select id from public.roles where codigo = $4), $5, $6, $7)`,
    [U[k], `Usuario ${k}`, `${k}@konys.test`, rol, sede, activo, temp]);
}
const mesaA = (await db.query(`select id from public.mesas where sede_id = $1 and nombre = 'Mesa 2'`, [sedeA])).rows[0].id;
const mesaB = (await db.query(`select id from public.mesas where sede_id = $1`, [sedeB])).rows[0].id;
// 2027-01-04 es lunes; la jornada de la noche va de 17:00 a 23:00.
// F4: por defecto la reserva pública reporta el pago (RN-13); el local puede no hacerlo.
const reserva = (mesa, hora, pago = true) => `insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, hora_fin, acepta_tratamiento_datos, pago_reportado)
  values ('${mesa}', 'Cliente Prueba', 2, '2027-01-04', '${hora}', '${hora}', true, ${pago})`;
await db.exec(reserva(mesaA, '18:00') + ';' + reserva(mesaB, '18:00') + ';' + reserva(mesaA, '20:00'));
const resA = (await db.query(`select id from public.reservas where mesa_id = $1 and hora_inicio = '18:00'`, [mesaA])).rows[0].id;
const resA2 = (await db.query(`select id from public.reservas where mesa_id = $1 and hora_inicio = '20:00'`, [mesaA])).rows[0].id;
const resB = (await db.query(`select id from public.reservas where mesa_id = $1`, [mesaB])).rows[0].id;
// F5: dos reservas completadas (una por sede) para probar las calificaciones por código.
await db.exec(reserva(mesaA, '17:00') + ';' + reserva(mesaB, '17:00'));
const resA3 = (await db.query(`select id from public.reservas where mesa_id = $1 and hora_inicio = '17:00'`, [mesaA])).rows[0].id;
const resB3 = (await db.query(`select id from public.reservas where mesa_id = $1 and hora_inicio = '17:00'`, [mesaB])).rows[0].id;
await db.query(`update public.reservas set estado = 'completada' where id in ($1, $2)`, [resA3, resB3]);
const codA = (await db.query(`select codigo from public.reservas where id = $1`, [resA])).rows[0].codigo;
const codA3 = (await db.query(`select codigo from public.reservas where id = $1`, [resA3])).rows[0].codigo;
const codB3 = (await db.query(`select codigo from public.reservas where id = $1`, [resB3])).rows[0].codigo;
const platoA = (await db.query(`select id from public.platos where sede_id = $1 limit 1`, [sedeA])).rows[0].id;
// F4: llaves de prueba; una inactiva para comprobar que el cliente no la ve.
await db.exec(`
  insert into public.metodos_pago (sede_id, tipo, titular, llave, activo) values
    ('${sedeA}', 'bre-b', 'Konys A', '@konysa', true),
    ('${sedeA}', 'nequi', 'Konys A', '300 000 0000', false),
    ('${sedeB}', 'bancolombia', 'Konys B', '000-000000-00', true);
`);

let fallas = 0;
// Ejecuta como un usuario dentro de una transacción que siempre se revierte.
async function como(quien, sql) {
  await db.exec('begin');
  try {
    if (quien === 'anon') await db.exec(`set local role anon`);
    else {
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [U[quien]]);
      await db.exec(`set local role authenticated`);
    }
    // Varias sentencias: exec y se toma el resultado de la última.
    const r = sql.includes(';') ? (await db.exec(sql)).at(-1) : await db.query(sql);
    return { filas: r.rows, n: r.affectedRows || r.rows.length };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec('rollback');
  }
}
async function caso(nombre, quien, sql, esperar) {
  const r = await como(quien, sql);
  let ok;
  if (typeof esperar === 'string') ok = r.error?.includes(esperar);
  else if (typeof esperar === 'number') ok = !r.error && r.n === esperar;
  else ok = !r.error && esperar(r.filas);
  if (!ok) fallas++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}${ok ? '' : `  → ${JSON.stringify(r).slice(0, 200)}`}`);
}
const cuenta = (n) => (f) => Number(f[0].n) === n;

// Migración del admin actual
await caso('admin actual quedó como admin_general', 'admin', `select public.mi_sesion() as s`,
  (f) => f[0].s.rol.codigo === 'admin_general' && f[0].s.privilegios.length === 15);

// Anónimo
await caso('anon ve mesas activas de ambas sedes', 'anon', `select count(*) n from public.mesas`, cuenta(6));
await caso('anon no lee reservas (sin GRANT)', 'anon', `select count(*) n from public.reservas`, 'permission denied');
await caso('anon reserva', 'anon', reserva(mesaB, '19:00'), 1);
await caso('anon no inserta mesas (sin GRANT)', 'anon', `insert into public.mesas (nombre, zona, capacidad, sede_id) values ('X','salon',2,'${sedeA}')`, 'permission denied');
await caso('anon no lee perfiles', 'anon', `select * from public.perfiles`, 'permission denied');
await caso('anon no ejecuta tiene_privilegio', 'anon', `select public.tiene_privilegio('mesas.ver')`, 'permission denied');
await caso('anon sigue con slots_ocupados', 'anon', `select * from public.slots_ocupados('${mesaA}', '2027-01-04')`, 2);

// Admin general
await caso('admin general ve todas las reservas', 'admin', `select count(*) n from public.reservas`, cuenta(5));
await caso('admin general crea sede', 'admin', `insert into public.sedes (nombre) values ('Sede C')`, 1);
await caso('admin general edita mesa de otra sede', 'admin', `update public.mesas set capacidad = 6 where id = '${mesaB}'`, 1);
await caso('admin general cancela reserva', 'admin', `update public.reservas set estado = 'cancelada' where id = '${resB}'`, 1);

// Admin de sede A
await caso('admin sede: 13 privilegios', 'adminA', `select public.mi_sesion() as s`, (f) => f[0].s.privilegios.length === 13);
await caso('admin sede: solo reservas de su sede', 'adminA', `select count(*) n from public.reservas`, cuenta(3));
await caso('admin sede no crea sedes', 'adminA', `insert into public.sedes (nombre) values ('Sede D')`, 'row-level security');
await caso('admin sede no edita su sede', 'adminA', `update public.sedes set telefono = '1' where id = '${sedeA}'`, 0);
await caso('admin sede no edita mesa de B', 'adminA', `update public.mesas set capacidad = 6 where id = '${mesaB}'`, 0);
await caso('admin sede no mueve mesa a B', 'adminA', `update public.mesas set sede_id = '${sedeB}' where id = '${mesaA}'`, 'row-level security');
await caso('admin sede edita horario propio', 'adminA', `update public.horarios set activo = false where sede_id = '${sedeA}' and dia_semana = 'lunes' and jornada = 'almuerzo'`, 1);
await caso('admin sede suspende mesero', 'adminA', `update public.perfiles set activo = false where id = '${U.meseroA}'`, 1);
await caso('admin sede no asciende a admin_sede', 'adminA', `update public.perfiles set rol_id = (select id from public.roles where codigo='admin_sede') where id = '${U.meseroA}'`, 'KONYS_');
await caso('admin sede no se edita a sí mismo', 'adminA', `update public.perfiles set nombre = 'Otro' where id = '${U.adminA}'`, 'KONYS_SIN_PRIVILEGIO');
await caso('admin sede no ve perfiles de B', 'adminA', `select count(*) n from public.perfiles where sede_id = '${sedeB}'`, cuenta(0));
await caso('admin sede no crea roles', 'adminA', `insert into public.roles (codigo, nombre, alcance) values ('cajero','Cajero','sede')`, 'row-level security');

// Recepción A
await caso('recepción: solo reservas de A', 'recepA', `select count(*) n from public.reservas`, cuenta(3));
await caso('recepción registra reserva en el local (A)', 'recepA', reserva(mesaA, '21:00'), 1);
await caso('recepción con sesión reserva en B como cliente con "Ya pagué"', 'recepA', `insert into public.reservas (mesa_id, cliente_nombre, num_personas, fecha, hora_inicio, hora_fin, acepta_tratamiento_datos, pago_reportado) values ('${mesaB}', 'X Y', 2, '2027-01-04', '21:00', '21:00', true, true)`, 1);
await caso('recepción cancela', 'recepA', `update public.reservas set estado = 'cancelada' where id = '${resA}'`, 1);
await caso('recepción no ve/edita reservas de B', 'recepA', `update public.reservas set estado = 'cancelada' where id = '${resB}'`, 0);
await caso('recepción no cambia la fecha', 'recepA', `update public.reservas set fecha = '2027-01-05' where id = '${resA}'`, 'KONYS_SIN_PRIVILEGIO');
await caso('recepción no borra reservas', 'recepA', `delete from public.reservas where id = '${resA}'`, 'permission denied');
await caso('recepción ve mesas de A (inactivas incluidas)', 'recepA', `select count(*) n from public.mesas where sede_id = '${sedeA}'`, cuenta(5));
await caso('recepción no edita mesas', 'recepA', `update public.mesas set capacidad = 3 where id = '${mesaA}'`, 0);
await caso('recepción no reabre una cancelada', 'admin', `update public.reservas set estado = 'cancelada' where id = '${resA}'; update public.reservas set estado = 'confirmada' where id = '${resA}'`, 'KONYS_TRANSICION_INVALIDA');

// Mesero A
await caso('mesero completa', 'meseroA', `update public.reservas set estado = 'completada' where id = '${resA}'`, 1);
await caso('mesero no cancela', 'meseroA', `update public.reservas set estado = 'cancelada' where id = '${resA}'`, 'KONYS_SIN_PRIVILEGIO');
await caso('mesero no ve la carta de gestión (solo pública)', 'meseroA', `select count(*) n from public.platos where not disponible`, cuenta(0));

// Cocina
await caso('jefe de cocina crea plato en A', 'jefeA', `insert into public.platos (nombre, categoria, precio, sede_id) values ('Nueva','pizzas',1000,'${sedeA}')`, 1);
await caso('jefe de cocina no crea en B', 'jefeA', `insert into public.platos (nombre, categoria, precio, sede_id) values ('Nueva','pizzas',1000,'${sedeB}')`, 'row-level security');
await caso('jefe de cocina cambia precio', 'jefeA', `update public.platos set precio = 1 where id = '${platoA}'`, 1);
await caso('cocina marca agotado', 'cocinaA', `update public.platos set disponible = false where id = '${platoA}'`, 1);
await caso('cocina no cambia precio', 'cocinaA', `update public.platos set precio = 1 where id = '${platoA}'`, 'KONYS_SIN_PRIVILEGIO');
await caso('cocina no crea platos', 'cocinaA', `insert into public.platos (nombre, categoria, precio, sede_id) values ('X','pizzas',1,'${sedeA}')`, 'row-level security');
await caso('cocina no lee reservas', 'cocinaA', `select count(*) n from public.reservas`, cuenta(0));

// Clave temporal, suspensión y rol oculto
await caso('clave temporal: sin acceso', 'nuevoA', `select count(*) n from public.reservas`, cuenta(0));
await caso('clave temporal: tras marcar_clave_cambiada sí accede', 'nuevoA', `select public.marcar_clave_cambiada(); select count(*) n from public.reservas`, cuenta(3));
await caso('suspendido: sin acceso', 'suspA', `select count(*) n from public.reservas`, cuenta(0));
await caso('suspendido: ve su perfil (para el aviso)', 'suspA', `select public.mi_sesion() as s`, (f) => f[0].s.activo === false);
await caso('rol oculto: sin acceso', 'admin', `update public.roles set activo = false where codigo = 'mesero'; set local request.jwt.claim.sub = '${U.meseroA}'; select count(*) n from public.reservas`, cuenta(0));

// Roles
await caso('admin general crea rol y le da privilegio', 'admin', `insert into public.roles (codigo, nombre, alcance) values ('cajero','Cajero','sede'); insert into public.rol_privilegios select id, 'reservas.ver' from public.roles where codigo = 'cajero'`, 2);
await caso('privilegio global en rol de sede', 'admin', `insert into public.rol_privilegios select id, 'sedes.gestionar' from public.roles where codigo = 'mesero'`, 'KONYS_PRIVILEGIO_GLOBAL');
await caso('no se suprime admin_general', 'admin', `delete from public.roles where codigo = 'admin_general'`, 'KONYS_ROL_PROTEGIDO');
await caso('no se editan privilegios de admin_general', 'admin', `delete from public.rol_privilegios where rol_id = (select id from public.roles where codigo='admin_general') and privilegio_id = 'pagos.ver'`, 'KONYS_ROL_PROTEGIDO');
await caso('rol con usuarios no se suprime', 'admin', `delete from public.roles where codigo = 'mesero'`, 'perfiles_rol_id_fkey');
await caso('rol sin usuarios se suprime', 'admin', `delete from public.roles where codigo = 'cocina' and false; insert into public.roles (codigo, nombre, alcance) values ('temporal','Temporal','sede'); delete from public.roles where codigo = 'temporal'`, 2);

// D-04 y alcance
{
  const r = await db.query(`select 1`).then(async () => {
    await db.exec('begin');
    try {
      await db.query(`insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'otro@konys.test')`);
      await db.query(`insert into public.perfiles (id, nombre, email, rol_id, sede_id) values ('00000000-0000-0000-0000-0000000000c1', 'Otro admin', 'otro@konys.test', (select id from public.roles where codigo='admin_sede'), '${sedeA}')`);
      return 'creado';
    } catch (e) { return e.message; } finally { await db.exec('rollback'); }
  });
  const ok = r.includes('KONYS_ADMIN_SEDE_EXISTE'); if (!ok) fallas++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} D-04: segundo admin de sede rechazado${ok ? '' : ' → ' + r}`);
}
await caso('perfil de sede sin sede', 'admin', `update public.perfiles set sede_id = null where id = '${U.meseroA}'`, 'KONYS_PERFIL_SEDE');

// Personal con sesión navegando como cliente
await caso('cocina (con sesión) reserva como cliente en B', 'cocinaA', reserva(mesaB, '21:00'), 1);
await caso('regresión: solape da 23P01', 'anon', reserva(mesaA, '18:00'), 'reservas_sin_solape');
await caso('regresión: capacidad', 'anon', reserva(mesaA, '19:00').replace(", 2, '2027", ", 9, '2027"), 'KONYS_CAPACIDAD_EXCEDIDA');

// F4: pago reportado, métodos de pago y tolerancia de 10 minutos ---------
await caso('anon no reserva sin "Ya pagué"', 'anon', reserva(mesaB, '22:00', false), 'KONYS_PAGO_REQUERIDO');
await caso('el servidor sella pago_reportado_en', 'admin',
  `${reserva(mesaB, '22:00')}; select count(*) n from public.reservas where pago_reportado_en is not null`, cuenta(6));
await caso('recepción registra en el local sin pago (D-06)', 'recepA', reserva(mesaA, '21:00', false), 1);
await caso('personal de otra sede no registra sin pago (como cliente)', 'recepA', reserva(mesaB, '21:00', false), 'KONYS_PAGO_REQUERIDO');

await caso('anon ve solo las llaves activas', 'anon', `select count(*) n from public.metodos_pago`, cuenta(2));
await caso('anon no ve llaves inactivas', 'anon', `select count(*) n from public.metodos_pago where not activo`, cuenta(0));
await caso('recepción (pagos.ver) no gestiona llaves', 'recepA', `insert into public.metodos_pago (sede_id, tipo, titular, llave) values ('${sedeA}','otro','X','Y')`, 'row-level security');
await caso('admin sede ve las llaves de su sede (incluida la inactiva)', 'adminA', `select count(*) n from public.metodos_pago where sede_id = '${sedeA}'`, cuenta(2));
await caso('admin sede no crea llave en otra sede', 'adminA', `insert into public.metodos_pago (sede_id, tipo, titular, llave) values ('${sedeB}','nequi','X','Y')`, 'row-level security');
await caso('admin sede desactiva su llave', 'adminA', `update public.metodos_pago set activo = false where sede_id = '${sedeA}' and llave = '@konysa'`, 1);
await caso('admin sede no edita la llave de otra sede', 'adminA', `update public.metodos_pago set llave = 'x' where sede_id = '${sedeB}'`, 0);
await caso('admin general gestiona llaves de cualquier sede', 'admin', `update public.metodos_pago set instrucciones = 'Muestra el comprobante' where sede_id = '${sedeB}'`, 1);

// Una reserva en el pasado (como postgres, auth.uid() nulo) para probar la tolerancia.
await db.query(`update public.reservas set fecha = '2026-01-05', hora_inicio = '20:00', hora_fin = '21:00' where id = $1`, [resA2]);
await caso('no se libera antes de los 10 minutos', 'meseroA', `update public.reservas set estado = 'no_asistio' where id = '${resA}'`, 'KONYS_TOLERANCIA');
await caso('no_asistio libera la mesa (slots_ocupados)', 'meseroA',
  `update public.reservas set estado = 'no_asistio' where id = '${resA2}'; select count(*) n from public.slots_ocupados('${mesaA}', '2026-01-05')`, cuenta(0));
await caso('no se reabre una no_asistio', 'admin',
  `update public.reservas set estado = 'no_asistio' where id = '${resA2}'; update public.reservas set estado = 'confirmada' where id = '${resA2}'`, 'KONYS_TRANSICION_INVALIDA');
await caso('cocina no libera reservas', 'cocinaA', `update public.reservas set estado = 'no_asistio' where id = '${resA2}'`, 0);

// F4: eliminación controlada de una sede (excepción a RN-06) ------------
await caso('admin de sede no elimina sedes', 'adminA', `select public.eliminar_sede('${sedeB}')`, 'KONYS_SIN_PERMISO');
await caso('no se elimina la sede principal', 'admin', `select public.eliminar_sede('${sedeA}')`, 'KONYS_SEDE_PRINCIPAL');
await caso('eliminar sede borra sus reservas', 'admin',
  `select public.eliminar_sede('${sedeB}'); select count(*) n from public.reservas where sede_id = '${sedeB}'`, cuenta(0));
await caso('eliminar sede borra sus perfiles', 'admin',
  `select public.eliminar_sede('${sedeB}'); select count(*) n from public.perfiles where sede_id = '${sedeB}'`, cuenta(0));

// F5: calificaciones por estrellas --------------------------------------
await caso('el código de reserva se genera en el servidor', 'admin', `select count(*) n from public.reservas where codigo is not null`, cuenta(5));
await caso('anon no lee la tabla de calificaciones', 'anon', `select count(*) n from public.calificaciones`, 'permission denied');
await caso('anon califica una reserva completada con su código', 'anon', `select public.calificar_reserva('${codB3}', 5::smallint)`, 1);
await caso('no se califica dos veces la misma reserva', 'anon', `select public.calificar_reserva('${codB3}', 5::smallint); select public.calificar_reserva('${codB3}', 4::smallint)`, 'calificaciones_reserva_id_key');
await caso('código inexistente no califica', 'anon', `select public.calificar_reserva('ZZZZZZZZ', 5::smallint)`, 'KONYS_RESERVA_NO_ENCONTRADA');
await caso('no se califica una reserva sin completar', 'anon', `select public.calificar_reserva('${codA}', 5::smallint)`, 'KONYS_RESERVA_NO_COMPLETADA');
await caso('puntuación fuera de rango', 'anon', `select public.calificar_reserva('${codB3}', 9::smallint)`, 'KONYS_PUNTUACION_INVALIDA');
await caso('recepción (calificaciones.ver) lee las de su sede', 'recepA',
  `select public.calificar_reserva('${codA3}', 5::smallint); select count(*) n from public.calificaciones where sede_id = '${sedeA}'`, cuenta(1));
await caso('recepción no lee calificaciones de otra sede', 'recepA', `select count(*) n from public.calificaciones where sede_id = '${sedeB}'`, cuenta(0));
await caso('cocina no lee calificaciones', 'cocinaA', `select count(*) n from public.calificaciones`, cuenta(0));
await caso('calificaciones_de_sede exige el privilegio', 'cocinaA', `select * from public.calificaciones_de_sede('${sedeA}')`, 'KONYS_SIN_PRIVILEGIO');
await caso('calificaciones_de_sede devuelve código y mesa', 'recepA',
  `select public.calificar_reserva('${codA3}', 4::smallint); select codigo from public.calificaciones_de_sede('${sedeA}')`, (f) => f[0].codigo === codA3);

console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' falla(s).'}`);
process.exit(fallas ? 1 : 0);
