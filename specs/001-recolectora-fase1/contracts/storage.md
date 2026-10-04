# Contrato: Storage

| Bucket | Público | Ruta | Sube | Lee | Tipos y tamaño |
|--------|---------|------|------|-----|----------------|
| `bazaar-photo-submissions` | no | `{bazaar_id}/{uuid}.jpg` | bazar (su carpeta) | bazar (su carpeta) y recolectora (enlace firmado, 60 min) | JPEG/PNG/WebP, ≤ 1 MB (comprimidas a ~200 KB) |
| `bazaar-photos` | sí | `{bazaar_id}/{uuid}.jpg` | solo recolectora, al autorizar una propuesta | todos (URL pública) | JPEG/PNG/WebP, ≤ 1 MB |
| `bazaar-documents` | no | `{bazaar_id}/{type}-{uuid}.{ext}` | bazar (su carpeta) | solo recolectora (enlace firmado, 10 min) | JPEG/PNG/WebP/PDF, ≤ 5 MB; solo la recolectora borra: los reemplazados y rechazados (FR-033) y los que el bazar reemplazó estando en revisión, que el bazar anota en `storage_trash` (research R23) |
| `payment-proofs` | no | `{customer_id}/{uuid}.{ext}` | clienta (su carpeta) | solo recolectora (enlace firmado, 10 min) | JPEG/PNG/WebP/PDF, ≤ 5 MB |
| `package-photos` | no | `{customer_id or 'unidentified'}/{uuid}.jpg` | solo recolectora | recolectora; clienta si existe un `packages` suyo con ese `photo_path` (enlace firmado, 60 min) | JPEG, ≤ 1 MB (comprimidas a ~200 KB) |

Reglas:

- Las políticas de `storage.objects` usan `(storage.foldername(name))[1]` contra
  `current_bazaar_id()` / `current_customer_id()` y `is_collector()`.
- Nadie fuera de la recolectora puede listar, actualizar ni borrar objetos de los buckets privados,
  salvo el bazar, que puede borrar sus propios objetos de `bazaar-photo-submissions` que no estén
  en una propuesta `pending`.
- **Moderación de fotos (FR-030)**: el bazar nunca sube al bucket público. Sus fotos van a
  `bazaar-photo-submissions`; al autorizar una propuesta, la recolectora las copia a
  `bazaar-photos` con
  `storage.from('bazaar-photo-submissions').copy(path, path, { destinationBucket: 'bazaar-photos' })`
  usando su sesión, y después se borran las fotos publicadas que se reemplazaron y las copias de
  `bazaar-photo-submissions` ya publicadas.
- Los enlaces firmados se crean en el servidor con la sesión del usuario; si RLS lo niega, la
  acción devuelve "No tienes permiso para ver este archivo".
- Al asignar un paquete "sin identificar" a una clienta, `photo_path` se conserva; la política de
  lectura se basa en la fila de `packages`, no en la carpeta.
