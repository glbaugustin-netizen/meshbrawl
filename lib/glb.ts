// Compression de GLB côté navigateur (textures + géométrie) via gltf-transform.
// Partagé entre la page de jeu et la page de test.

// Taille max des textures après compression (px sur le plus grand côté).
const TEXTURE_MAX_PX = 2048;

// Réduit + ré-encode les textures embarquées d'un GLB, côté navigateur (canvas).
// C'est LE gros levier de taille : sur un GLB typique les textures pèsent bien
// plus que la géométrie. On redimensionne au-delà de TEXTURE_MAX_PX et on
// ré-encode ; on ne remplace l'image que si on gagne réellement de la place.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function downscaleTextures(doc: any): Promise<void> {
  const textures = doc.getRoot().listTextures();
  for (const texture of textures) {
    const image = texture.getImage();
    const mime  = texture.getMimeType();
    if (!image || !mime?.startsWith('image/')) continue;

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(new Blob([image], { type: mime }));
    } catch {
      continue; // format non décodable par le navigateur → on laisse tel quel
    }

    const max   = Math.max(bitmap.width, bitmap.height);
    const scale = max > TEXTURE_MAX_PX ? TEXTURE_MAX_PX / max : 1;
    const w     = Math.max(1, Math.round(bitmap.width  * scale));
    const h     = Math.max(1, Math.round(bitmap.height * scale));

    // On ré-encode au même format (préserve l'alpha des PNG) ; le webp reste webp.
    const outMime = mime === 'image/jpeg' ? 'image/jpeg'
                  : mime === 'image/webp' ? 'image/webp'
                  : 'image/png';

    let blob: Blob | null = null;
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) { bitmap.close(); continue; }
        ctx.drawImage(bitmap, 0, 0, w, h);
        blob = await canvas.convertToBlob({ type: outMime, quality: 0.85 });
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { bitmap.close(); continue; }
        ctx.drawImage(bitmap, 0, 0, w, h);
        blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, outMime, 0.85));
      }
    } catch {
      bitmap.close();
      continue;
    }
    bitmap.close();

    if (blob && blob.size < image.byteLength) {
      texture.setImage(new Uint8Array(await blob.arrayBuffer()));
      texture.setMimeType(outMime);
    }
  }
}

// Compresse un GLB côté navigateur via gltf-transform. Pipeline en 3 étapes
// indépendantes (chacune dans son try → un échec n'annule pas les autres gains) :
//   1. nettoyage : dedup + prune + weld (weld = indispensable avant Draco)
//   2. textures  : redimensionnement + ré-encodage
//   3. géométrie : Draco (KHR_draco_mesh_compression) — décodé NATIVEMENT par
//      <model-viewer> (contrairement à meshopt qui donnait un rendu vide).
// Les libs sont importées dynamiquement pour ne pas alourdir le bundle initial.
export async function compressGlb(file: File): Promise<File> {
  const [core, extensions, functions] = await Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('@gltf-transform/functions'),
  ]);

  const io = new core.WebIO().registerExtensions(extensions.ALL_EXTENSIONS);

  const doc = await io.readBinary(new Uint8Array(await file.arrayBuffer()));

  // 1. Nettoyage (weld indexe la géométrie → requis par Draco)
  try {
    await doc.transform(functions.dedup(), functions.prune(), functions.weld());
  } catch (e) { console.error('Nettoyage GLB échoué:', e); }

  // 2. Textures
  try {
    await downscaleTextures(doc);
  } catch (e) { console.error('Compression textures échouée:', e); }

  // 3. Géométrie Draco
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dracoMod: any = await import('draco3dgltf');
    const createEnc = dracoMod.createEncoderModule ?? dracoMod.default?.createEncoderModule;
    const createDec = dracoMod.createDecoderModule ?? dracoMod.default?.createDecoderModule;
    const [encoder, decoder] = await Promise.all([createEnc(), createDec()]);

    io.registerDependencies({ 'draco3d.encoder': encoder, 'draco3d.decoder': decoder });

    doc
      .createExtension(extensions.KHRDracoMeshCompression)
      .setRequired(true)
      .setEncoderOptions({
        method: extensions.KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
      });
  } catch (e) { console.error('Draco échoué:', e); }

  const output = await io.writeBinary(doc);
  return new File([output as BlobPart], file.name, { type: 'model/gltf-binary' });
}
