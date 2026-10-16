// Modelos tipados del contrato de la API (ver backend/API.md)

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type Rol = 'Administrador' | 'Organizador' | 'Operador' | 'Aficionado';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: Rol[];
  password?: string;
  /** Operadores de un organizador: ids a enviar al guardar. */
  campeonatos?: number[];
  campeonatos_asignados?: { id: number; nombre: string }[];
  creado_por_nombre?: string | null;
  /** Operador limitado a ciertos campeonatos (no opera todos). */
  restringido?: boolean;
  /** Cuenta auto-registrada que espera la aprobación de un administrador. */
  pendiente?: boolean;
  rol?: Rol;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: Usuario;
}

export interface EquipoMini {
  id: number;
  nombre: string;
  abreviatura: string;
  escudo: string | null;
  color_principal: string;
}

export interface Equipo extends EquipoMini {
  /** Dueño del equipo; null = del sistema (lo administra el Administrador). */
  propietario: number | null;
  propietario_nombre?: string | null;
  ciudad: string;
  estadio: string;
  entrenador: string;
  activo: boolean;
  num_jugadores?: number;
}

export type Posicion = 'POR' | 'DEF' | 'MED' | 'DEL';

export interface Jugador {
  id: number;
  equipo: number;
  equipo_nombre?: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  numero: number | null;
  posicion: Posicion;
  posicion_nombre?: string;
  fecha_nacimiento: string | null;
  nacionalidad: string;
  identificacion: string;
  foto: string | null;
  activo: boolean;
}

export type FormatoCampeonato = 'LIGA' | 'GRUPOS';
export type ModalidadCampeonato = 'IDA' | 'IDA_VUELTA' | 'RELAMPAGO';
export type EstadoCampeonato = 'BORRADOR' | 'EN_CURSO' | 'FINALIZADO';
export type CriterioDesempate = 'dif_gol' | 'goles_favor' | 'h2h' | 'fair_play';

export interface Campeonato {
  id: number;
  nombre: string;
  temporada: string;
  descripcion: string;
  formato: FormatoCampeonato;
  formato_nombre?: string;
  /** Dueño del campeonato; null = del sistema (lo administra el Administrador). */
  propietario: number | null;
  propietario_nombre?: string | null;
  /** Se define al hacer el sorteo. */
  modalidad: ModalidadCampeonato;
  ida_vuelta: boolean;
  /** Programación de partidos guardada al sortear. */
  dias_semana: number[];
  partidos_por_dia: number | null;
  hora_inicio: string | null;
  minutos_entre_partidos: number;
  /** Minutos de cada tiempo (dos tiempos con entretiempo). No altera la separación entre partidos. */
  duracion_tiempo: number;
  dias_entre_fechas: number;
  /** Reglas de logística: el equipo siempre en el N-ésimo horario del día. */
  horarios_fijos: { equipo: number; orden: number }[];
  num_grupos: number;
  clasificados_por_grupo: number;
  puntos_victoria: number;
  puntos_empate: number;
  puntos_derrota: number;
  criterios_desempate: CriterioDesempate[];
  fecha_inicio: string | null;
  fecha_fin: string | null;
  logo: string | null;
  estado: EstadoCampeonato;
  publicado: boolean;
  num_equipos?: number;
  num_partidos?: number;
  creado?: string;
}

export interface Feriado {
  id: number;
  fecha: string;
  nombre: string;
  /** null = aplica a todos los campeonatos */
  campeonato: number | null;
  campeonato_nombre: string | null;
  /** Se repite todos los años (mismo día y mes). */
  se_repite: boolean;
}

export interface FeriadoConflicto { fecha: string; nombre: string; }

/** Respuesta de `horarios-fijos`: partidos cuyo horario cambia y reglas que no se pudieron cumplir en algún día. */
export interface ResultadoHorarios {
  aplicado: boolean;
  reglas: { equipo: number; orden: number }[];
  cambios: { fecha: string; dia: string; partido: string; de: string; a: string }[];
  sin_aplicar: { equipo: string; dia: string; fecha: string; motivo: string }[];
}

/** Respuesta de `aplicar-feriados`: fechas que se moverían (o se movieron) y partidos en feriado que no se mueven solos. */
export interface ResultadoFeriados {
  aplicado: boolean;
  cambios: { fecha: number; nombre: string; desde: string | null; hasta: string; feriado: string | null; partidos: number }[];
  sin_mover: { fecha: string; dia: string; feriado: string; motivo: string; partido: string }[];
}

export interface Inscripcion {
  id: number;
  campeonato: number;
  equipo: number;
  equipo_detalle: EquipoMini;
  grupo: number | null;
  grupo_nombre: string | null;
}

export type EstadoPartido = 'PENDIENTE' | 'INICIADO' | 'ENTRETIEMPO' | 'SEGUNDO_TIEMPO' | 'FINALIZADO' | 'POSTERGADO';
export type FaseFecha = 'LIGA' | 'GRUPOS' | 'RONDA' | 'OCTAVOS' | 'CUARTOS' | 'SEMIFINAL' | 'FINAL';

export type TipoEvento =
  | 'GOL' | 'GOL_PENAL' | 'AUTOGOL' | 'AMARILLA' | 'DOBLE_AMARILLA' | 'ROJA' | 'CAMBIO' | 'INCIDENCIA';

export interface Evento {
  id: number;
  partido: number;
  tipo: TipoEvento;
  tipo_nombre?: string;
  equipo: number;
  equipo_detalle?: EquipoMini;
  jugador: number | null;
  jugador_nombre?: string | null;
  jugador_relevo: number | null;
  relevo_nombre?: string | null;
  minuto: number;
  /** 1 = primer tiempo, 2 = segundo tiempo. */
  tiempo?: number;
  descripcion: string;
}

export interface Partido {
  id: number;
  campeonato: number;
  campeonato_nombre: string;
  fecha: number;
  fecha_numero: number;
  fecha_nombre: string;
  fase: FaseFecha;
  grupo: number | null;
  grupo_nombre: string | null;
  local: number;
  visitante: number;
  local_detalle: EquipoMini;
  visitante_detalle: EquipoMini;
  fecha_hora: string | null;
  /** Minutos de cada tiempo del campeonato. */
  duracion_tiempo?: number;
  /** Posición en el cuadro de eliminatoria (los ganadores de las llaves 1 y 2 se cruzan, etc.). */
  llave?: number | null;
  /** Hora real de cada fase del partido (ISO); se llenan al cambiar el estado. */
  inicio_at?: string | null;
  fin_primer_tiempo_at?: string | null;
  inicio_segundo_tiempo_at?: string | null;
  fin_at?: string | null;
  estadio: string;
  estado: EstadoPartido;
  estado_nombre: string;
  goles_local: number;
  goles_visitante: number;
  penales_local: number | null;
  penales_visitante: number | null;
  es_vuelta: boolean;
  observaciones?: string;
  motivo_postergacion?: string | null;
  fecha_original?: string | null;
  tarjetas?: { local: ConteoTarjetas; visitante: ConteoTarjetas };
  num_imagenes?: number;
  num_videos?: number;
  eventos?: Evento[];
  medios?: Medio[];
}

export interface Medio {
  id: number;
  partido: number;
  tipo: 'IMAGEN' | 'VIDEO';
  archivo: string;
  nombre_archivo: string;
  titulo: string;
  tamano: number;
  creado: string;
}

export interface ConteoTarjetas {
  amarillas: number;
  rojas: number;
}

export interface TarjetaJugador {
  jugador: number;
  nombre: string;
  foto: string | null;
  equipo: EquipoMini;
  amarillas: number;
  rojas: number;
}

export const MOTIVOS_POSTERGACION = ['Lluvia', 'Cancha no disponible', 'Falta de árbitro', 'Fuerza mayor'];

export interface Descanso {
  id: number;
  equipo: number;
  equipo_detalle: EquipoMini;
  grupo: number | null;
}

export interface Fecha {
  id: number;
  campeonato: number;
  fase: FaseFecha;
  fase_nombre: string;
  numero: number;
  nombre: string;
  fecha_programada: string | null;
  descansos: Descanso[];
  partidos?: Partido[];
}

export interface FilaTabla {
  posicion: number;
  equipo: EquipoMini;
  grupo: string | null;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  amarillas: number;
  rojas: number;
  fair_play: number;
  forma: ('G' | 'E' | 'P')[];
}

export interface BloqueTabla {
  grupo: string | null;
  filas: FilaTabla[];
}

export interface Goleador {
  jugador: number;
  nombre: string;
  foto: string | null;
  equipo: EquipoMini;
  goles: number;
}

export interface Resultados {
  ultimos: Partido[];
  proximos: Partido[];
}

export interface Estadisticas {
  partidos_jugados: number;
  partidos_totales: number;
  goles: number;
  promedio_goles: number;
  amarillas: number;
  rojas: number;
}

export interface FixtureInfo {
  equipos: number;
  fixture_generado: boolean;
  /** Motivo si el sorteo ya no se puede repetir (hay partidos iniciados o jugados); null si aún se puede. */
  sorteo_bloqueado: string | null;
  hay_descanso: boolean;
  grupos_impares: { grupo: string | null; equipos: number }[];
  modalidad_actual: ModalidadCampeonato;
  modalidades: { valor: ModalidadCampeonato; nombre: string }[];
}

export interface Notificacion {
  id: number;
  campeonato: number;
  partido: number | null;
  titulo: string;
  cuerpo: string;
  enviada: boolean;
  error: string;
  creada: string;
  tipo?: TipoNotificacion;
  /** Dispositivos de aficionados notificados. */
  destinatarios?: number;
}

// ---- Cuentas de aficionados, intereses, dispositivos y configuración

export type TipoNotificacion = 'ESTADO' | 'GOL' | 'TARJETA' | 'CAMBIO' | 'INCIDENCIA';
export type ModoNotificacion = 'NADA' | 'TODO' | 'SELECCION';

export const TIPOS_NOTIFICACION: { valor: TipoNotificacion; etiqueta: string }[] = [
  { valor: 'ESTADO', etiqueta: 'Cambios de estado' },
  { valor: 'GOL', etiqueta: 'Goles' },
  { valor: 'TARJETA', etiqueta: 'Tarjetas' },
  { valor: 'CAMBIO', etiqueta: 'Cambios de jugadores' },
  { valor: 'INCIDENCIA', etiqueta: 'Incidencias' },
];

export const etiquetaTipoNotificacion = (t?: string) =>
  ({ ESTADO: 'Estado', GOL: 'Gol', TARJETA: 'Tarjeta', CAMBIO: 'Cambio', INCIDENCIA: 'Incidencia' } as Record<string, string>)[t ?? ''] ?? (t || '—');

export interface Perfil {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: Rol[];
  /** false en cuentas creadas con Google (no tienen contraseña). */
  tiene_clave: boolean;
}

export interface Preferencias {
  modo: ModoNotificacion;
  tipos: TipoNotificacion[];
  campeonatos: number[];
  equipos: number[];
  campeonatos_detalle?: { id: number; nombre: string }[];
  equipos_detalle?: EquipoMini[];
}

export interface Dispositivo {
  id: number;
  tipo: 'WEB' | 'FCM';
  token: string;
  suscripcion: { endpoint: string } | null;
  nombre: string;
  activo: boolean;
  creado: string;
}

export interface ConfigPublica {
  google_client_id: string;
  verificar_correo: boolean;
  vapid_publica: string;
  limites: { max_imagenes_partido: number; max_videos_partido: number; max_mb_imagen: number; max_mb_video: number };
  tipos_notificacion: string[];
}

export interface Configuracion {
  smtp_host: string;
  smtp_puerto: number;
  smtp_usuario: string;
  smtp_clave?: string;
  tiene_clave: boolean;
  smtp_seguridad: 'NINGUNA' | 'STARTTLS' | 'SSL';
  correo_remitente: string;
  correo_configurado: boolean;
  verificar_correo: boolean;
  url_publica: string;
  google_client_id: string;
  max_imagenes_partido: number;
  max_videos_partido: number;
  max_mb_imagen: number;
  max_mb_video: number;
  vapid_publica: string;
  vapid_contacto: string;
}

// ---- Catálogos con etiquetas en español

export const ESTADOS_PARTIDO: { valor: EstadoPartido; etiqueta: string; clase: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente', clase: 'secondary' },
  { valor: 'INICIADO', etiqueta: '1.er tiempo', clase: 'danger' },
  { valor: 'ENTRETIEMPO', etiqueta: 'Entretiempo', clase: 'warning' },
  { valor: 'SEGUNDO_TIEMPO', etiqueta: '2.º tiempo', clase: 'danger' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado', clase: 'success' },
  { valor: 'POSTERGADO', etiqueta: 'Postergado', clase: 'info' },
];

export const TIPOS_EVENTO: { valor: TipoEvento; etiqueta: string; icono: string; clase: string }[] = [
  { valor: 'GOL', etiqueta: 'Gol', icono: 'ri-football-line', clase: 'success' },
  { valor: 'GOL_PENAL', etiqueta: 'Gol de penal', icono: 'ri-focus-3-line', clase: 'success' },
  { valor: 'AUTOGOL', etiqueta: 'Autogol', icono: 'ri-football-line', clase: 'danger' },
  { valor: 'AMARILLA', etiqueta: 'Tarjeta amarilla', icono: 'ri-file-paper-fill', clase: 'warning' },
  { valor: 'DOBLE_AMARILLA', etiqueta: 'Doble amarilla', icono: 'ri-file-copy-fill', clase: 'warning' },
  { valor: 'ROJA', etiqueta: 'Tarjeta roja', icono: 'ri-file-paper-fill', clase: 'danger' },
  { valor: 'CAMBIO', etiqueta: 'Cambio', icono: 'ri-arrow-left-right-line', clase: 'info' },
  { valor: 'INCIDENCIA', etiqueta: 'Incidencia', icono: 'ri-information-line', clase: 'secondary' },
];

export const POSICIONES: { valor: Posicion; etiqueta: string; plural: string }[] = [
  { valor: 'POR', etiqueta: 'Portero', plural: 'Porteros' },
  { valor: 'DEF', etiqueta: 'Defensa', plural: 'Defensas' },
  { valor: 'MED', etiqueta: 'Mediocampista', plural: 'Mediocampistas' },
  { valor: 'DEL', etiqueta: 'Delantero', plural: 'Delanteros' },
];

export const FORMATOS: { valor: FormatoCampeonato; etiqueta: string }[] = [
  { valor: 'LIGA', etiqueta: 'Sin grupos (liga o relámpago)' },
  { valor: 'GRUPOS', etiqueta: 'Fase de grupos + eliminatoria' },
];

export const MODALIDADES: { valor: ModalidadCampeonato; etiqueta: string; descripcion: string; icono: string }[] = [
  { valor: 'IDA', etiqueta: 'Solo ida', descripcion: 'Todos contra todos, un partido por cruce.', icono: 'ri-arrow-right-line' },
  { valor: 'IDA_VUELTA', etiqueta: 'Ida y vuelta', descripcion: 'Todos contra todos, dos partidos por cruce.', icono: 'ri-arrow-left-right-line' },
  { valor: 'RELAMPAGO', etiqueta: 'Relámpago', descripcion: 'Eliminación directa: el que pierde queda fuera.', icono: 'ri-flashlight-line' },
];

export const etiquetaModalidad = (m: string) => MODALIDADES.find(x => x.valor === m)?.etiqueta ?? m;

export const ESTADOS_CAMPEONATO: { valor: EstadoCampeonato; etiqueta: string; clase: string }[] = [
  { valor: 'BORRADOR', etiqueta: 'Borrador', clase: 'secondary' },
  { valor: 'EN_CURSO', etiqueta: 'En curso', clase: 'success' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado', clase: 'primary' },
];

export const CRITERIOS: { valor: CriterioDesempate; etiqueta: string }[] = [
  { valor: 'dif_gol', etiqueta: 'Diferencia de gol' },
  { valor: 'goles_favor', etiqueta: 'Goles a favor' },
  { valor: 'h2h', etiqueta: 'Resultado entre empatados' },
  { valor: 'fair_play', etiqueta: 'Juego limpio' },
];

export const FASES_ELIMINATORIA: FaseFecha[] = ['RONDA', 'OCTAVOS', 'CUARTOS', 'SEMIFINAL', 'FINAL'];

export const ROLES: Rol[] = ['Administrador', 'Organizador', 'Operador'];

export const etiquetaEstadoPartido = (e: string) => ESTADOS_PARTIDO.find(x => x.valor === e)?.etiqueta ?? e;
export const claseEstadoPartido = (e: string) => ESTADOS_PARTIDO.find(x => x.valor === e)?.clase ?? 'secondary';
export const etiquetaFase = (f: string) => ({
  LIGA: 'Liga', GRUPOS: 'Fase de grupos', RONDA: 'Ronda eliminatoria', OCTAVOS: 'Octavos de final', CUARTOS: 'Cuartos de final',
  SEMIFINAL: 'Semifinal', FINAL: 'Final',
} as Record<string, string>)[f] ?? f;
