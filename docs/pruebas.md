# Registro de pruebas · Konys Pizza

Fecha: 2026-10-28. Etapa 3: módulo cliente (RF-01 a RF-07).

## Verificación automática

| Comando / alcance | Resultado |
|---|---|
| `npm test -- --runInBand` | 37 pruebas aprobadas, 5 suites. |
| U-01: generación de slots | Jornadas, solapes parciales, límites contiguos, días inactivos, horas pasadas, duración variable y ventana de 14 días. |
| U-02: formulario | Límites de nombre, personas, teléfono opcional y autorización obligatoria. |
| U-03: traducción de errores | Códigos del esquema, fallos de red y mensaje seguro para errores desconocidos. |
| Servicio de reservas con Supabase simulado | Reconsulta disponibilidad; rechaza solape, capacidad actual excedida, mesa inactiva, fecha fuera de ventana y hora inválida; traduce conflicto 23P01; inserta sin `select`. |
| `npm run lint` | Sin errores ni advertencias. Incluye app, componentes, constantes, hooks y servicios con sus pruebas. |
| Exportación Android con `npx expo export --platform android --output-dir dist/etapa3-android` | Bundle Hermes generado. No equivale a probar el APK ni Expo Go. |

El comando de lint usa ESLint directamente con la configuración de Expo: el
envolvente `expo lint` permanecía abierto después de la revisión en este entorno.
Se declararon los globales de Jest para revisar también las pruebas.

No se modificó el esquema SQL ni se escribieron reservas en Supabase remoto.
Las pruebas de servicio usan respuestas simuladas; no certifican el despliegue
del esquema, las políticas RLS ni la conexión real. La vista previa visual no pudo
revisarse porque no hay un navegador conectado a las herramientas de la sesión.

## Aceptación manual (etapa 3)

Casos verificados con Expo Go en un celular real.

| Caso | Qué verificar | Estado |
|---|---|---|
| CP-01* | Inicio muestra las tarjetas de todas las mesas activas, nombre, zona, capacidad y foto opcional. | **OK** |
| CP-02 | Sin mesas activas aparece «No hay mesas disponibles». | **OK** |
| CP-03* | Tocar mesa abre Reservar con nombre y capacidad correctos. | **OK** |
| CP-04 | Días sin jornadas activas aparecen deshabilitados en el selector de 14 días. | **OK** |
| CP-05* | Slot reservado se muestra gris y no se puede tocar. | **OK** |
| CP-06 | Hoy, después de las 18:15, 17:00 y 18:00 están bloqueados. | **OK** |
| CP-07* | Reserva válida abre confirmación correcta y crea una fila en Supabase. | **OK** |
| CP-08* | Dos celulares confirman el mismo slot: solo una reserva se acepta y el segundo ve el aviso con disponibilidad actualizada. | **OK** |
| CP-09* | Personas por encima de capacidad: aviso y Confirmar deshabilitado. | **OK** |
| CP-10 | Nombre vacío o de un carácter impide confirmar; un carácter muestra aviso. | **OK** |
| CP-11* | Sin autorización de datos no se puede confirmar. | **OK** |
| CP-12 | Volver al inicio y Atrás no reabren confirmación ni formulario enviado. | **OK** |
| CP-13 | Carta filtra categorías, omite platos ocultos y muestra precios COP. | **OK** |
| CP-22* | Modo avión en Inicio, Reservar y Carta muestra error y permite Reintentar al recuperar conexión. | **OK** |
| CP-23 | Pantalla pequeña y tablet: sin cortes; teclado no tapa el formulario ni Confirmar. | **OK** |

La etapa 2 queda cubierta por CP-01 (mesas de prueba visibles en Expo Go). La etapa 3 se acepta
con CP-01 a CP-13 en celular; el módulo administrador y CP-14 a CP-21 corresponden a la etapa 4.

---

Fecha: 2026-10-29. Etapa 4: módulo administrador (RF-08 a RF-14).

## Verificación automática (etapa 4)

| Comando / alcance | Resultado |
|---|---|
| `npm test -- --runInBand` | 63 pruebas aprobadas, 5 suites. |
| U-02: formularios admin | Límites de mesa (nombre, zona, capacidad 1-20), horario (formato HH:MM, fin > inicio, duración 15-240) y plato (nombre, categoría, precio entero). |
| U-03: errores | Agregados los mensajes de Supabase Auth (clave incorrecta, correo sin confirmar, límite de intentos). |
| `npm run lint` | Sin errores ni advertencias. |

No se modificó el esquema SQL. Las políticas RLS y el rol `es_admin()` de
`supabase/schema.sql` ya soportan el panel completo; el acceso usaba
`supabase.auth.signInWithPassword` con `EXPO_PUBLIC_ADMIN_EMAIL`.
**Obsoleto desde F3:** `es_admin()` se eliminó y el acceso pasó a `app/acceso.js` con
correo y clave contra `perfiles` (sin `EXPO_PUBLIC_ADMIN_EMAIL`). Ver la sección
«2026-11-07 · F1 a F6» al final de este archivo.

## Aceptación manual (etapa 4)

Ejecutar con Expo Go en un celular real, con un usuario de Supabase que tenga
`app_metadata.rol = "admin"`. Registrar dispositivo, resultado y evidencia.
**Obsoleto desde F3:** el acceso y los roles cambiaron (ver la sección final).

| Caso | Qué verificar | Estado |
|---|---|---|
| CP-14* | Clave incorrecta muestra aviso; clave correcta abre el panel. Reabrir la app mantiene la sesión; Cerrar sesión la elimina. | **OK** |
| CP-15 | Crear mesa; nombre repetido muestra aviso; aparece en Inicio. | **OK** |
| CP-16 | Desactivar un día en Horarios: ese día queda deshabilitado para el cliente. | **OK** |
| CP-17* | Seguridad: con `set role anon`, un UPDATE en mesas desde el SQL Editor es rechazado. | **OK** |
| CP-18* | Seguridad: un SELECT a reservas con la clave anon no devuelve datos personales. | **OK** |
| CP-19 | Filtros Hoy / Mañana / Todas; cancelar libera el slot para el cliente. | **OK** |
| CP-20* | Inactivar mesa: desaparece de Inicio; borrar mesa con reservas muestra «inactívala en su lugar». | **OK** |
| CP-21 | Carta admin: crear, editar, ocultar y eliminar plato; el oculto no aparece en la carta del cliente. | **OK** |

Después de cargar la carta con `supabase/seed_carta.sql`, comprobar filtros,
descripciones y precios en la pantalla del cliente (CP-13).

## Preparación de la prueba (etapa 4)

1. Configurar `.env` según `.env.example`, sin versionar credenciales.
2. Comprobar que el esquema ya está aplicado en Supabase y contiene datos de prueba.
3. Para la etapa 4, crear el usuario administrador en Supabase (Authentication → Add user), confirmarlo y asignarle el rol:
   `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol":"admin"}' where email = 'TU_CORREO';`
   y colocar ese correo en `EXPO_PUBLIC_ADMIN_EMAIL`. Desactivar el registro público de usuarios.
   **Obsoleto desde F3:** el correo del admin general ya no va en el código; se crea su perfil
   `admin_general` y el resto del personal se crea desde la app (ver la sección final).
4. Ejecutar `npm start` y abrir el QR en Expo Go.
5. Registrar CP-01 a CP-13 (etapa 3) y CP-14 a CP-21 (etapa 4); repetir los críticos CP-05, CP-07, CP-08 y CP-09 tras cualquier ajuste de reservas.

Las pruebas con inserción real y cambios de datos se deben realizar en el
entorno de pruebas autorizado. No volver a ejecutar `schema.sql` sobre tablas
existentes para preparar estos casos: su creación de tablas no es idempotente.

---

Fecha: 2026-11-06. Corrección de defectos detectados en la aceptación manual.

## Defectos y correcciones

| Caso | Defecto observado | Causa | Corrección | Estado |
|---|---|---|---|---|
| CP-20 | El botón de borrar mesa no borraba ninguna mesa (con o sin reservas) y por eso nunca aparecía el aviso «inactívala en su lugar». | La acción dependía por completo de `Alert.alert` (confirmación y mensaje de error), único flujo de la app que usaba un diálogo nativo para ejecutar una acción. El backend sí funcionaba (el `DELETE` elimina la fila y devuelve `23503` cuando hay reservas). | `MesasPanel` usa ahora una confirmación en pantalla (`Modal`) y muestra los errores en línea; `services/mesas.borrar` pide la fila borrada con `.select('id')` para no dar por exitoso un borrado de 0 filas. | **OK** |
| CP-23 | Con Expo Go no se podía girar la pantalla a horizontal. | `app.json` fijaba `"orientation": "portrait"`. | `app.json` usa `"orientation": "default"` (permite rotar; reiniciar Metro para que tome el cambio). | **OK** |

## Verificación automática tras la corrección

| Comando | Resultado |
|---|---|
| `npm test` | **68 pruebas aprobadas, 7 suites.** Incluye `services/__tests__/mesas.test.js` (borrado con fila confirmada, conflicto `23503` y borrado de 0 filas). |
| `npm run lint` | **Sin errores ni advertencias.** |

Nota: la convención inicial del proyecto indicaba `"orientation": "portrait"`. Se prioriza
CP-23 (rotación pedida) y se actualizó la convención.

---

Fecha: 2026-11-07. Fases F1 a F6 (ideas nuevas): splash y sedes, roles y personal,
pago simulado, calificaciones e integración/seguridad.

## Verificación automática (F1–F6)

| Comando / alcance | Resultado |
|---|---|
| `npm test` | **177 pruebas aprobadas, 10 suites.** U-01 a U-08 (slots, validaciones, errores, mesas, sedes, permisos, roles/privilegios y calificaciones/códigos) y el servicio de reservas con Supabase simulado. |
| `npm run lint` | **Sin errores ni advertencias.** |
| `npx expo install --check` | **Dependencias al día** (`expo-splash-screen` en F1 y `expo-clipboard` en F4). |
| `npx expo export --platform android` | Bundle Hermes generado (F6, `entry-c404bf61…`, 3.6 MB). No equivale a probar el APK ni Expo Go. |
| `supabase/pruebas/banco_roles.mjs` | **92/92** en PostgreSQL embebido (PGlite) con `schema.sql` + `001` + `002` + `003` + `004`: RLS de cada rol, aislamiento entre sedes, pago reportado, tolerancia de 10 min, eliminación de sede y calificaciones por código. |

Las pruebas automáticas **no certifican** la conexión real con Supabase, las políticas RLS
desplegadas ni el comportamiento en un celular: eso se valida con los CP manuales.

## Acceso y roles (vigente desde F3)

1. El acceso de personal es por la **rueda de ajustes** de la bienvenida (`app/acceso.js`), con
   **correo y clave** de Supabase Auth. Ya **no** se usa `EXPO_PUBLIC_ADMIN_EMAIL`.
2. El admin general se crea como perfil `admin_general`; el resto del personal se crea desde la
   app con las Edge Functions `crear-usuario` y `eliminar-usuario` (clave temporal con cambio
   obligatorio).
3. Cada rol ve solo sus tarjetas y solo los datos de su sede (RLS).

## Aceptación manual (F1–F6)

Ejecutada con Expo Go en un celular real. **Etapa 5 cerrada (2026-11-10): CP-01 a CP-23 y
CP-25 a CP-35: OK.** El APK ya está generado (ver la sección de la etapa 6); CP-24 (repetir
CP-01, CP-07 y CP-14 sobre el APK) queda pendiente de ejecutar en el dispositivo. Registrar
dispositivo, resultado y evidencia.

| Caso | Qué verificar | Estado |
|---|---|---|
| CP-25* | F1/F2: bienvenida en cada arranque; con una sede entra sola a Inicio, con dos pide elegir; Inicio y Carta muestran sede y "Cambiar sede"; el footer solo en bienvenida y acceso. | **OK** |
| CP-26 | F2: crear/editar/desactivar una sede; la principal no se desactiva ni elimina; eliminar una no principal exige escribir su nombre. | **OK** |
| CP-27* | F3: el admin general elige sede; cada rol ve sus tarjetas; sin privilegios no entra; la clave temporal obliga a cambiarla. | **OK** |
| CP-28 | F3: crear usuario con clave temporal, primer ingreso, cambio de clave, suspender y eliminar; correo repetido da aviso. | **OK** |
| CP-29 | F3: crear rol personalizado, asignar privilegios, editar, ocultar; suprimir un rol con usuarios pide reasignarlos. | **OK** |
| CP-30 | F4: CRUD de métodos de pago; el cliente deja de ver la llave desactivada. | **OK** |
| CP-31* | F4: sin "Ya pagué" no se confirma; con la casilla la reserva se crea y 03 muestra pago reportado, código y tolerancia; "Copiar" copia la llave; sede sin llaves no deja confirmar. | **OK** |
| CP-32* | F4: "No asistió" deshabilitado con "disponible desde HH:MM" hasta 10 min; luego confirma y la mesa queda libre; `pagos.ver` ve "Pago reportado". | **OK** |
| CP-33* | F5: 03 muestra el código; "Calificar mi visita" abre 17; código de reserva completada califica (17b muestra sede, mesa y fecha); código errado/no completada/repetido dan aviso. | **OK** |
| CP-34 | F5: en 18, filtro 30 días/todo, promedio, distribución y recientes; sede sin calificaciones muestra el vacío; la tarjeta "Hoy" muestra el promedio. | **OK** |
| CP-35* | F6 (seguridad): con cada rol y en la otra sede, no se ven ni modifican datos ajenos (RLS); anon no lee reservas, perfiles ni calificaciones. | **OK.** Celular (2026-11-07): cada rol de A vio solo A y cada rol de B solo B; el admin general vio ambas (esperado). RLS staging (2026-11-07, MCP): 30/30 sondas + PostgREST `42501`. |

> **F6 cerrada (2026-11-07):** regresión en celular y CP-25 a CP-35 superados; RLS verificada en
> staging (30/30 sondas + PostgREST). **Etapa 5 cerrada (2026-11-10):** CP-01 a CP-23 y CP-25 a
> CP-35 superados. **APK generado (2026-11-10).** Pendientes de la etapa 6: CP-24, el video y los
> enlaces finales.

Regresión obligatoria tras tocar reservas o RLS: **CP-05, CP-07, CP-08 y CP-09**.

## Etapa 6 · APK generado (CP-24 pendiente)

| Dato | Valor |
|---|---|
| Build de EAS | `8a90f40d-405e-419e-925f-ab6289678019` |
| Perfil | `preview` (APK, distribución interna) |
| Versión / versionCode | 1.0.0 / 1 |
| Commit | `b2f7431` |
| APK | https://expo.dev/artifacts/eas/0c5CFQZqmqX_9mDLvjpkz4cwZi4lcZDBkwGeycfBGyE.apk |
| Seguimiento | https://expo.dev/accounts/joansanchezz/projects/konys-pizza/builds/8a90f40d-405e-419e-925f-ab6289678019 |

| Caso | Qué verificar | Estado |
|---|---|---|
| CP-24 | Instalar el APK y repetir CP-01, CP-07 y CP-14 en el dispositivo. | **Pendiente de ejecutar** |

## Revisión de RLS en staging (F6, CP-35) · **ejecutada el 2026-11-07**

Proyecto: **`konys-reservas-staging`** (`rdzbzrekppfgwenftayw`). Ejecutada con el **MCP de
Supabase** dentro de una transacción que termina en `ROLLBACK`.

**Resultado: 30/30 sondas coinciden.** Es la versión compacta del banco (el archivo
`supabase/pruebas/rls_staging.sql` conserva la versión de 38 sondas para re-ejecutarla). Cubrió:

- **anon:** ve las mesas y solo las llaves activas; `permission denied` en `reservas`, `perfiles`
  y `calificaciones`.
- **admin general:** ve 4 reservas y 5 perfiles de A+B; `KONYS_SEDE_PRINCIPAL` al borrar la
  principal.
- **admin de sede A:** 2 reservas de A y 0 de B; 0 perfiles de B; RLS al crear sede/rol o mover
  una mesa a B; `KONYS_SIN_PERMISO` al borrar B.
- **recepción A:** registra en el local sin pago; en B da `KONYS_PAGO_REQUERIDO`; no edita mesas
  ni borra reservas.
- **mesero A:** completa, no cancela, no ve B.
- **cocina A:** no lee reservas, no cambia el precio, marca agotado.
- **recepción B:** 0 reservas de A y 2 de B.
- **anon inserta:** con "Ya pagué" (1); sin "Ya pagué" da `KONYS_PAGO_REQUERIDO`.
- **RLS activo** en las 11 tablas.

**`ROLLBACK` verificado:** 0 sedes, 0 usuarios, 0 tablas y 0 funciones temporales.

### Camino real de la app (PostgREST + clave pública)

| Petición | Resultado |
|---|---|
| `GET /rest/v1/mesas` (anon) | 200 con mesas |
| `GET /rest/v1/reservas` (anon) | 401 `42501 permission denied` |
| `GET /rest/v1/perfiles` (anon) | 401 `42501 permission denied` |
| `GET /rest/v1/calificaciones` (anon) | 401 `42501 permission denied` |
| `GET /rest/v1/metodos_pago` (anon) | 200 `[]` (staging aún sin llaves activas) |
| `POST /rest/v1/rpc/slots_ocupados` | 200 `[]` |
| `POST /rest/v1/rpc/calificar_reserva` (código errado) | 400 `KONYS_RESERVA_NO_ENCONTRADA` |

### Asesores de seguridad (Supabase)

Solo avisos conocidos e intencionales: `btree_gist` en `public` (lo exige
`reservas_sin_solape`); `slots_ocupados` y `calificar_reserva` ejecutables por `anon` (son la API
pública del cliente); y las funciones de autorización (`puede`, `sede_actual`,
`tiene_privilegio`, `es_admin_general`, `mi_sesion`, `marcar_clave_cambiada`,
`calificaciones_de_sede` y `eliminar_sede`) ejecutables por `authenticated` porque las usan las
políticas y la app. **No apareció ningún aviso nuevo de riesgo.**

### Re-ejecutar el script completo (38 sondas)

Script: **`supabase/pruebas/rls_staging.sql`**. Se pega completo en el SQL Editor de
`konys-reservas-staging` y se ejecuta de una vez. Es autocontenido y transaccional: crea dos
sedes, cuentas de `auth`, perfiles y datos de prueba temporales, prueba la RLS cambiando de rol
(`set local role anon` / `authenticated` con `request.jwt.claim.sub`) y termina en `ROLLBACK`,
así que **no deja datos ni toca los reales**. Devuelve una tabla `caso | esperado | obtenido`
que debe coincidir fila por fila.

Comprueba que:

1. `anon` no lee `reservas`, `perfiles` ni `calificaciones` (permiso denegado), y sí lee mesas,
   horarios y platos de sedes activas, y solo las llaves de pago activas.
2. Cada rol (admin de sede, recepción, mesero, cocina, recepción de otra sede) no ve ni modifica
   filas de la sede B; el mesero no cancela; la cocina no cambia precios.
3. `eliminar_sede` solo responde al admin general y nunca sobre la sede principal.
4. El insert público de reservas exige `pago_reportado`; el personal con `reservas.gestionar` lo
   omite en su sede (reservas en el local).

Si el `INSERT` en `auth.users` fallara por diferencias de esquema de GoTrue, el propio archivo
explica cómo crear las 6 cuentas desde Authentication y ajustar los UUID.

El mismo conjunto se prueba en `supabase/pruebas/banco_roles.mjs` (92/92, PostgreSQL embebido);
esta revisión confirma el despliegue real (PostgREST + JWT). El script quedó validado en PGlite
(38/38 sondas coinciden) antes de entregarse.

