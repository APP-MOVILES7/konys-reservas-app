# Konys Pizza · App móvil de reservas de mesas

App móvil (Android e iOS) para que los clientes de Konys Pizza (Bucaramanga) reserven mesa
viendo la disponibilidad por franjas, y para que el personal autorizado gestione mesas,
horarios, reservas y carta. Construida con **React Native + Expo SDK 58** en **JavaScript**
(sin TypeScript) y **Supabase** (PostgreSQL) como backend, sin servidor propio.

> **Estado:** etapas 1 a 5 completadas y **fases F0 a F6 cerradas** (splash y
> bienvenida, sedes, roles/privilegios, pago simulado, calificaciones por estrellas e integración
> y seguridad). La etapa 5 quedó cerrada con los CP-01 a CP-23 y CP-25 a CP-35 registrados en
> `docs/pruebas.md`; CP-24 se verifica sobre el APK. **Siguiente: etapa 6 (compilación del APK,
> video y enlaces de entrega).**

---

## 1. Funcionalidades

### Módulo cliente

- **Inicio:** lista las mesas activas con nombre, zona, capacidad y foto opcional.
- **Reservar:** selector de 14 días, disponibilidad agrupada en Almuerzo y Noche, grilla de
  slots (libre / ocupado / pasado), formulario con nombre, personas, teléfono opcional y
  autorización de tratamiento de datos (Ley 1581 de 2012).
- **Confirmación:** resumen de la reserva con datos locales en memoria (sin datos personales
  en la URL ni persistencia).
- **Carta:** filtros por categoría y precios en COP, con platos disponibles.
- **Pago simulado (F4):** "Continuar al pago" muestra las llaves activas de la sede (Bre-B,
  Nequi, Bancolombia u otro) con "Copiar"; la reserva solo se crea al marcar **"Ya pagué"**.
- **Confirmación:** muestra el pago reportado y los 10 minutos de tolerancia, y el **código de
  la reserva** (8 caracteres) con "Copiar".
- **Calificación (F5):** "Calificar mi visita" en la bienvenida pide el código y 1–5 estrellas;
  solo se califica una reserva **completada** y una sola vez (RN-15).

### Módulo de personal (F3)

- Acceso por la **rueda de ajustes** de la bienvenida, con correo y clave (Supabase Auth). El
  perfil, el rol, la sede y los privilegios salen de la tabla `perfiles` (`002_roles`).
- Clave temporal con cambio obligatorio en el primer ingreso.
- El admin general elige la sede; los demás roles entran al panel de su sede, con una tarjeta
  por sección permitida. La base (RLS) impide lo que el rol no tiene.
- **Sedes:** crear y editar con su único administrador; la principal no se desactiva ni elimina.
  Cada sede tiene sus mesas, horarios, carta y reservas aisladas por RLS.
- **Roles y permisos:** el admin general crea roles personalizados, edita sus 15 privilegios,
  los oculta o los suprime (uno con usuarios no se borra).
- **Personal:** crear cuentas con clave temporal, editar rol y acceso, suspender y eliminar.
- **Mesas:** crear, editar, activar/inactivar y borrar (una mesa con reservas no se borra:
  se inactiva).
- **Horarios:** 7 días x 2 jornadas, con edición de hora inicio, hora fin, duración y activo.
- **Reservas:** filtros Hoy / Mañana / Todas, por mesa y por estado; registrarlas en el local
  (08b, con pago recibido opcional), cancelar, completar o marcar **No asistió** pasados los
  10 minutos (RN-14).
- **Carta:** crear, editar, ocultar/mostrar y eliminar platos; los roles con solo
  `carta.disponibilidad` marcan disponible o agotado.
- **Métodos de pago (F4):** crear, editar, activar/desactivar y eliminar las llaves de la sede
  (16/16b); el cliente ve solo las activas.
- **Sedes:** la principal sigue protegida; las demás se pueden desactivar o eliminar escribiendo
  su nombre exacto (13d, solo admin general).
- **Calificaciones (F5):** con `calificaciones.ver`, la sede muestra promedio, distribución por
  estrella y las visitas recientes (18); la tarjeta "Hoy" muestra el promedio.

### Seguridad y datos

- RLS activo en todas las tablas (`sedes`, `mesas`, `horarios`, `platos`, `reservas`,
  `metodos_pago`, `roles`, `privilegios`, `rol_privilegios`, `perfiles` y `calificaciones`).
- El cliente anónimo solo lee datos vigentes y solo inserta reservas; **no puede leer reservas
  ajenas**. La disponibilidad se consulta con la función `slots_ocupados(mesa, fecha)`.
- **Pago simulado:** no hay pasarela ni validación de pagos. `pago_reportado` es una declaración
  del cliente; el cliente solo ve las llaves activas de su sede y no se guardan datos de tarjetas.
- Restricción de exclusión `reservas_sin_solape` que impide dos reservas confirmadas solapadas
  en la misma mesa (error `23P01`). Al pasar a `no_asistio` la mesa queda libre (F4).
- Un trigger valida capacidad, mesa activa, fecha/hora y alineación del slot, y calcula la hora
  de fin en el servidor.
- `.env` nunca se versiona; solo se usa la clave pública (nunca la `service_role`).

---

## 2. Tecnologías

| Tecnología | Versión |
|---|---|
| Expo SDK | ~58.0.21 |
| React Native / React | 0.88.1 / 19.3.0 |
| Expo Router | ~58.0.30 |
| @supabase/supabase-js | ^2.118.0 |
| @react-native-async-storage/async-storage | 2.2.0 |
| @react-native-community/netinfo | 12.0.1 |
| @expo/vector-icons | ^15.0.2 |
| expo-clipboard | ~58.0.4 |
| Jest / jest-expo | ~30.5.2 / ~58.0.14 |

Regla del proyecto: toda dependencia de app se instala con `npx expo install <paquete>`.
No usar `npm install` para dependencias de la app.

---

## 3. Estructura del repositorio

```text
konys-reservas-app/
├── app/                    pantallas (Expo Router)
│   ├── (tabs)/             Inicio y Carta (sin pestaña Admin desde F3)
│   ├── acceso.js, cambiar-clave.js
│   ├── panel/              panel general (05b) y de la sede (05c/05d)
│   ├── reservar/[mesaId].js
│   ├── pago.js             pago simulado (02c)
│   ├── confirmacion.js
│   └── gestion/            mesas, horarios, reservas, carta, métodos de pago, personal, roles, sedes y sus forms
├── components/             componentes presentacionales
├── services/               única capa que habla con Supabase
│   └── __tests__/          pruebas Jest
├── hooks/                  ReservaConfirmada, ReservaPendiente, SedeSeleccionada, SesionPersonal
├── constants/              colors.js, dominio.js
├── supabase/
│   ├── schema.sql          esquema base, RLS, triggers y disponibilidad
│   ├── migrations/         001_sedes.sql, 002_roles.sql y las siguientes
│   ├── functions/          Edge Functions crear-usuario y eliminar-usuario
│   └── seed_carta.sql      carga de la carta en una base existente
├── docs/                   mockups y material de apoyo
├── assets/                 logo, iconos y splash
├── eas.json                perfil preview (APK)
├── .env.example
└── README.md
```

Las pantallas viven en `app/` en la raíz; `components/`, `services/` y `hooks/` se importan con
rutas relativas.

---

## 4. Puesta en marcha

### Requisitos

- Node.js 24 LTS (o la rama que acepte Expo SDK 58).
- Git Bash (Windows) o terminal equivalente.
- Expo Go en el celular.

### Pasos

```bash
npm install
cp .env.example .env
# completar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Abrir el QR con Expo Go. Si la red bloquea el tráfico local: `npx expo start --tunnel`.

### Base de datos

1. Crear el proyecto en Supabase.
2. Ejecutar en orden `supabase/schema.sql`, `supabase/migrations/001_sedes.sql`,
   `supabase/migrations/002_roles.sql`, `supabase/migrations/003_pagos.sql` y
   `supabase/migrations/004_calificaciones.sql`. **Ninguno es idempotente**: no volver a
   ejecutarlos sobre tablas existentes.
3. Crear el usuario administrador general en Authentication **antes** de `002_roles` (la
   migración lo convierte en perfil `admin_general`) o, si se crea después, insertar su fila en
   `perfiles` con el rol `admin_general` y sin sede. Las cuentas del resto del personal se crean
   desde la app con las Edge Functions de `supabase/functions/`.
4. Desactivar el registro público de usuarios ("Allow new users to sign up" = OFF).
5. Copiar la URL y la clave pública (publishable/anon) al `.env`.
6. Si la base ya existe y solo falta la carta, ejecutar `supabase/seed_carta.sql`.

### Scripts

```bash
npm start            # Expo Go
npm run android      # abrir en Android
npm run ios          # abrir en iOS
npm run lint         # ESLint sobre app, components, constants, hooks y services
npm test             # Jest
npx expo install --check
```

---

## 5. Pruebas

- **Automáticas:** 177 pruebas en 10 suites, en verde (`npm test`). Incluye U-01 a U-08 y el
  banco de RLS en PostgreSQL embebido (`supabase/pruebas/banco_roles.mjs`, 92/92).
- **Lint:** sin errores ni advertencias (`npm run lint`).
- **Manuales:** CP-01 a CP-23 y CP-25 a CP-35 superados y registrados en `docs/pruebas.md`; RLS
  verificada en staging (30/30 sondas + PostgREST). CP-24 se ejecuta sobre el APK en la etapa 6.

Los cambios que toquen reservas deben re-ejecutar CP-05, CP-07, CP-08 y CP-09.

---

## 6. Compilación del APK (EAS)

`eas.json` ya define el perfil `preview` (distribución interna, APK Android, entorno
`preview`). Las variables `EXPO_PUBLIC_*` deben cargarse en EAS porque `.env` no se versiona:

```bash
eas login
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "..." --visibility plaintext
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --visibility plaintext
eas build -p android --profile preview
```

---

## 7. Documentos del repositorio

- `supabase/migrations/README.md`: numeración, entornos y procedimiento de migraciones.
- `supabase/functions/README.md`: publicación y prueba de las Edge Functions de cuentas.
- `docs/*.png`: mockups de las pantallas (exportaciones del Figma oficial).
- `docs/pruebas.md`: registro de las pruebas automáticas y manuales.

Durante el desarrollo, el equipo mantuvo una guía de trabajo local para coordinarse con el
compañero de equipo y avanzar sin tener que subir archivos al repositorio en cada cambio. Esa
guía quedó fuera de la entrega y no forma parte del APK.

---

## 8. Roadmap

| Etapa | Estado |
|---|---|
| 1. Análisis y diseño | Implementada |
| 2. Configuración del entorno | Implementada y verificada en celular |
| 3. Módulo cliente (RF-01 a RF-07) | Implementada y probada (CP-01 a CP-13) |
| 4. Módulo administrador (RF-08 a RF-14) | Implementada y probada (CP-14 a CP-21) |
| 5. Pruebas | **Cerrada (2026-11-10)** |
| 6. Compilación, video y entrega | En curso: falta el APK, el video y los enlaces |
| F0. Preparación y alcance | Cerrada (2026-11-06) |
| F1. Splash, bienvenida y footer | Cerrada (2026-11-06) |
| F2. Sedes y aislamiento | Cerrada (2026-11-06) |
| F3. Roles, privilegios y personal | Cerrada (2026-11-07) |
| F4. Pago simulado y ciclo de la reserva | Cerrada (2026-11-07) |
| F5. Calificaciones por estrellas | Cerrada y probada en celular (2026-11-07) |
| F6. Integración, seguridad y cierre | Cerrada y probada en celular (2026-11-07) |

---

## 9. Autores

Jorge Tamayo y Joan Sanchez. Todos los derechos reservados 2026.

Este proyecto se distribuye con fines académicos; ver `LICENSE`.