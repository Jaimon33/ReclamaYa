// Empaqueta los PNG de 16, 32 y 48 px en favicon.ico (formato ICO con imágenes PNG).
import fs from 'node:fs';
const tamanos = [16, 32, 48];
const imagenes = tamanos.map(t => fs.readFileSync(`marca/icono-${t}.png`));
const cabecera = Buffer.alloc(6 + 16 * imagenes.length);
cabecera.writeUInt16LE(0, 0); cabecera.writeUInt16LE(1, 2); cabecera.writeUInt16LE(imagenes.length, 4);
let desplazamiento = cabecera.length;
imagenes.forEach((img, i) => {
  const o = 6 + i * 16;
  cabecera[o] = tamanos[i]; cabecera[o + 1] = tamanos[i];
  cabecera.writeUInt16LE(1, o + 4); cabecera.writeUInt16LE(32, o + 6);
  cabecera.writeUInt32LE(img.length, o + 8); cabecera.writeUInt32LE(desplazamiento, o + 12);
  desplazamiento += img.length;
});
fs.writeFileSync('favicon.ico', Buffer.concat([cabecera, ...imagenes]));
fs.copyFileSync('marca/icono-180.png', 'apple-touch-icon.png');
console.log('favicon.ico y apple-touch-icon.png actualizados');
