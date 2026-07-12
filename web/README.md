# Atlas de Tesis CIDE

SPA de exploración visual construida sobre los Parquet generados en la raíz del proyecto.

```bash
make web-data
npm --prefix web run dev
```

## Verificación

```bash
npm --prefix web run lint
npm --prefix web run build
npm --prefix web run test:e2e
```

Los archivos de `public/data/` son derivados reproducibles. No deben editarse manualmente; se regeneran con `scripts/export_web_data.py`.
