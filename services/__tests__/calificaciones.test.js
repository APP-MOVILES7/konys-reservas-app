import { crearPorCodigo, listarPorSede, listarPuntuaciones, promedioTexto, resumirCalificaciones } from '../calificaciones';
import { generarCodigoReserva, normalizarCodigo, LONGITUD_CODIGO } from '../codigos';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));

// Cadena encadenable que resuelve con la respuesta dada al final (then).
function cadena(respuesta) {
  const c = {};
  for (const m of ['select', 'eq', 'gte', 'order']) c[m] = jest.fn(() => c);
  c.then = (resolver, rechazar) => Promise.resolve(respuesta).then(resolver, rechazar);
  return c;
}

describe('U-08: código de reserva (F5)', () => {
  it('genera 8 caracteres del alfabeto sin ambigüedades', () => {
    for (let i = 0; i < 50; i += 1) {
      const codigo = generarCodigoReserva();
      expect(codigo).toHaveLength(LONGITUD_CODIGO);
      expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]+$/);
    }
  });
  it('normaliza a mayúsculas y sin espacios', () => {
    expect(normalizarCodigo(' k7q2m9xd ')).toBe('K7Q2M9XD');
    expect(normalizarCodigo(null)).toBe('');
  });
});

describe('U-08: resumen de calificaciones (F5)', () => {
  it('calcula promedio, total y distribución por estrella', () => {
    const r = resumirCalificaciones([{ puntuacion: 5 }, { puntuacion: 5 }, { puntuacion: 4 }, { puntuacion: 1 }]);
    expect(r.total).toBe(4);
    expect(r.promedio).toBeCloseTo(3.75);
    expect(r.conteo).toEqual([0, 1, 0, 0, 1, 2]);
  });
  it('ignora valores inválidos y maneja el vacío', () => {
    expect(resumirCalificaciones([])).toEqual({ total: 0, promedio: null, conteo: [0, 0, 0, 0, 0, 0] });
    expect(resumirCalificaciones([{ puntuacion: 9 }, { puntuacion: 'x' }]).total).toBe(0);
    expect(resumirCalificaciones(null).promedio).toBeNull();
  });
  it('formatea el promedio con coma decimal', () => {
    expect(promedioTexto(4.6)).toBe('4,6');
    expect(promedioTexto(null)).toBeNull();
  });
});

describe('U-08: acceso a calificaciones (F5)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crearPorCodigo llama a la función con el código normalizado', async () => {
    supabase.rpc.mockResolvedValue({ data: { sede: 'Sede Cabecera', mesa: 'Mesa 2', fecha: '2026-10-22' }, error: null });
    const resultado = await crearPorCodigo(' k7q2m9xd ', 5);
    expect(supabase.rpc).toHaveBeenCalledWith('calificar_reserva', { p_codigo: 'K7Q2M9XD', p_puntuacion: 5 });
    expect(resultado.data.sede).toBe('Sede Cabecera');
  });

  it('listarPuntuaciones filtra por sede y, si hay, por fecha', async () => {
    const c = cadena({ data: [{ puntuacion: 5 }], error: null });
    supabase.from.mockReturnValue(c);
    const resultado = await listarPuntuaciones('s1', { desde: '2026-10-01T00:00:00.000Z' });
    expect(supabase.from).toHaveBeenCalledWith('calificaciones');
    expect(c.eq).toHaveBeenCalledWith('sede_id', 's1');
    expect(c.gte).toHaveBeenCalledWith('creado_en', '2026-10-01T00:00:00.000Z');
    expect(resultado.data).toHaveLength(1);
  });

  it('listarPorSede usa la función SQL con el límite', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });
    await listarPorSede('s1', 10);
    expect(supabase.rpc).toHaveBeenCalledWith('calificaciones_de_sede', { p_sede_id: 's1', p_limite: 10 });
  });

  it('traduce el error del servidor', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'KONYS_RESERVA_NO_COMPLETADA' } });
    const resultado = await crearPorCodigo('K7Q2M9XD', 5);
    expect(resultado.error).toContain('se completó');
  });
});
