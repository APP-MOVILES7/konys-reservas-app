// Fotos locales de las mesas de ejemplo (assets/Mesas). Se usan como respaldo
// cuando la mesa no tiene foto_url, así la app funciona sin conexión o sin fotos cargadas.
const FOTOS = {
  1: require('../assets/Mesas/mesa 1.jpg'),
  2: require('../assets/Mesas/mesa 2.jpg'),
  3: require('../assets/Mesas/mesa 3.jpg'),
  4: require('../assets/Mesas/mesa 4.jpg'),
  5: require('../assets/Mesas/mesa 5.jpg'),
};

// "Mesa 3" → foto 3; cualquier otro nombre devuelve null.
export function fotoLocalMesa(nombre) {
  const numero = Number.parseInt(String(nombre ?? '').match(/\d+/)?.[0] ?? '', 10);
  return FOTOS[numero] ?? null;
}