import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BloqueTabla, Campeonato, Estadisticas, Fecha, FixtureInfo, Goleador, Inscripcion, ModalidadCampeonato, Resultados,
  ResultadoFeriados, ResultadoHorarios, TarjetaJugador,
} from '../models';
import { silentContext } from './api-utils';
import { CrudService } from './crud.service';

export interface OpcionesFixture {
  modalidad?: ModalidadCampeonato;
  confirmar_descanso?: boolean;
  fecha_inicio?: string;
  /** 1 = lunes ... 7 = domingo */
  dias_semana?: number[];
  /** 0 o vacío: todos los partidos de la fecha el mismo día */
  partidos_por_dia?: number;
  hora_inicio?: string;
  minutos_entre_partidos?: number;
  dias_entre_fechas?: number;
  /** Qué hacer si algún partido cae en feriado: saltar esas fechas o jugar igual (el servidor pregunta si no se indica). */
  feriados?: 'omitir' | 'jugar';
  /** Partidos de la fecha 1 elegidos a mano (ids de equipo); el resto se sortea. */
  primera_fecha?: { local: number; visitante: number }[];
  regenerar?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CampeonatoService extends CrudService<Campeonato> {
  constructor(http: HttpClient) { super(http, 'campeonatos'); }

  private a(id: number, accion: string) { return `${this.url}${id}/${accion}/`; }

  equipos(id: number): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(this.a(id, 'equipos'));
  }

  fijarEquipos(id: number, equipos: number[]): Observable<Inscripcion[]> {
    return this.http.post<Inscripcion[]>(this.a(id, 'equipos'), { equipos });
  }

  sortearGrupos(id: number): Observable<Inscripcion[]> {
    return this.http.post<Inscripcion[]>(this.a(id, 'sortear-grupos'), {});
  }

  fixtureInfo(id: number): Observable<FixtureInfo> {
    return this.http.get<FixtureInfo>(this.a(id, 'fixture-info'));
  }

  /** El 409 (requiere confirmar descanso) lo gestiona el llamador, por eso es silenciosa. */
  generarFixture(id: number, opciones: OpcionesFixture): Observable<{ fechas: number; partidos: number }> {
    return this.http.post<{ fechas: number; partidos: number }>(this.a(id, 'generar-fixture'), opciones, { context: silentContext() });
  }

  calendario(id: number): Observable<Fecha[]> {
    return this.http.get<Fecha[]>(this.a(id, 'calendario'));
  }

  tabla(id: number): Observable<BloqueTabla[]> {
    return this.http.get<BloqueTabla[]>(this.a(id, 'tabla'));
  }

  goleadores(id: number, limite = 20): Observable<Goleador[]> {
    return this.http.get<Goleador[]>(this.a(id, 'goleadores'), { params: { limite } });
  }

  /** PDF del calendario completo (con Bearer, sirve también para campeonatos no publicados). */
  calendarioPdf(id: number): Observable<Blob> {
    return this.http.get(this.a(id, 'calendario-pdf'), { responseType: 'blob' });
  }

  tarjetas(id: number, limite = 30): Observable<TarjetaJugador[]> {
    return this.http.get<TarjetaJugador[]>(this.a(id, 'tarjetas'), { params: { limite } });
  }

  resultados(id: number, limite = 10): Observable<Resultados> {
    return this.http.get<Resultados>(this.a(id, 'resultados'), { params: { limite } });
  }

  estadisticas(id: number): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(this.a(id, 'estadisticas'));
  }

  generarEliminatoria(id: number): Observable<Fecha> {
    return this.http.post<Fecha>(this.a(id, 'generar-eliminatoria'), {});
  }

  /** Sin `confirmar` sólo simula; con `confirmar` guarda las reglas y reordena los horarios de los partidos pendientes. */
  horariosFijos(id: number, reglas: { equipo: number; orden: number }[], confirmar = false): Observable<ResultadoHorarios> {
    return this.http.post<ResultadoHorarios>(this.a(id, 'horarios-fijos'), { reglas, confirmar });
  }

  /** Sin `confirmar` sólo simula; con `confirmar` mueve al siguiente día disponible los partidos pendientes en feriado. */
  aplicarFeriados(id: number, confirmar = false): Observable<ResultadoFeriados> {
    return this.http.post<ResultadoFeriados>(this.a(id, 'aplicar-feriados'), { confirmar });
  }

  /** Deshace el sorteo por completo (fechas, partidos, descansos y grupos); conserva los equipos inscritos. */
  limpiarSorteo(id: number): Observable<{ partidos: number; fechas: number; grupos: number }> {
    return this.http.post<{ partidos: number; fechas: number; grupos: number }>(this.a(id, 'limpiar-sorteo'), {});
  }

  /**
   * Asigna día y hora a los partidos de una ronda (semifinal, final...). `fecha_hora` en ISO 8601.
   * El 409 (partidos en feriado) lo gestiona el llamador, por eso es silenciosa.
   */
  programarRonda(fechaId: number, partidos: { id: number; fecha_hora: string }[], confirmarFeriados = false): Observable<Fecha> {
    return this.http.post<Fecha>(`${environment.apiUrl}fechas/${fechaId}/programar/`,
      { partidos, confirmar_feriados: confirmarFeriados }, { context: silentContext() });
  }

  /** El 409 (confirmar descanso) lo gestiona el llamador, por eso es silenciosa. */
  avanzarEliminatoria(id: number, confirmarDescanso = false): Observable<Fecha | { detail: string }> {
    return this.http.post<Fecha | { detail: string }>(
      this.a(id, 'avanzar-eliminatoria'), { confirmar_descanso: confirmarDescanso }, { context: silentContext() });
  }
}
