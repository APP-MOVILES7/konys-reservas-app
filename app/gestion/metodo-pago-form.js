// F4 (mockup 16b): crear o editar un método de pago de la sede. Las llaves son datos
// ficticios o reales de la sede; no se validan pagos ni se guardan datos de tarjetas.
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { colors } from '../../constants/colors';
import { TIPOS_PAGO } from '../../constants/dominio';
import { actualizar, crear, obtener } from '../../services/metodosPago';
import { validarMetodoPago } from '../../services/validaciones';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import EstadoPantalla from '../../components/EstadoPantalla';

const vacio = { tipo: 'bre-b', titular: '', llave: '', instrucciones: '', activo: true };

const etiquetaLlave = (tipo) => {
  if (tipo === 'bre-b') return 'Llave Bre-B';
  if (tipo === 'nequi') return 'Celular o llave Nequi';
  if (tipo === 'bancolombia') return 'Número de cuenta';
  return 'Llave o cuenta';
};

export default function MetodoPagoFormScreen() {
  const { metodoId } = useLocalSearchParams();
  const { sedeGestion: sede } = useSesionPersonal();
  const sedeId = sede?.id;
  const navigation = useNavigation();
  const [carga, setCarga] = useState({ cargando: !!metodoId, error: null });
  const [form, setForm] = useState(vacio);
  const [enviando, setEnviando] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueo = useRef(false);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    if (!metodoId) return;
    setCarga({ cargando: true, error: null });
    const resultado = await obtener(metodoId);
    if (!montada.current) return;
    if (resultado.error || !resultado.data) {
      setCarga({ cargando: false, error: resultado.error ?? 'El método de pago ya no existe.' });
      return;
    }
    const m = resultado.data;
    setForm({
      tipo: m.tipo, titular: m.titular, llave: m.llave,
      instrucciones: m.instrucciones ?? '', activo: m.activo,
    });
    setCarga({ cargando: false, error: null });
  }, [metodoId]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; };
  }, [cargar]));

  useEffect(() => {
    if (sede) navigation.setOptions({ title: `${metodoId ? 'Editar' : 'Nuevo'} método de pago · ${sede.nombre}` });
  }, [navigation, sede, metodoId]);

  const validacion = validarMetodoPago(form);
  const cambiar = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));

  async function guardar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido || !sedeId) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const datos = {
        tipo: form.tipo,
        titular: form.titular.trim(),
        llave: form.llave.trim(),
        instrucciones: form.instrucciones.trim() || null,
        activo: form.activo,
      };
      const resultado = metodoId ? await actualizar(metodoId, datos) : await crear({ ...datos, sede_id: sedeId });
      if (!montada.current) return;
      if (resultado.error) setAviso(resultado.error);
      else router.back();
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  const guardia = useGuardiaPersonal(['pagos.gestionar']);
  if (guardia) return guardia;
  if (carga.cargando) return <EstadoPantalla cargando />;
  if (carga.error) return <EstadoPantalla mensaje={carga.error} onReintentar={cargar} />;

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {!!aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      <Text style={styles.seccion}>Tipo</Text>
      <View style={styles.chips}>
        {Object.entries(TIPOS_PAGO).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
          accessibilityState={{ selected: form.tipo === valor }} onPress={() => { cambiar('tipo', valor); setTocado(true); }}
          style={[styles.chip, form.tipo === valor && styles.chipElegido]}>
          <Text style={[styles.chipTexto, form.tipo === valor && styles.chipTextoElegido]}>{etiqueta}</Text>
        </Pressable>)}
      </View>
      {tocado && validacion.errores.tipo && <Text style={styles.error}>{validacion.errores.tipo}</Text>}
      <Campo etiqueta="Titular" value={form.titular} onChangeText={(v) => cambiar('titular', v)}
        autoCapitalize="words" error={tocado ? validacion.errores.titular : null}
        ayuda="Nombre de la persona o empresa dueña de la cuenta." />
      <Campo etiqueta={etiquetaLlave(form.tipo)} value={form.llave} onChangeText={(v) => cambiar('llave', v)}
        autoCapitalize="none" error={tocado ? validacion.errores.llave : null}
        ayuda="El cliente la copia desde la pantalla de pago." />
      <Campo etiqueta="Instrucciones (opcional)" value={form.instrucciones} onChangeText={(v) => cambiar('instrucciones', v)}
        multiline numberOfLines={3} error={tocado ? validacion.errores.instrucciones : null}
        ayuda="Por ejemplo: muestra el comprobante al llegar." />
      <View style={styles.filaSwitch}>
        <Text style={styles.seccion}>Método activo</Text>
        <Switch accessibilityLabel="Método activo" value={form.activo} onValueChange={(v) => cambiar('activo', v)}
          trackColor={{ true: colors.primario, false: colors.ocupado }} />
      </View>
      <Boton titulo="Guardar método" cargando={enviando} onPress={guardar} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 14 },
  seccion: { fontSize: 16, fontWeight: '700', color: colors.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
});
