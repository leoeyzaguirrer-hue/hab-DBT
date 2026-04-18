# Arquitectura del Sistema — hab-DBT

## 1. Tecnologías principales

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui (tema slate) |
| Backend | Next.js Server Actions + API Routes |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (email + contraseña) |
| Deploy | Vercel |
| Estado global | Zustand |
| Cifrado | libsodium-wrappers |
| PWA | next-pwa (sin Play Store) |

---

## 2. Arquitectura general del sistema

### 2.1. Diagrama de alto nivel

```
┌─────────────────────────────────────────────────────────────┐
│                     DISPOSITIVOS CLIENTES                    │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │  PWA Consultante │          │   PWA Terapeuta  │         │
│  │   (celular)      │          │  (celu/compu)    │         │
│  │                  │          │                  │         │
│  │ • Tarjeta diaria │          │ • Dashboard      │         │
│  │ • Plan crisis    │          │ • Códigos invit. │         │
│  │ • Habilidades    │          │ • Plan crisis    │         │
│  │ • Mensajes       │          │ • Ver avances    │         │
│  │ • Recordatorios  │          │ • Enviar mensaj. │         │
│  │                  │          │                  │         │
│  │ [CIFRADO LOCAL]  │          │ [CIFRADO LOCAL]  │         │
│  └────────┬─────────┘          └────────┬─────────┘         │
└───────────┼────────────────────────────┼───────────────────┘
            │                            │
            │   HTTPS + datos cifrados   │
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js API)                      │
│  • Server Components / Server Actions                        │
│  • Rutas API protegidas                                      │
│  • Middleware de autenticación                               │
│  • Rate limiting                                             │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │   Auth         │  │   Postgres DB  │  │   Storage     │ │
│  │ (email+pass)   │  │ (con RLS)      │  │ (si necesario)│ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │   Realtime     │  │  Edge Functions│                    │
│  │ (mensajes)     │  │ (lógica server)│                    │
│  └────────────────┘  └────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Flujo básico de uso

**Terapeuta:**
1. Se registra con su email profesional + contraseña
2. Verifica su cuenta (email de confirmación)
3. Entra a su dashboard
4. Genera un código de invitación (único, expira en 7 días)
5. Comparte el código al consultante (WhatsApp, sesión, etc.)
6. Cuando el consultante se registra, aparece automáticamente en su lista
7. Puede: ver tarjetas semanales, modificar plan de crisis, asignar tareas, enviar mensajes

**Consultante:**
1. Recibe el código del terapeuta
2. Accede a la PWA desde el link (ej: dbt-app.vercel.app)
3. "Instala" la PWA en su celular (agregar a pantalla de inicio)
4. Se registra con: código + nombre + email + contraseña
5. Al completar registro, queda vinculado al terapeuta automáticamente
6. Usa la app: tarjeta diaria, habilidades, plan de crisis, mensajes

---

## 3. Modelo de base de datos

### 3.1. Diagrama de entidades

```
auth.users (Supabase Auth)
    │
    ▼
profiles ──────────────────────────────────────┐
    │  role: 'consultant' | 'therapist'         │
    │                                           │
    ├──► therapist_consultants ◄────────────────┤
    │       (vinculación terapeuta-consultante)  │
    │                                           │
    ├──► invitation_codes                       │
    │       (generados por terapeutas)          │
    │                                           │
    ├──► weekly_cards                           │
    │       └──► weekly_card_entries            │
    │                                           │
    ├──► tasks                                  │
    │                                           │
    ├──► crisis_plans                           │
    │       └──► crisis_plan_steps             │
    │                                           │
    └──► messages                               │
             (sender → recipient)               │

dbt_modules ──► dbt_skills ──► assigned_skills ─┘
```

### 3.2. Tablas

#### `profiles`
Extiende `auth.users` con datos del perfil y rol.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Mismo ID que auth.users |
| full_name | TEXT | Nombre completo |
| role | TEXT | 'consultant' o 'therapist' |
| avatar_url | TEXT | URL de foto (opcional) |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |

#### `therapist_consultants`
Vincula terapeutas con sus consultantes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| therapist_id | UUID FK→profiles | Terapeuta |
| consultant_id | UUID FK→profiles | Consultante |
| created_at | TIMESTAMPTZ | Fecha de vinculación |
| UNIQUE | (therapist_id, consultant_id) | Un consultante no puede repetirse con el mismo terapeuta |

#### `invitation_codes`
Códigos de invitación generados por terapeutas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| code | TEXT UNIQUE | Código de 8 caracteres alfanumérico |
| therapist_id | UUID FK→profiles | Terapeuta que lo generó |
| used_by | UUID FK→profiles | Consultante que lo usó (NULL si no usado) |
| used_at | TIMESTAMPTZ | Cuándo fue usado |
| expires_at | TIMESTAMPTZ | Vence a los 7 días |
| created_at | TIMESTAMPTZ | |

#### `dbt_modules`
Los 4 módulos del programa DBT.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | Nombre del módulo |
| slug | TEXT UNIQUE | Identificador URL (ej: 'mindfulness') |
| description | TEXT | Descripción general |
| color | TEXT | Color hex para UI |
| order_index | INTEGER | Orden de visualización |

#### `dbt_skills`
Habilidades dentro de cada módulo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| module_id | UUID FK→dbt_modules | Módulo al que pertenece |
| name | TEXT | Nombre de la habilidad |
| description | TEXT | Descripción breve |
| instructions | TEXT | Instrucciones de práctica |
| examples | TEXT | Ejemplos de aplicación |
| order_index | INTEGER | Orden dentro del módulo |

#### `assigned_skills`
Habilidades sugeridas por el terapeuta al consultante.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| therapist_id | UUID FK→profiles | Terapeuta que sugirió |
| consultant_id | UUID FK→profiles | Consultante receptor |
| skill_id | UUID FK→dbt_skills | Habilidad asignada |
| notes | TEXT | Notas del terapeuta |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (consultant_id, skill_id) | No repetir habilidades asignadas |

#### `weekly_cards`
Tarjeta de seguimiento semanal del consultante.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| consultant_id | UUID FK→profiles | Dueño de la tarjeta |
| week_start | DATE | Lunes de la semana |
| week_end | DATE | Domingo de la semana |
| config | JSONB | Config personalizable (campos, frecuencias) |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (consultant_id, week_start) | Una tarjeta por semana por consultante |

#### `weekly_card_entries`
Entradas diarias dentro de la tarjeta semanal.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| weekly_card_id | UUID FK→weekly_cards | Tarjeta a la que pertenece |
| entry_date | DATE | Fecha del día |
| skills_used | JSONB | Array de skill_ids practicadas |
| emotions | JSONB | Array de {nombre, intensidad 1-10} |
| urges | JSONB | Array de {nombre, intensidad 1-10} |
| medications_taken | BOOLEAN | ¿Tomó medicación? |
| exercise_done | BOOLEAN | ¿Hizo ejercicio? |
| sleep_hours | NUMERIC(3,1) | Horas de sueño |
| notes | TEXT | Notas libres del día |
| updated_at | TIMESTAMPTZ | |
| UNIQUE | (weekly_card_id, entry_date) | Una entrada por día |

#### `tasks`
Tareas asignadas por el terapeuta al consultante.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| therapist_id | UUID FK→profiles | Terapeuta que asignó |
| consultant_id | UUID FK→profiles | Consultante receptor |
| skill_id | UUID FK→dbt_skills | Habilidad relacionada (opcional) |
| title | TEXT | Título de la tarea |
| description | TEXT | Descripción detallada |
| due_date | DATE | Fecha límite (opcional) |
| completed_at | TIMESTAMPTZ | Cuándo la completó (NULL si pendiente) |
| created_at | TIMESTAMPTZ | |

#### `crisis_plans`
Plan de crisis del consultante (uno activo por consultante).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| consultant_id | UUID FK→profiles | Dueño del plan |
| title | TEXT | Título del plan |
| is_active | BOOLEAN | Si es el plan activo |
| created_by | UUID FK→profiles | Quién lo creó (consultante o terapeuta) |
| updated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### `crisis_plan_steps`
Pasos ordenados dentro del plan de crisis.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| crisis_plan_id | UUID FK→crisis_plans | Plan al que pertenece |
| step_order | INTEGER | Orden del paso |
| title | TEXT | Título del paso |
| content | TEXT | Contenido/instrucción |
| category | TEXT | Categoría del paso |
| do_list | JSONB | Lista de cosas QUE HACER |
| dont_list | JSONB | Lista de cosas que NO HACER |

#### `messages`
Mensajes de apoyo del terapeuta al consultante.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| sender_id | UUID FK→profiles | Remitente |
| recipient_id | UUID FK→profiles | Destinatario |
| content | TEXT | Contenido del mensaje |
| type | TEXT | 'motivation', 'validation', 'task', 'general' |
| read_at | TIMESTAMPTZ | Cuándo fue leído (NULL si no leído) |
| created_at | TIMESTAMPTZ | |

---

## 4. Estructura de carpetas

```
src/
├── app/
│   ├── (auth)/               # Rutas públicas
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (consultant)/         # Rutas protegidas consultante
│   │   ├── dashboard/
│   │   ├── crisis-plan/
│   │   ├── skills/[moduleId]/
│   │   └── weekly-card/
│   └── (therapist)/          # Rutas protegidas terapeuta
│       ├── dashboard/
│       ├── clients/[clientId]/
│       ├── skills/
│       └── crisis-plans/
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── shared/               # Componentes compartidos
│   ├── consultant/           # Componentes del consultante
│   └── therapist/            # Componentes del terapeuta
├── lib/
│   ├── supabase/             # Clientes supabase
│   ├── utils/                # Utilidades generales
│   └── validations/          # Schemas de validación (zod)
├── hooks/                    # Custom hooks
├── stores/                   # Zustand stores
└── types/                    # TypeScript types
```

---

## 5. Autenticación y autorización

### Roles
- **therapist**: Terapeuta/supervisor. Se registra directamente.
- **consultant**: Consultante. Solo puede registrarse con código de invitación válido.

### Flujo de registro con código
```
1. Terapeuta genera código → se guarda en invitation_codes (expira 7 días)
2. Consultante ingresa código en registro
3. Server Action valida código (función validate_invitation_code)
4. Si válido: crea auth.users + profile + therapist_consultants
5. Código se marca como usado (used_by, used_at)
```

### Middleware
El middleware de Next.js verifica la sesión en cada request y redirige:
- Sin sesión → /login
- Sesión con rol 'therapist' en ruta /consultant → /therapist/dashboard
- Sesión con rol 'consultant' en ruta /therapist → /consultant/dashboard

---

## 6. Políticas RLS (Row Level Security)

Todas las tablas tienen RLS habilitado. Nadie accede a datos de otro usuario salvo las excepciones definidas.

### Principios generales
- **Consultante**: solo ve sus propios datos
- **Terapeuta**: ve sus propios datos + datos de sus consultantes vinculados
- **Contenido DBT** (módulos y habilidades): lectura pública para todos los autenticados
- **Códigos de invitación**: solo el terapeuta que los generó puede verlos

### Tabla por tabla

#### `profiles`
- SELECT: cada usuario lee su propio perfil. Terapeutas leen perfiles de sus consultantes.
- INSERT: solo via trigger al crear cuenta (no directamente).
- UPDATE: cada usuario actualiza su propio perfil.

#### `therapist_consultants`
- SELECT: terapeuta ve sus vínculos. Consultante ve su propio vínculo.
- INSERT/DELETE: solo el terapeuta puede vincular/desvincular.

#### `invitation_codes`
- SELECT: solo el terapeuta que lo creó.
- INSERT: solo terapeutas.
- UPDATE: solo via función `validate_invitation_code` (service role).

#### `dbt_modules` y `dbt_skills`
- SELECT: todos los usuarios autenticados (contenido público de la app).
- INSERT/UPDATE/DELETE: nadie desde el cliente (solo via migraciones/seed).

#### `assigned_skills`
- SELECT: consultante ve las suyas. Terapeuta ve las de sus consultantes.
- INSERT/DELETE: solo el terapeuta vinculado al consultante.

#### `weekly_cards` y `weekly_card_entries`
- SELECT: consultante ve las suyas. Terapeuta ve las de sus consultantes.
- INSERT/UPDATE: solo el consultante dueño de la tarjeta.

#### `tasks`
- SELECT: consultante ve las suyas. Terapeuta ve las que asignó.
- INSERT: solo terapeutas.
- UPDATE (completed_at): solo el consultante puede marcarla como completada.

#### `crisis_plans` y `crisis_plan_steps`
- SELECT: consultante ve los suyos. Terapeuta ve los de sus consultantes.
- INSERT/UPDATE/DELETE: tanto el consultante como su terapeuta vinculado.

#### `messages`
- SELECT: sender o recipient pueden leer.
- INSERT: cualquier usuario autenticado puede enviar (a sus consultantes/terapeuta).
- UPDATE (read_at): solo el recipient.

---

## 7. Seguridad adicional

- Variables de entorno nunca expuestas al cliente (prefix `NEXT_PUBLIC_` solo para URL y anon key)
- Service Role Key solo en Server Actions y API Routes
- Rate limiting en endpoints de registro e invitación
- Códigos de invitación con expiración de 7 días y uso único
- Contraseñas manejadas 100% por Supabase Auth (nunca las tocamos)
- HTTPS obligatorio en producción (Vercel lo garantiza)
