# ScrapUMAP Tesis Lic. Economía CIDE

Proyecto para extraer metadatos de tesis de Licenciatura en Economía del repositorio digital del CIDE y construir un mapa semántico con embeddings, UMAP y clustering.

## Flujo Canónico

El proyecto usa Parquet como formato único de datos tabulares persistidos.

1. Ejecutar `ScrapingTesisLicEcoCIDE.qmd`.
2. Generar `tesis_lic_economia_cide.parquet`.
3. Ejecutar `mapa_semantico_tesis.ipynb`.
4. Generar `clusters_tesis.parquet` y `clusters_resumen.parquet`.

## Archivos Principales

- `ScrapingTesisLicEcoCIDE.qmd`: scraping, extracción de metadatos, limpieza básica y normalización de asesores.
- `mapa_semantico_tesis.ipynb`: lectura del Parquet canónico, embeddings multilingües, UMAP, diagnóstico de clusters, visualizaciones y exportación de resultados analíticos.
- `data-raw/asesores_alias.csv`: tabla editable de alias para normalizar nombres de asesores.
- `data-quality/asesores_sin_alias.csv`: reporte generado con asesores que aún no tienen alias explícito.
- `tesis_lic_economia_cide.parquet`: base canónica de tesis.
- `embeddings_tesis.parquet`: cache de embeddings por tesis y modelo.
- `clusters_tesis.parquet`: tesis con cluster y coordenadas UMAP.
- `clusters_resumen.parquet`: resumen enriquecido por cluster, con keywords, tesis representativas y asesores principales.
- `cluster_diagnostics.parquet`: métricas para elegir número de clusters.
- `cluster_anio.parquet`: evolución temporal de clusters por año.
- `cluster_idioma.parquet`: distribución de idioma por cluster.
- `asesor_cluster_resumen.parquet`: cruce asesor-cluster.
- `asesor_resumen.parquet`: volumen y diversidad temática por asesor.

## Dependencias

R:

```r
install.packages(c("arrow", "dplyr", "purrr", "rvest", "stringr", "tibble", "xml2"))
```

Python:

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python -r requirements.txt
```

Para reproducir exactamente el entorno probado en esta máquina:

```bash
uv pip install --python .venv/bin/python -r requirements.lock.txt
```

## Ejecución

Con Quarto instalado:

```bash
quarto render ScrapingTesisLicEcoCIDE.qmd --execute
```

En esta máquina también hay una instalación local ignorada por git en `.tools/quarto`, y `make scrape` la usa automáticamente si existe.

Para ejecutar el notebook desde terminal:

```bash
.venv/bin/jupyter nbconvert --to notebook --execute --inplace mapa_semantico_tesis.ipynb
```

También puedes usar:

```bash
make scrape
make clusters
```

## Notas Metodológicas

- La paginación del scraper no asume un número fijo de tesis; avanza hasta que el repositorio deja de devolver resultados.
- El clustering actual usa K-Means sobre embeddings multilingües; UMAP se usa como layout visual. La notebook exporta diagnósticos para revisar el número de clusters antes de usarlos como clasificación sustantiva.
- El modelo de embeddings por defecto es `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, elegido por ser multilingüe, ligero para CPU y razonable con 8 GB de RAM. Puedes probar otro modelo con `ST_MODEL_NAME=... make clusters`.
- La columna `asesor_unificado` reduce variantes textuales del nombre de asesor usando `data-raw/asesores_alias.csv`. Si el repositorio cambia o se agregan nuevas tesis, revisar `data-quality/asesores_sin_alias.csv`, ampliar la tabla de alias y volver a correr `make scrape` antes de interpretar redes de asesoría.
