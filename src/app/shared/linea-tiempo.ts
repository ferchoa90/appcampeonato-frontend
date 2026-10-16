import { Evento, Partido } from '../core/models';

/** Marca de fase dentro de la cronología: inicio, fin del primer tiempo, inicio del segundo y final. */
export interface MarcaLinea { tipo: 'marca'; texto: string; hora: string | null; icono: string; }
export interface EventoLinea { tipo: 'evento'; evento: Evento; }
export type ItemLinea = MarcaLinea | EventoLinea;

type PartidoLinea = Pick<Partido, 'estado' | 'inicio_at' | 'fin_primer_tiempo_at' | 'inicio_segundo_tiempo_at' | 'fin_at'>;

function hora(iso: string | null | undefined): string | null {
  if (!iso) { return null; }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Cronología del partido: eventos del primer tiempo, «Fin del 1.er tiempo», «Inicio del 2.º tiempo» y eventos del
 * segundo. Las marcas aparecen cuando el partido llegó a esa fase (o hay hora registrada: los partidos jugados
 * antes de existir el segundo tiempo no las muestran). Con `descendente` va lo más reciente arriba.
 */
export function lineaDeTiempo(p: PartidoLinea, eventos: Evento[], descendente = false): ItemLinea[] {
  const ordenados = [...eventos].sort((a, b) => (a.tiempo ?? 1) - (b.tiempo ?? 1) || a.minuto - b.minuto || a.id - b.id);
  const primero = ordenados.filter(e => (e.tiempo ?? 1) === 1);
  const segundo = ordenados.filter(e => (e.tiempo ?? 1) === 2);
  const marca = (texto: string, iso: string | null | undefined, icono: string): MarcaLinea => ({ tipo: 'marca', texto, hora: hora(iso), icono });
  const lista = (es: Evento[]): ItemLinea[] => es.map(evento => ({ tipo: 'evento', evento }));

  const items: ItemLinea[] = [];
  if (p.inicio_at) { items.push(marca('Inicio del partido', p.inicio_at, 'ri-play-circle-line')); }
  items.push(...lista(primero));
  if (p.fin_primer_tiempo_at || p.estado === 'ENTRETIEMPO' || p.estado === 'SEGUNDO_TIEMPO') {
    items.push(marca('Fin del 1.er tiempo', p.fin_primer_tiempo_at, 'ri-pause-circle-line'));
  }
  if (p.inicio_segundo_tiempo_at || p.estado === 'SEGUNDO_TIEMPO') {
    items.push(marca('Inicio del 2.º tiempo', p.inicio_segundo_tiempo_at, 'ri-play-circle-line'));
  }
  items.push(...lista(segundo));
  if (p.estado === 'FINALIZADO' && p.fin_at) { items.push(marca('Final del partido', p.fin_at, 'ri-flag-line')); }
  return descendente ? items.reverse() : items;
}
