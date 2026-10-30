import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type InfoTab = 'guide' | 'technical';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page info-page">
      <header class="page__header">
        <div>
          <p class="eyebrow">Mein Deutschheft</p>
          <h1 class="page__title">Ayuda y documentación</h1>
          <p class="page__subtitle">Cómo usar la aplicación y cómo están organizados tus datos.</p>
        </div>
      </header>

      <nav class="info-tabs" aria-label="Tipo de documentación">
        <button type="button" class="info-tab" [class.info-tab--active]="activeTab() === 'guide'"
          (click)="activeTab.set('guide')">
          <i class="bi bi-person-check" aria-hidden="true"></i>
          Guía de uso
        </button>
        <button type="button" class="info-tab" [class.info-tab--active]="activeTab() === 'technical'"
          (click)="activeTab.set('technical')">
          <i class="bi bi-code-slash" aria-hidden="true"></i>
          Documentación técnica
        </button>
      </nav>

      <section *ngIf="activeTab() === 'guide'" class="info-content">
        <article class="info-card info-card--highlight">
          <div class="info-card__icon"><i class="bi bi-compass" aria-hidden="true"></i></div>
          <div>
            <h2>Qué puedes hacer</h2>
            <p>Construye tu propio vocabulario alemán, consulta sus patrones y practica con ejercicios generados a partir de tus palabras.</p>
          </div>
        </article>

        <div class="info-grid">
          <article class="info-card">
            <div class="info-card__icon"><i class="bi bi-collection" aria-hidden="true"></i></div>
            <h2>Mi vocabulario</h2>
            <p>Consulta todas tus palabras y busca por lema o traducción. Cada tarjeta muestra el artículo, el nivel y los datos esenciales.</p>
            <ol>
              <li>Selecciona una palabra para abrir su ficha completa.</li>
              <li>Usa el lápiz para editarla o la papelera para eliminarla.</li>
              <li>En la ficha puedes revisar plural, sílabas, vocales y patrones.</li>
            </ol>
          </article>

          <article class="info-card">
            <div class="info-card__icon"><i class="bi bi-funnel" aria-hidden="true"></i></div>
            <h2>Explorar</h2>
            <p>Combina filtros para encontrar grupos concretos: dominio, conjunto, artículo, Umlaut, cantidad vocálica, patrón o número de sílabas.</p>
            <p>El filtro de subdominios permite incluir automáticamente las categorías hijas de un dominio.</p>
          </article>

          <article class="info-card">
            <div class="info-card__icon"><i class="bi bi-bullseye" aria-hidden="true"></i></div>
            <h2>Ejercicios</h2>
            <p>Elige traducción, artículo, plural o pronunciación. Puedes limitar las palabras por dominio o conjunto antes de empezar.</p>
            <p>La sesión mezcla las palabras y muestra el resultado al terminar.</p>
          </article>

          <article class="info-card">
            <div class="info-card__icon"><i class="bi bi-pencil-square" aria-hidden="true"></i></div>
            <h2>Gestionar</h2>
            <p>Añade y edita palabras, crea dominios y organiza conjuntos. Las palabras nuevas necesitan al menos un lema.</p>
            <p>Los botones de exportar, importar y restaurar están en la pestaña de datos.</p>
          </article>
        </div>

        <article class="info-card">
          <h2>Guardar y proteger tus datos</h2>
          <div class="steps">
            <div><span>1</span><p>Los cambios se guardan automáticamente en el navegador cuando creas, editas o eliminas datos.</p></div>
            <div><span>2</span><p>Exporta periódicamente desde <strong>Gestionar &gt; Datos</strong> para descargar una copia JSON.</p></div>
            <div><span>3</span><p>Para trasladar el vocabulario a otro navegador, usa <strong>Importar</strong> y selecciona esa copia.</p></div>
            <div><span>4</span><p><strong>Restaurar</strong> elimina los datos locales y vuelve al vocabulario inicial incluido en la aplicación.</p></div>
          </div>
          <div class="callout callout--warning">
            <i class="bi bi-shield-exclamation" aria-hidden="true"></i>
            <span>El navegador no es una copia de seguridad. Exporta el JSON antes de borrar los datos del sitio o cambiar de dispositivo.</span>
          </div>
        </article>
      </section>

      <section *ngIf="activeTab() === 'technical'" class="info-content">
        <article class="info-card">
          <h2>Arquitectura</h2>
          <p>La aplicación es una SPA estática construida con Angular 21 y componentes standalone. No necesita servidor de aplicación ni base de datos remota para funcionar.</p>
          <div class="tech-list">
            <div><strong>Componentes</strong><span>Las pantallas viven en <code>src/app/features</code>; los formularios y tarjetas reutilizables están en <code>src/app/shared</code>.</span></div>
            <div><strong>Signals</strong><span>Los servicios mantienen el estado reactivo y las vistas se actualizan automáticamente cuando cambia el vocabulario o el filtro.</span></div>
            <div><strong>Servicios</strong><span><code>VocabularyService</code> gestiona CRUD, filtros y persistencia; <code>ExerciseService</code> genera y corrige sesiones.</span></div>
          </div>
        </article>

        <article class="info-card">
          <h2>Modelo de datos</h2>
          <p>El documento raíz es un <code>VocabularyData</code> versionado:</p>
          <pre><code>{{ dataModel }}</code></pre>
          <p>Las palabras relacionan dominios, conjuntos y patrones mediante sus identificadores. Así se evita repetir nombres y una edición de catálogo se refleja en todas las palabras relacionadas.</p>
        </article>

        <div class="info-grid">
          <article class="info-card">
            <h2>Pronunciación</h2>
            <p>Cada palabra guarda sílabas, posición del acento, vocales con cantidad corta/larga y ocurrencias de patrones. Las posiciones son 1-indexadas para que sean legibles y consistentes con las sílabas.</p>
          </article>
          <article class="info-card">
            <h2>Persistencia local</h2>
            <p>Al iniciar, se intenta leer <code>localStorage</code>. Si no existe o está corrupto, se carga <code>assets/data/vocabulary.json</code>. Cada operación CRUD actualiza la signal y serializa el documento completo.</p>
          </article>
        </div>

        <article class="info-card">
          <h2>Por qué este diseño</h2>
          <ul class="reason-list">
            <li><i class="bi bi-lock" aria-hidden="true"></i><span><strong>Privacidad:</strong> el vocabulario permanece en tu navegador y no se envía a un backend.</span></li>
            <li><i class="bi bi-file-earmark-code" aria-hidden="true"></i><span><strong>Portabilidad:</strong> JSON es legible, editable y fácil de versionar o compartir como copia.</span></li>
            <li><i class="bi bi-lightning" aria-hidden="true"></i><span><strong>Simplicidad:</strong> una app estática evita configuración de servidor, cuentas y migraciones para un cuaderno personal.</span></li>
            <li><i class="bi bi-exclamation-diamond" aria-hidden="true"></i><span><strong>Límite consciente:</strong> limpiar los datos del navegador puede borrar los cambios; por eso exportar es la estrategia de respaldo.</span></li>
          </ul>
        </article>
      </section>
    </div>
  `,
  styles: [`
    .info-page { max-width: 1050px; margin: 0 auto; }
    .eyebrow { color: var(--color-primary); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; margin: 0 0 0.3rem; text-transform: uppercase; }
    .info-tabs { display: inline-flex; gap: 0.25rem; border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: 1.25rem; padding: 0.25rem; }
    .info-tab { display: inline-flex; align-items: center; gap: 0.5rem; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-text-muted); cursor: pointer; font: inherit; font-size: 0.9rem; font-weight: 600; padding: 0.65rem 0.9rem; }
    .info-tab:hover { color: var(--color-text); background: var(--color-surface-hover); }
    .info-tab--active { background: var(--color-primary-light); color: var(--color-primary); }
    .info-content { display: flex; flex-direction: column; gap: 1rem; }
    .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .info-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); padding: 1.35rem 1.5rem; }
    .info-card--highlight { display: flex; align-items: flex-start; gap: 1rem; background: var(--color-surface-hover); box-shadow: inset 3px 0 var(--color-primary), var(--shadow-sm); }
    .info-card__icon { align-items: center; background: var(--color-primary-light); border: 0; border-radius: 0.7rem; color: var(--color-primary); display: flex; flex: 0 0 2.5rem; height: 2.5rem; justify-content: center; font-size: 1.1rem; }
    .info-card:not(.info-card--highlight) > .info-card__icon { margin-bottom: 0.9rem; }
    .info-card h2 { font-size: 1.05rem; margin: 0 0 0.55rem; }
    .info-card p, .info-card li { color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.65; }
    .info-card p { margin: 0 0 0.65rem; }
    .info-card ol { margin: 0.75rem 0 0; padding-left: 1.2rem; }
    .steps { display: grid; gap: 0.75rem; margin: 1rem 0; }
    .steps > div { align-items: flex-start; display: flex; gap: 0.75rem; }
    .steps span { align-items: center; background: var(--color-primary); border-radius: 50%; color: #fff; display: flex; flex: 0 0 1.5rem; font-size: 0.75rem; font-weight: 700; height: 1.5rem; justify-content: center; }
    .steps p { margin: 0; }
    .callout { align-items: flex-start; border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; gap: 0.6rem; padding: 0.8rem; font-size: 0.85rem; }
    .callout--warning { background: var(--color-warning-light); color: var(--color-warning); }
    .tech-list { display: grid; gap: 0.75rem; margin-top: 1rem; }
    .tech-list div { background: var(--color-surface-hover); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: grid; gap: 0.15rem; padding: 0.75rem; }
    .tech-list span { color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.55; }
    code { background: var(--color-surface-hover); border: 1px solid var(--color-border); border-radius: 0.25rem; color: var(--color-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.82em; padding: 0.1rem 0.3rem; }
    pre { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin: 0.85rem 0; overflow-x: auto; padding: 1rem; }
    pre code { background: transparent; border: 0; color: var(--color-text); padding: 0; }
    .reason-list { display: grid; gap: 0.85rem; list-style: none; margin: 0.75rem 0 0; padding: 0; }
    .reason-list li { align-items: flex-start; display: flex; gap: 0.7rem; }
    .reason-list i { color: var(--color-primary); margin-top: 0.25rem; }
    @media (max-width: 700px) { .info-tabs { display: flex; } .info-tab { flex: 1; justify-content: center; } .info-grid { grid-template-columns: 1fr; } .info-card--highlight { display: block; } .info-card--highlight .info-card__icon { margin-bottom: 0.9rem; } }
  `],
})
export class InfoComponent {
  activeTab = signal<InfoTab>('guide');
  dataModel = `{
  "version": 1,
  "words": [],
  "domains": [],
  "sets": [],
  "pronunciationPatterns": []
}`;
}
