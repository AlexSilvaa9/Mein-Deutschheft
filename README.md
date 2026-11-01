# 📖 Mein Deutschheft

Cuaderno personal de vocabulario, pronunciación y lecciones de alemán — aplicación web estática construida con **Angular 21**.

## Características

| Sección | Funcionalidad |
|---|---|
| **Mi vocabulario** | Lista de palabras con etiquetas visuales por género, Umlaut, vocal corta/larga y patrones |
| **Explorar** | Filtros combinables: dominio semántico, conjunto, género, Umlaut, vocales, patrones, sílabas |
| **Ejercicios** | Traducción, artículos, plural, pronunciación y `ein/eine/kein/keine`; generados desde los filtros activos |
| **Lecciones** | Contenidos jerárquicos por fundamentos, gramática, verbos, pronunciación, vocabulario y números |
| **Gestionar** | Añadir/editar/eliminar palabras, dominios semánticos jerárquicos, conjuntos y patrones; exportar e importar JSON |
| **Información** | Guía de uso y documentación técnica de la aplicación |

## Lecciones

La sección **Lecciones** está preparada para crecer por unidades didácticas:

- **Fundamentos A1**: saludos, presentaciones, mayúsculas, género y plural.
- **Gramática A1**: artículos, `ein/kein`, posesivos, orden de la frase y compuestas.
- **Verbos y frases**: conjugación básica, cambios vocálicos y `gern`.
- **Pronunciación**: vocales, Umlauts, diptongos, `sp/st/sch/tsch`, `ch`, `z`, `w` y ensordecimiento final.
- **Vocabulario por temas**: personas, tiempo, ciudad, transporte, casa, comida y naturaleza.
- **Números y cantidades**: números hasta `999999`, precios y cantidades.

Cada lección incluye nivel CEFR, objetivo, explicación y ejemplos. Las palabras reconocidas dentro de los ejemplos se enlazan conceptualmente con el vocabulario: muestran traducción al pasar el cursor y respetan el resaltado de pronunciación configurado.

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
│       ├── lessons/        # Lecciones jerárquicas y ejemplos interactivos
│       ├── manage/         # CRUD + I/O JSON
│       ├── info/           # Guía de uso y documentación técnica
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
  "version": 8,
  "wordBases": [{ "id", "lemma" }],
  "words": [{ "id", "createdAt", "lemma", "article|null", "wordType", "translations",
              "baseId", "domains", "sets", "level", "plural", "pronunciation",
              "compoundParts", "notes" }],
  "domains": [{ "id", "name", "parentId" }],
  "sets": [{ "id", "name", "description" }],
  "pronunciationPatterns": [{ "id", "grapheme", "sound", "description" }],
  "lessonCategories": [{ "id", "name", "order" }],
  "lessonSubcategories": [{ "id", "categoryId", "name", "order" }],
  "lessons": [{ "id", "categoryId", "subcategoryId", "title",
                "summary", "content", "level", "order" }],
  "lessonDoubts": [{ "id", "question", "answer" }]
}
```

`article` es `null` para palabras sin género gramatical, como verbos, adjetivos, números e interjecciones. Los dominios son agrupaciones semánticas; `wordType` clasifica la función gramatical por separado.
`createdAt` es un timestamp ISO-8601 de alta. La aplicación muestra las palabras ordenadas de más reciente a más antigua sin cambiar ese valor al editarlas.
`wordBases` describe bases visibles del vocabulario. Una base es también un `Word` con `isBase: true`; sus acepciones reales son palabras hijas con `baseId` e `isRelated: true`. Las hijas conservan su propio género, plural, pronunciación y traducciones, pero solo se muestran dentro del detalle de la base. La base agrega los artículos de sus hijas en `articles`, por lo que puede mostrar uno o dos géneros.
En el catálogo, Explorar y Gestión se muestra una sola tarjeta por base; al abrirla, el detalle agrupa las variantes relacionadas. Actualmente se usan grupos para lemas con acepciones separadas como `See` (der See = lago / die See = mar), `Bahn` (ferrocarril / pista o carril) y `Karte` (tarjeta / mapa).

El esquema JSON formal está en [`schemas/vocabulary.schema.json`](./schemas/vocabulary.schema.json). En palabras con `wordType: "noun"` se permiten artículo y datos de plural; para el resto deben ser `null` o estar vacíos. Las traducciones pueden estar en español, inglés o alemán.

`pronunciation.stress` contiene `primary` para el acento principal y `secondary` para los acentos secundarios. El alemán tiene normalmente un solo acento principal por palabra, pero los compuestos pueden tener acentos secundarios.

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

1. Revisa una unidad en **Lecciones** para aprender la explicación y los ejemplos
2. Añade o corrige palabras en **Gestionar** → exporta el JSON
3. Estudia con **Explorar** usando filtros combinados
4. Practica con **Ejercicios** filtrados por dominio, conjunto o tipo de palabra
5. Exporta el JSON periódicamente como copia de seguridad
