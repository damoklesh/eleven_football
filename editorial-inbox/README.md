# Editorial inbox

Solo las ramas `newsroom/YYYY-MM-DD` contienen lotes editoriales reales en este directorio.

`main` conserva únicamente este archivo. No copies manualmente contenido desde `editorial-inbox/` a `content/articles/` ni a `public/images/`: GitHub Actions valida el lote, lo importa en una copia confiable de `main` y publica únicamente los Markdown e imágenes aprobados.

Cada lote debe cumplir el contrato v2:

```text
editorial-inbox/YYYY-MM-DD/
├── manifest.json
├── editorial-report.md
├── articles/<slug>.md
└── images/<slug>.png
```

No se aceptan ZIPs, código ejecutable, workflows ni archivos ajenos al contrato.
