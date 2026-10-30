# 📖 Mein Deutschheft

Cuaderno personal de vocabulario alemán — aplicación web estática construida con **Angular 21**.

## Características

| Sección | Funcionalidad |
|---|---|
| **Mi vocabulario** | Lista de palabras con etiquetas visuales por género, Umlaut, vocal corta/larga y patrones |
| **Explorar** | Filtros combinables: dominio semántico, conjunto, género, Umlaut, vocales, patrones, sílabas |
| **Ejercicios** | Traducción, artículo, plural y pronunciación; generados desde los filtros activos |
| **Gestionar** | Añadir/editar/eliminar palabras, dominios y conjuntos; exportar e importar JSON |
| **Información** | Guía de uso y documentación técnica de la aplicación |

## Tecnología

- **Angular 21** — componentes standalone, signals reactivos
- **SCSS** — sistema de diseño con tokens CSS (modo claro/oscuro automático)
- **localStorage** — persistencia local sin backend
- **JSON único** — `src/assets/data/vocabulary.json`
- **i18n propio** — Español 🇪🇸 · English 🇬🇧 · Deutsch 🇩🇪

## Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── models/         # Interfaces TypeScript del modelo de datos
│   │   └── services/
│   │       ├── translator.service.ts   # i18n con signals
│   │       ├── vocabulary.service.ts   # CRUD + filtros + persistencia
│   │       └── exercise.service.ts     # Motor de ejercicios
│   ├── shared/
│   │   ├── components/
│   │   │   ├── word-card.component.ts  # Tarjeta de palabra
│   │   │   └── word-form.component.ts  # Formulario de edición
│   │   └── pipes/
│   │       └── translate.pipe.ts
│   └── features/
│       ├── vocabulary/     # Vista principal
│       ├── explore/        # Filtros combinables
│       ├── exercises/      # Motor de ejercicios
│       ├── manage/         # CRUD + I/O JSON
│       └── word-detail/    # Ficha completa de palabra
├── assets/
│   ├── data/vocabulary.json    # Base de datos principal
│   └── i18n/                   # Traducciones
│       ├── es.json
│       ├── en.json
│       └── de.json
└── styles.scss                 # Sistema de diseño global
```

## Modelo de datos

```json
{
  "version": 1,
  "words": [{ "id", "lemma", "article", "translations", "domains", "sets",
              "level", "plural", "pronunciation", "notes" }],
  "domains": [{ "id", "name", "parentId" }],
  "sets": [{ "id", "name", "description" }],
  "pronunciationPatterns": [{ "id", "grapheme", "sound", "description" }]
}
```

## Sistema de colores

| Color | Uso |
|---|---|
| 🔵 Azul | `der` (masculino) |
| 🔴 Rosa | `die` (femenino) |
| 🟢 Verde | `das` (neutro) |
| 🟡 Naranja | Umlaut y cambios morfológicos |
| 🟢 Verde claro | Vocal larga |
| 🔵 Azul claro | Patrones de pronunciación (`sch`, `ei`, etc.) |
| 🟣 Violeta | Estructura silábica |

## Desarrollo

```bash
npm install
npm start        # http://localhost:4200
npm run build    # Compilación de producción → dist/
```

## Persistencia

1. Al abrir: carga `localStorage` (si existe) o el JSON inicial
2. Al editar: guarda automáticamente en `localStorage`
3. **Exportar** → descarga `vocabulary.json` actualizado
4. **Importar** → carga un JSON exportado
5. **Restaurar** → borra `localStorage` y carga el JSON inicial

La explicación completa para usuarios y desarrolladores está disponible dentro de la aplicación, en **Información**. La pestaña de uso describe las pantallas y el flujo recomendado; la pestaña técnica documenta el modelo de datos, la persistencia local y las decisiones de diseño.

## Flujo de trabajo recomendado

1. Añade palabras en **Gestionar** → exporta el JSON
2. Estudia con **Explorar** usando filtros combinados
3. Practica con **Ejercicios** filtrados por dominio o conjunto
4. Exporta el JSON periódicamente como copia de seguridad
