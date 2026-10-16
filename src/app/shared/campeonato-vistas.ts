import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription, timer, switchMap, catchError, EMPTY } from 'rxjs';
import {
  BloqueTabla, Estadisticas, FASES_ELIMINATORIA, Fecha, Goleador, Inscripcion, Resultados, TarjetaJugador, etiquetaFase,
} from '../core/models';
import { descargarArchivo, nombreArchivo, silentContext } from '../core/services/api-utils';
import { CampeonatoService } from '../core/services/campeonato.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const REFRESCO_MS = 30000;

/** Tabla de posiciones (por grupo si aplica). */
@Component({
  selector: 'app-tabla-posiciones',
  template: `
    <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !bloques.length" mensaje="Aún no hay tabla de posiciones."></app-estado-lista>
    <div *ngFor="let b of bloques" class="mb-4">
      <h6 *ngIf="b.grupo" class="titulo-seccion">{{ b.grupo }}</h6>
      <div class="table-responsive tabla-posiciones">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th class="text-center">#</th><th>Equipo</th>
              <th class="text-center" title="Partidos jugados">PJ</th><th class="text-center" title="Ganados">PG</th>
              <th class="text-center" title="Empatados">PE</th><th class="text-center" title="Perdidos">PP</th>
              <th class="text-center" title="Goles a favor">GF</th><th class="text-center" title="Goles en contra">GC</th>
              <th class="text-center" title="Diferencia de gol">DG</th><th class="text-center" title="Puntos">Pts</th>
              <th class="text-center d-none d-md-table-cell">Forma</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of b.filas" [class.clasifica]="clasificados && f.posicion <= clasificados">
              <td class="text-center fw-semibold">{{ f.posicion }}</td>
              <td><a [routerLink]="['/equipo', f.equipo.id]" class="equipo-link"><app-escudo [equipo]="f.equipo" [tam]="24"></app-escudo> <span>{{ f.equipo.nombre }}</span></a></td>
              <td class="text-center">{{ f.pj }}</td><td class="text-center">{{ f.pg }}</td>
              <td class="text-center">{{ f.pe }}</td><td class="text-center">{{ f.pp }}</td>
              <td class="text-center">{{ f.gf }}</td><td class="text-center">{{ f.gc }}</td>
              <td class="text-center">{{ f.dg > 0 ? '+' + f.dg : f.dg }}</td>
              <td class="text-center fw-bold">{{ f.pts }}</td>
              <td class="text-center d-none d-md-table-cell">
                <span *ngFor="let r of f.forma" class="forma" [ngClass]="'forma-' + r">{{ r }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`,
})
export class TablaPosicionesComponent implements OnChanges {
  @Input() campeonatoId!: number;
  /** Si es mayor que 0 resalta a los que clasifican por grupo. */
  @Input() clasificados = 0;
  bloques: BloqueTabla[] = [];
  cargando = true;

  constructor(private api: CampeonatoService) {}

  ngOnChanges() {
    this.cargando = true;
    this.api.tabla(this.campeonatoId).subscribe({
      next: t => { this.bloques = t; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }
}

@Component({
  selector: 'app-goleadores',
  template: `
    <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !lista.length" mensaje="Todavía no hay goles registrados."></app-estado-lista>
    <div class="table-responsive" *ngIf="lista.length">
      <table class="table table-sm align-middle">
        <thead><tr><th class="text-center">#</th><th>Jugador</th><th>Equipo</th><th class="text-center">Goles</th></tr></thead>
        <tbody>
          <tr *ngFor="let g of lista; let i = index">
            <td class="text-center fw-semibold">{{ i + 1 }}</td>
            <td><div class="d-flex align-items-center gap-2">
              <img *ngIf="g.foto; else sinFoto" [src]="g.foto" class="rounded-circle" width="32" height="32" style="object-fit:cover" alt="">
              <ng-template #sinFoto><span class="avatar-xs"><span class="avatar-title rounded-circle badge-soft-primary">{{ g.nombre.charAt(0) }}</span></span></ng-template>
              {{ g.nombre }}</div></td>
            <td><a [routerLink]="['/equipo', g.equipo.id]" class="equipo-link"><app-escudo [equipo]="g.equipo" [tam]="22"></app-escudo> {{ g.equipo.nombre }}</a></td>
            <td class="text-center fw-bold">{{ g.goles }}</td>
          </tr>
        </tbody>
      </table>
    </div>`,
})
export class GoleadoresComponent implements OnChanges {
  @Input() campeonatoId!: number;
  lista: Goleador[] = [];
  cargando = true;

  constructor(private api: CampeonatoService) {}

  ngOnChanges() {
    this.cargando = true;
    this.api.goleadores(this.campeonatoId, 20).subscribe({
      next: g => { this.lista = g; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }
}

/** Botón que descarga el calendario completo en PDF. */
@Component({
  selector: 'app-descargar-calendario',
  template: `
    <button type="button" class="btn btn-soft-primary" (click)="descargar()" [disabled]="cargando">
      <span *ngIf="cargando; else icono" class="spinner-border spinner-border-sm me-1"></span>
      <ng-template #icono><i class="ri-file-pdf-line align-middle me-1"></i></ng-template>
      Descargar calendario (PDF)
    </button>`,
})
export class DescargarCalendarioComponent {
  @Input() campeonatoId!: number;
  @Input() nombre = '';
  cargando = false;

  constructor(private api: CampeonatoService) {}

  descargar() {
    this.cargando = true;
    // el interceptor muestra el toast de error si falla
    this.api.calendarioPdf(this.campeonatoId).subscribe({
      next: blob => { this.cargando = false; descargarArchivo(blob, `calendario-${nombreArchivo(this.nombre)}.pdf`); },
      error: () => (this.cargando = false),
    });
  }
}

/** Ranking de tarjetas por jugador. */
@Component({
  selector: 'app-tarjetas-ranking',
  template: `
    <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !lista.length" mensaje="Todavía no hay tarjetas registradas."></app-estado-lista>
    <div class="table-responsive" *ngIf="lista.length">
      <table class="table table-sm align-middle">
        <thead><tr><th class="text-center">#</th><th>Jugador</th><th>Equipo</th>
          <th class="text-center"><i class="tj tj-amarilla"></i> Amarillas</th><th class="text-center"><i class="tj tj-roja"></i> Rojas</th></tr></thead>
        <tbody>
          <tr *ngFor="let t of lista; let i = index">
            <td class="text-center fw-semibold">{{ i + 1 }}</td>
            <td><div class="d-flex align-items-center gap-2">
              <img *ngIf="t.foto; else sinFoto" [src]="t.foto" class="rounded-circle" width="32" height="32" style="object-fit:cover" alt="">
              <ng-template #sinFoto><span class="avatar-xs"><span class="avatar-title rounded-circle badge-soft-primary">{{ t.nombre.charAt(0) }}</span></span></ng-template>
              {{ t.nombre }}</div></td>
            <td><a [routerLink]="['/equipo', t.equipo.id]" class="equipo-link"><app-escudo [equipo]="t.equipo" [tam]="22"></app-escudo> {{ t.equipo.nombre }}</a></td>
            <td class="text-center fw-bold">{{ t.amarillas }}</td>
            <td class="text-center fw-bold">{{ t.rojas }}</td>
          </tr>
        </tbody>
      </table>
    </div>`,
})
export class TarjetasRankingComponent implements OnChanges {
  @Input() campeonatoId!: number;
  lista: TarjetaJugador[] = [];
  cargando = true;

  constructor(private api: CampeonatoService) {}

  ngOnChanges() {
    this.cargando = true;
    this.api.tarjetas(this.campeonatoId, 30).subscribe({
      next: t => { this.lista = t; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }
}

@Component({
  selector: 'app-equipos-inscritos',
  template: `
    <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !inscritos.length" mensaje="Aún no hay equipos inscritos."></app-estado-lista>
    <ng-container *ngFor="let g of grupos">
      <h6 *ngIf="g.nombre" class="titulo-seccion">{{ g.nombre }}</h6>
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-4 col-lg-3" *ngFor="let i of g.items">
          <a class="equipo-card" [routerLink]="['/equipo', i.equipo]">
            <app-escudo [equipo]="i.equipo_detalle" [tam]="56"></app-escudo>
            <span class="nombre">{{ i.equipo_detalle.nombre }}</span>
          </a>
        </div>
      </div>
    </ng-container>`,
})
export class EquiposInscritosComponent implements OnChanges {
  @Input() campeonatoId!: number;
  inscritos: Inscripcion[] = [];
  grupos: { nombre: string | null; items: Inscripcion[] }[] = [];
  cargando = true;

  constructor(private api: CampeonatoService) {}

  ngOnChanges() {
    this.cargando = true;
    this.api.equipos(this.campeonatoId).subscribe({
      next: lista => {
        this.inscritos = lista;
        const mapa = new Map<string | null, Inscripcion[]>();
        lista.forEach(i => mapa.set(i.grupo_nombre, [...(mapa.get(i.grupo_nombre) ?? []), i]));
        this.grupos = [...mapa.entries()].map(([nombre, items]) => ({ nombre, items }));
        this.cargando = false;
      },
      error: () => (this.cargando = false),
    });
  }
}

@Component({
  selector: 'app-estadisticas-campeonato',
  template: `
    <app-estado-lista [cargando]="cargando"></app-estado-lista>
    <div class="row g-3" *ngIf="est">
      <div class="col-6 col-lg-3" *ngFor="let k of kpis">
        <div class="stat-card"><i [class]="k.icono"></i><div class="valor">{{ k.valor }}</div><div class="etiqueta">{{ k.etiqueta }}</div></div>
      </div>
    </div>`,
})
export class EstadisticasCampeonatoComponent implements OnChanges {
  @Input() campeonatoId!: number;
  est: Estadisticas | null = null;
  kpis: { icono: string; valor: string | number; etiqueta: string }[] = [];
  cargando = true;

  constructor(private api: CampeonatoService) {}

  ngOnChanges() {
    this.cargando = true;
    this.api.estadisticas(this.campeonatoId).subscribe({
      next: e => {
        this.est = e;
        this.kpis = [
          { icono: 'ri-calendar-check-line', valor: `${e.partidos_jugados} / ${e.partidos_totales}`, etiqueta: 'Partidos jugados' },
          { icono: 'ri-football-line', valor: e.goles, etiqueta: 'Goles' },
          { icono: 'ri-bar-chart-2-line', valor: e.promedio_goles, etiqueta: 'Promedio de goles' },
          { icono: 'ri-file-paper-fill text-warning', valor: e.amarillas, etiqueta: 'Amarillas' },
          { icono: 'ri-file-paper-fill text-danger', valor: e.rojas, etiqueta: 'Rojas' },
        ];
        this.cargando = false;
      },
      error: () => (this.cargando = false),
    });
  }
}

/** Resultados recientes y próximos partidos; se refresca solo cada 30 s. */
@Component({
  selector: 'app-resultados-campeonato',
  template: `
    <app-estado-lista [cargando]="cargando"></app-estado-lista>
    <div class="row g-4" *ngIf="!cargando && datos">
      <div class="col-lg-6">
        <h6 class="titulo-seccion">Últimos resultados</h6>
        <app-estado-lista [vacio]="!datos.ultimos.length" mensaje="Aún no hay resultados."></app-estado-lista>
        <app-partido-card *ngFor="let p of datos.ultimos" [partido]="p"></app-partido-card>
      </div>
      <div class="col-lg-6">
        <h6 class="titulo-seccion">Próximos partidos</h6>
        <app-estado-lista [vacio]="!datos.proximos.length" mensaje="No hay partidos programados."></app-estado-lista>
        <app-partido-card *ngFor="let p of datos.proximos" [partido]="p"></app-partido-card>
      </div>
    </div>`,
})
export class ResultadosCampeonatoComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campeonatoId!: number;
  datos: Resultados | null = null;
  cargando = true;
  private sub?: Subscription;
  private http: HttpClient;

  constructor(http: HttpClient) { this.http = http; }

  ngOnInit() { this.iniciar(); }
  ngOnChanges() { if (this.sub) { this.iniciar(); } }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  private iniciar() {
    this.sub?.unsubscribe();
    this.cargando = !this.datos;
    const url = `${environment.apiUrl}campeonatos/${this.campeonatoId}/resultados/`;
    this.sub = timer(0, REFRESCO_MS).pipe(
      switchMap(() => this.http.get<Resultados>(url, { params: { limite: 10 }, context: silentContext() }).pipe(catchError(() => EMPTY))),
    ).subscribe(r => { this.datos = r; this.cargando = false; });
  }
}

/** Calendario por fechas con navegación y descansos. */
@Component({
  selector: 'app-calendario',
  template: `
    <app-estado-lista [vacio]="!fechas.length" mensaje="El calendario aún no fue generado."></app-estado-lista>
    <ng-container *ngIf="fechas.length">
      <div class="fechas-nav mb-3">
        <button *ngFor="let f of fechas; let i = index" type="button" class="btn btn-sm"
                [ngClass]="i === actual ? 'btn-primary' : 'btn-soft-secondary'" (click)="actual = i">{{ f.numero }}</button>
      </div>
      <ng-container *ngIf="fechas[actual] as f">
        <h6 class="titulo-seccion">{{ f.nombre || 'Fecha ' + f.numero }} <span class="text-muted fw-normal" *ngIf="f.fase_nombre !== 'Liga'">· {{ f.fase_nombre }}</span>
          <span class="text-muted fw-normal" *ngIf="f.fecha_programada"> · {{ f.fecha_programada | date:'d MMM y' }}</span></h6>
        <div class="row g-3">
          <div class="col-md-6" *ngFor="let p of f.partidos"><app-partido-card [partido]="p"></app-partido-card></div>
        </div>
        <div *ngIf="f.descansos.length" class="alert alert-light border mt-3 mb-0">
          <i class="ri-hotel-bed-line me-1"></i> Descansa:
          <ng-container *ngFor="let d of f.descansos; let last = last">
            <a [routerLink]="['/equipo', d.equipo]" class="fw-semibold">{{ d.equipo_detalle.nombre }}</a>{{ last ? '' : ', ' }}
          </ng-container>
        </div>
      </ng-container>
    </ng-container>`,
})
export class CalendarioComponent implements OnChanges {
  @Input() fechas: Fecha[] = [];
  actual = 0;

  ngOnChanges() {
    if (this.actual === 0 && this.fechas.length) {
      // por defecto, la primera fecha con partidos sin finalizar
      const i = this.fechas.findIndex(f => (f.partidos ?? []).some(p => p.estado !== 'FINALIZADO'));
      this.actual = i >= 0 ? i : this.fechas.length - 1;
    }
  }
}

/** Llaves de la fase eliminatoria, una columna por ronda. */
@Component({
  selector: 'app-llaves',
  template: `
    <div class="llaves">
      <div class="llave-ronda" *ngFor="let r of rondas">
        <h6 class="titulo-seccion">{{ r.titulo }}</h6>
        <a class="llave-partido" *ngFor="let p of r.partidos" [routerLink]="['/partido', p.id]">
          <div class="llave-equipo" [class.gana]="ganador(p) === 'L'"><app-escudo [equipo]="p.local_detalle" [tam]="22"></app-escudo><span>{{ p.local_detalle.nombre }}</span><b>{{ marcador(p, 'L') }}</b></div>
          <div class="llave-equipo" [class.gana]="ganador(p) === 'V'"><app-escudo [equipo]="p.visitante_detalle" [tam]="22"></app-escudo><span>{{ p.visitante_detalle.nombre }}</span><b>{{ marcador(p, 'V') }}</b></div>
        </a>
      </div>
    </div>`,
})
export class LlavesComponent implements OnChanges {
  @Input() fechas: Fecha[] = [];
  rondas: { titulo: string; partidos: NonNullable<Fecha['partidos']> }[] = [];

  ngOnChanges() {
    this.rondas = this.fechas
      .filter(f => FASES_ELIMINATORIA.includes(f.fase))
      // cada ronda en el orden del cuadro (llave), no por hora: los ganadores de la llave 1 y 2 se cruzan, etc.
      .map(f => ({ titulo: etiquetaFase(f.fase), partidos: [...(f.partidos ?? [])].sort((a, b) => (a.llave ?? 0) - (b.llave ?? 0) || a.id - b.id) }));
  }

  marcador(p: { estado: string; goles_local: number; goles_visitante: number; penales_local: number | null; penales_visitante: number | null }, lado: 'L' | 'V') {
    if (p.estado === 'PENDIENTE') { return ''; }
    const g = lado === 'L' ? p.goles_local : p.goles_visitante;
    const pen = lado === 'L' ? p.penales_local : p.penales_visitante;
    return pen !== null && pen !== undefined ? `${g} (${pen})` : `${g}`;
  }

  ganador(p: { estado: string; goles_local: number; goles_visitante: number; penales_local: number | null; penales_visitante: number | null }) {
    if (p.estado !== 'FINALIZADO') { return ''; }
    if (p.goles_local !== p.goles_visitante) { return p.goles_local > p.goles_visitante ? 'L' : 'V'; }
    if (p.penales_local !== null && p.penales_visitante !== null && p.penales_local !== p.penales_visitante) {
      return p.penales_local > p.penales_visitante ? 'L' : 'V';
    }
    return '';
  }
}

export const VISTAS_CAMPEONATO = [
  TablaPosicionesComponent, GoleadoresComponent, TarjetasRankingComponent, DescargarCalendarioComponent, EquiposInscritosComponent, EstadisticasCampeonatoComponent,
  ResultadosCampeonatoComponent, CalendarioComponent, LlavesComponent,
];
