// Convierte las fotos de fotos-originales/ a WebP optimizado en public/fotos/.
// Uso: npm run fotos
//
// Por cada foto genera dos tamaños:
//   nombre.webp       → 1600 px de ancho máximo (pantallas grandes)
//   nombre-640.webp   → 640 px (celulares)
// Si una foto original es más pequeña que el tamaño, no se agranda.
// Para mejorar la calidad, reemplaza el archivo en fotos-originales/ (mismo nombre)
// por uno de mayor resolución y vuelve a ejecutar el script.
import { mkdir, readdir } from 'node:fs/promises';
import { extname, basename, join } from 'node:path';
import sharp from 'sharp';

const ORIGEN = 'fotos-originales';
const DESTINO = 'public/fotos';
const TAMANOS = [
  { sufijo: '', ancho: 1600 },
  { sufijo: '-640', ancho: 640 },
];
const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp']);

await mkdir(DESTINO, { recursive: true });
const archivos = (await readdir(ORIGEN)).filter((f) => EXTENSIONES.has(extname(f).toLowerCase()));

for (const archivo of archivos) {
  const nombre = basename(archivo, extname(archivo));
  for (const { sufijo, ancho } of TAMANOS) {
    const salida = join(DESTINO, `${nombre}${sufijo}.webp`);
    const info = await sharp(join(ORIGEN, archivo))
      .rotate() // respeta la orientación de la cámara
      .resize({ width: ancho, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(salida);
    console.log(`${salida.padEnd(42)} ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
  }
}
console.log(`\n${archivos.length} fotos optimizadas.`);

// Ícono de la pestaña del navegador: el círculo del logo, recortado sin las esquinas.
const logo = archivos.find((f) => basename(f, extname(f)) === 'logo');
if (logo) {
  const lado = 192;
  const circulo = Buffer.from(`<svg width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}"/></svg>`);
  await sharp(join(ORIGEN, logo))
    .resize(Math.round(lado * 1.04), Math.round(lado * 1.04)) // un poco más grande: el círculo no llega al borde
    .extract({ left: 4, top: 4, width: lado, height: lado })
    .composite([{ input: circulo, blend: 'dest-in' }])
    .png()
    .toFile('public/icono.png');
  console.log('public/icono.png (ícono del navegador)');
}
