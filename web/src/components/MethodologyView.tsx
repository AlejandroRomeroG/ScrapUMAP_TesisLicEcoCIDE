import {
  ArrowUpRight,
  Braces,
  ChevronDown,
  Clock3,
  Database,
  Languages,
  MapPinned,
  Network,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import type { AtlasMeta } from '../types'
import { formatCoefficient, formatNumber, formatPercent, updatedDate } from '../lib/format'

interface MethodologyViewProps {
  meta: AtlasMeta
}

const OUTCOMES = [
  {
    icon: Search,
    title: 'Buscar tesis relacionadas',
    copy: 'Permite localizar tesis con contenido similar, incluso cuando pertenecen a programas distintos o usan vocabulario diferente.',
  },
  {
    icon: Clock3,
    title: 'Comparar temas por año',
    copy: 'Permite observar cuándo aparece cada tema y cómo cambia su número de tesis a través del tiempo.',
  },
  {
    icon: Network,
    title: 'Comparar programas y profesorado',
    copy: 'Resume la distribución temática de los programas y las asesorías registradas para cada integrante del profesorado.',
  },
]

function methodologyPipeline(modelName: string, embeddingDimension: number) {
  return [
    {
      icon: Database,
      title: 'Obtención de registros',
      copy: 'Descargamos mediante OAI-PMH los metadatos públicos del Repositorio Digital CIDE. Incluimos tesis de licenciatura, maestría y doctorado y conservamos su identificador original.',
    },
    {
      icon: Braces,
      title: 'Limpieza de metadatos',
      copy: 'Conservamos autores, asesores, materias y abstracts con múltiples valores. Eliminamos duplicados y normalizamos Unicode, espacios, entidades HTML, acentos y caracteres especiales.',
    },
    {
      icon: UserRoundCheck,
      title: 'Homologación de nombres',
      copy: 'Comparamos títulos, abreviaturas, orden de apellidos y variantes ortográficas mediante tablas editables. Las coincidencias dudosas se mantienen separadas para evitar unir personas distintas.',
    },
    {
      icon: Languages,
      title: 'Creación de embeddings',
      copy: `El modelo de lenguaje Transformer multilingüe (LLM) ${modelName} procesa el título, el abstract y las materias en español e inglés. El resultado es un vector de ${embeddingDimension} dimensiones por tesis.`,
    },
    {
      icon: Network,
      title: 'Agrupamiento temático',
      copy: 'Aplicamos K-Means sobre los embeddings y evaluamos distintas cantidades de grupos con métricas de separación, estabilidad y traslape de palabras clave. La solución publicada contiene veinte comunidades.',
    },
    {
      icon: MapPinned,
      title: 'Proyección y publicación',
      copy: 'UMAP genera las coordenadas 2D y 3D sin modificar las comunidades calculadas. Después añadimos años, programas y profesorado, verificamos los conteos y generamos el sitio interactivo.',
    },
  ]
}

export function MethodologyView({ meta }: MethodologyViewProps) {
  const modelName = meta.embeddingModel.split('/').at(-1) ?? meta.embeddingModel
  const spanishCount = meta.languageCounts.spa ?? 0
  const englishCount = meta.languageCounts.eng ?? 0
  const unknownLanguageCount = meta.languageCounts.desconocido ?? 0
  const pipeline = methodologyPipeline(modelName, meta.embeddingDimension)

  return (
    <section className="methodology-view" aria-label="Metodología del atlas">
      <div className="method-intro">
        <div className="method-lead">
          <span className="eyebrow">Metodología y fuente</span>
          <h2>{formatNumber(meta.thesisCount)} tesis del Repositorio Digital CIDE</h2>
          <p>
            Esta página describe cómo obtuvimos, limpiamos y analizamos los registros utilizados en el Atlas. También
            explica cómo interpretar los mapas y cuáles son sus limitaciones.
          </p>
          <a href="https://repositorio-digital.cide.edu" target="_blank" rel="noreferrer">
            Consultar el repositorio
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <small>Datos consultados por última vez: {updatedDate(meta.sourceUpdatedAt)}</small>
        </div>
        <dl className="method-snapshot" aria-label="Cobertura del método">
          <div><dt>Tesis</dt><dd>{formatNumber(meta.thesisCount)}</dd></div>
          <div><dt>Programas</dt><dd>{meta.programCount}</dd></div>
          <div><dt>Temas</dt><dd>{meta.clusterCount}</dd></div>
          <div><dt>Periodo</dt><dd>{meta.yearMin}–{meta.yearMax}</dd></div>
        </dl>
      </div>

      <section className="method-value">
        <div className="method-value-copy">
          <span className="eyebrow">Usos del Atlas</span>
          <h3>Qué se puede analizar</h3>
          <p>El Atlas permite comparar el contenido, las fechas, los programas y las asesorías registradas en las tesis.</p>
        </div>
        <div className="method-outcomes">
          {OUTCOMES.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              <h4>{title}</h4>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="method-pipeline-intro">
        <h3>Seis pasos para llegar al Atlas desde el repositorio del CIDE</h3>
        <p>Cada tesis conserva su identificador y vínculo de origen mientras pasa por una cadena común de limpieza, representación semántica, agrupamiento y validación.</p>
      </div>
      <ol className="method-pipeline">
        {pipeline.map(({ icon: Icon, title, copy }, index) => (
          <li key={title}>
            <div className="method-step-index">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="method-reading">
        <section>
          <span className="eyebrow">Distancia entre puntos</span>
          <h3>Cómo interpretar la cercanía</h3>
          <p>
            Los puntos cercanos tienen mayor similitud en sus títulos, abstracts y materias. La cercanía no mide
            calidad, influencia, causalidad ni relaciones de citación.
          </p>
          <p>
            Los mapas 2D y 3D contienen las mismas tesis y comunidades. La vista 3D añade una coordenada que puede
            separar puntos superpuestos en 2D.
          </p>
        </section>
        <section>
          <span className="eyebrow">Colores y comunidades</span>
          <h3>Cómo interpretar los temas</h3>
          <p>
            Cada color corresponde a una comunidad temática. Sus nombres se asignan usando palabras frecuentes,
            tesis representativas y revisión del contenido. Una tesis puede relacionarse con más de un tema.
          </p>
          <p>
            En la vista temporal las coordenadas permanecen fijas y solo se muestran las tesis disponibles hasta el
            año seleccionado.
          </p>
        </section>
      </div>

      <div className="method-quality">
        <div>
          <ShieldCheck size={25} strokeWidth={1.6} aria-hidden="true" />
          <span className="eyebrow">Control de calidad</span>
          <h3>Validaciones realizadas</h3>
        </div>
        <ul>
          <li>Cada tesis aparece una sola vez y mantiene su enlace al repositorio.</li>
          <li>Las {formatNumber(meta.abstractCount)} fichas, equivalentes al {formatPercent(meta.abstractCount / meta.thesisCount)}, incluyen un abstract utilizable.</li>
          <li>Los totales por tema y programa coinciden con la base principal.</li>
          <li>Los nombres homologados pasan por tablas editables y reportes de revisión.</li>
          <li>La codificación se verifica para conservar acentos y caracteres especiales.</li>
        </ul>
      </div>

      <div className="method-limits">
        <div>
          <span className="eyebrow">Alcance</span>
          <h3>Limitaciones</h3>
        </div>
        <ul>
          <li>Las comunidades dependen del modelo y de las decisiones analíticas; no son una clasificación oficial del CIDE.</li>
          <li>Las distancias del mapa aproximan relaciones locales. La separación entre puntos lejanos no debe interpretarse como una medida exacta.</li>
          <li>Cada tesis tiene una comunidad principal, aunque su contenido pueda relacionarse con varios temas.</li>
          <li>La cobertura y calidad de los metadatos dependen de la información disponible en el repositorio.</li>
          <li>El último año puede estar incompleto porque el repositorio sigue recibiendo registros.</li>
        </ul>
      </div>

      <details className="method-technical">
        <summary>
          <Braces size={23} strokeWidth={1.6} aria-hidden="true" />
          <span>
            <span className="eyebrow">Para las personas más curiosas</span>
            <strong>Ver ficha técnica ampliada</strong>
            <small>Corpus, modelo, parámetros, criterios de validación y formatos.</small>
          </span>
          <ChevronDown className="method-technical-chevron" size={21} aria-hidden="true" />
        </summary>
        <div className="method-technical-body">
          <section>
            <span className="eyebrow">Diseño del corpus</span>
            <h3>Fuente, unidad de análisis y cobertura</h3>
            <dl>
              <div><dt>Origen</dt><dd>Repositorio Digital CIDE sobre DSpace; cosecha OAI-PMH de la comunidad institucional con paginación mediante <code>resumptionToken</code>.</dd></div>
              <div><dt>Unidad</dt><dd>Una tesis identificada por su <code>item_handle</code>; el enlace al registro original se conserva como referencia primaria.</dd></div>
              <div><dt>Cobertura</dt><dd>{formatNumber(meta.thesisCount)} tesis de {meta.programCount} combinaciones nivel-programa entre {meta.yearMin} y {meta.yearMax}.</dd></div>
              <div><dt>Abstracts</dt><dd>{formatNumber(meta.abstractCount)} registros con abstract utilizable; cobertura de {formatPercent(meta.abstractCount / meta.thesisCount)}.</dd></div>
              <div><dt>Base canónica</dt><dd><code>tesis_cide.parquet</code>, con un registro por tesis y metadatos multivaluados preservados.</dd></div>
            </dl>
          </section>

          <section>
            <span className="eyebrow">Preparación de datos</span>
            <h3>Normalización textual y de identidades</h3>
            <dl>
              <div><dt>Codificación</dt><dd>UTF-8 y normalización Unicode NFC; la exportación rechaza entidades HTML residuales y coordenadas o identificadores faltantes.</dd></div>
              <div><dt>Campos múltiples</dt><dd>Autores, asesores, abstracts y materias se conservan como listas; no se reducen al primer valor disponible.</dd></div>
              <div><dt>Duplicados</dt><dd>El identificador persistente funciona como clave primaria y se valida su unicidad antes del análisis.</dd></div>
              <div><dt>Profesorado</dt><dd>Alias explícitos, claves sin títulos ni puntuación, fusiones canónicas revisadas y reportes conservadores de posibles duplicados.</dd></div>
              <div><dt>Tablas editables</dt><dd><code>asesores_alias.csv</code> y <code>asesores_canonicos_merge.csv</code> separan las decisiones de homologación del código.</dd></div>
            </dl>
          </section>

          <section>
            <span className="eyebrow">Representación semántica</span>
            <h3>Modelo y representación de cada tesis</h3>
            <dl>
              <div><dt>Familia</dt><dd>Sentence-Transformers con arquitectura MPNet multilingüe, usada como modelo de lenguaje especializado en similitud semántica.</dd></div>
              <div><dt>Modelo</dt><dd><code>{meta.embeddingModel}</code></dd></div>
              <div><dt>Entrada</dt><dd>Concatenación de título, abstract y materias después de normalizar espacios; no se incluyen autoría, programa, nivel ni año.</dd></div>
              <div><dt>Dimensión</dt><dd>{formatNumber(meta.embeddingDimension)} componentes de punto flotante por tesis.</dd></div>
              <div><dt>Geometría</dt><dd>Normalización L2 durante la codificación y comparación mediante similitud o distancia coseno.</dd></div>
              <div><dt>Idiomas</dt><dd>{formatNumber(spanishCount)} tesis en español, {formatNumber(englishCount)} en inglés y {formatNumber(unknownLanguageCount)} sin idioma identificado.</dd></div>
            </dl>
          </section>

          <section>
            <span className="eyebrow">Agrupamiento temático</span>
            <h3>Comunidades calculadas sobre los embeddings</h3>
            <dl>
              <div><dt>Solución principal</dt><dd><code>{meta.clusterAlgorithm}</code> sobre los embeddings originales, con <code>k={meta.clusterCount}</code>, <code>n_init=60</code> y semilla <code>420</code>.</dd></div>
              <div><dt>Granularidad</dt><dd>Se diagnostican valores pares de <code>k</code> entre 8 y 30; veinte macrotemas se conservan por utilidad interpretativa y cobertura sustantiva.</dd></div>
              <div><dt>Contrastes</dt><dd>K-Means sobre UMAP 2D/3D, spherical K-Means, Ward, NMF, LDA y BERTopic con UMAP 10D, HDBSCAN y c-TF-IDF.</dd></div>
              <div><dt>Consenso</dt><dd>Las coasignaciones entre modelos producen 32 subtemas y membresías top-3 con margen de ambigüedad por tesis.</dd></div>
              <div><dt>Etiquetas</dt><dd>Keywords bilingües homologadas, términos distintivos, tesis representativas y revisión sustantiva de cada comunidad.</dd></div>
            </dl>
          </section>

          <section>
            <span className="eyebrow">Reducción dimensional</span>
            <h3>Proyecciones UMAP en 2D y 3D</h3>
            <dl>
              <div><dt>Parámetros</dt><dd><code>n_neighbors=30</code>, <code>min_dist=0.04</code>, métrica coseno y semilla <code>420</code>.</dd></div>
              <div><dt>Proyecciones</dt><dd>Ajustes independientes de UMAP con 2 y 3 componentes sobre los mismos embeddings normalizados.</dd></div>
              <div><dt>Calidad 2D</dt><dd><em>Trustworthiness</em> = {formatCoefficient(meta.umapTrustworthiness.twoD, 3)} para vecindades de 30 observaciones.</dd></div>
              <div><dt>Calidad 3D</dt><dd><em>Trustworthiness</em> = {formatCoefficient(meta.umapTrustworthiness.threeD, 3)} bajo la misma especificación.</dd></div>
              <div><dt>Lectura</dt><dd>Las distancias son aproximaciones locales; ejes, orientación y escala absoluta no tienen interpretación sustantiva.</dd></div>
            </dl>
          </section>

          <section>
            <span className="eyebrow">Validación y publicación</span>
            <h3>Métricas de validación y archivos de salida</h3>
            <dl>
              <div><dt>Estructura</dt><dd>Silhouette, Davies-Bouldin y Calinski-Harabasz; NMI frente a idioma, programa y nivel para detectar particiones dominadas por metadatos.</dd></div>
              <div><dt>Interpretación</dt><dd>Coherencia <code>c_v</code>, diversidad temática, traslape Jaccard de keywords, balance de tamaños y tasa de outliers.</dd></div>
              <div><dt>Robustez</dt><dd>Estabilidad entre semillas, bootstraps y submuestras; selección de alternativas no dominadas mediante frontera de Pareto.</dd></div>
              <div><dt>Trazabilidad</dt><dd>Embeddings, asignaciones, diagnósticos, taxonomía y agregados se conservan en Parquet con identificadores de tesis.</dd></div>
              <div><dt>Publicación</dt><dd>El extracto web reconcilia identificadores, totales y participaciones; después se ejecutan lint, build y pruebas E2E responsive.</dd></div>
            </dl>
          </section>
        </div>
      </details>
    </section>
  )
}
