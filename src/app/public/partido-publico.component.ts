import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, catchError, EMPTY, switchMap, timer } from 'rxjs';
import { Evento, Partido, TIPOS_EVENTO } from '../core/models';
import { PartidoService } from '../core/services/recursos.service';
import { REFRESCO_MS } from '../shared/campeonato-vistas';
import { ItemLinea, lineaDeTiempo } from '../shared/linea-tiempo';

/** Tarjetas por equipo y jugador a partir de los eventos (doble amarilla = 2 amarillas + 1 roja). */
export function resumirTarjetas(eventos: Evento[]) {
  const mapa = new Map<string, { equipo: number; nombre: string; amarillas: number; rojas: number }>();
  for (const e of eventos) {
    if (!['AMARILLA', 'DOBLE_AMARILLA', 'ROJA'].includes(e.tipo)) { continue; }
    const clave = `${e.equipo}-${e.jugador ?? 0}`;
    const fila = mapa.get(clave) ?? { equipo: e.equipo, nombre: e.jugador_nombre ?? 'Sin jugador', amarillas: 0, rojas: 0 };
    if (e.tipo === 'AMARILLA') { fila.amarillas += 1; }
    if (e.tipo === 'DOBLE_AMARILLA') { fila.amarillas += 2; fila.rojas += 1; }
    if (e.tipo === 'ROJA') { fila.rojas += 1; }
    mapa.set(clave, fila);
  }
  return [...mapa.values()];
}

@Component({
  selector: 'app-partido-publico',
  template: `
    <div class="pub-contenedor pub-cuerpo">
      <app-estado-lista [cargando]="!partido && !noExiste" [vacio]="noExiste" mensaje="El partido no existe."></app-estado-lista>
      <ng-container *ngIf="partido as p">
        <a [routerLink]="['/campeonato', p.campeonato]" class="text-muted small"><i class="ri-arrow-left-line"></i> {{ p.campeonato_nombre }}</a>
        <div class="marcador-grande">
          <div class="text-center text-muted small mb-3">
            {{ p.fecha_nombre }}<ng-container *ngIf="p.grupo_nombre"> · {{ p.grupo_nombre }}</ng-container>
            <ng-container *ngIf="p.fecha_hora && p.estado !== 'POSTERGADO'"> · {{ p.fecha_hora | date:'EEEE d MMMM, HH:mm' }}</ng-container>
            <ng-container *ngIf="p.estadio"> · {{ p.estadio }}</ng-container>
            <ng-container *ngIf="p.duracion_tiempo"> · 2 tiempos de {{ p.duracion_tiempo }} min</ng-container>
          </div>
          <div class="marcador-fila">
            <a class="marcador-equipo" [routerLink]="['/equipo', p.local]"><app-escudo [equipo]="p.local_detalle" [tam]="72"></app-escudo><span>{{ p.local_detalle.nombre }}</span></a>
            <div class="marcador-centro">
              <div class="marcador-numeros" *ngIf="p.estado !== 'PENDIENTE' && p.estado !== 'POSTERGADO'; else vs">{{ p.goles_local }} <span>-</span> {{ p.goles_visitante }}</div>
              <ng-template #vs><div class="marcador-numeros">vs</div></ng-template>
              <app-estado-partido [estado]="p.estado"></app-estado-partido>
              <div class="small text-muted mt-1" *ngIf="p.penales_local !== null && p.penales_visitante !== null">Penales: {{ p.penales_local }} - {{ p.penales_visitante }}</div>
            </div>
            <a class="marcador-equipo" [routerLink]="['/equipo', p.visitante]"><app-escudo [equipo]="p.visitante_detalle" [tam]="72"></app-escudo><span>{{ p.visitante_detalle.nombre }}</span></a>
          </div>
          <div class="mt-3 mx-auto" style="max-width:420px"><app-aviso-postergacion [partido]="p"></app-aviso-postergacion></div>
        </div>

        <ng-container *ngIf="resumen.length">
          <h5 class="titulo-seccion mt-4">Tarjetas</h5>
          <div class="row g-3">
            <div class="col-md-6" *ngFor="let eq of [p.local_detalle, p.visitante_detalle]">
              <div class="resumen-tarjetas" *ngIf="filasDe(eq.id).length">
                <div class="d-flex align-items-center gap-2 mb-2 fw-semibold"><app-escudo [equipo]="eq" [tam]="22"></app-escudo>{{ eq.nombre }}</div>
                <div class="d-flex align-items-center justify-content-between py-1 border-top" *ngFor="let f of filasDe(eq.id)">
                  <span>{{ f.nombre }}</span>
                  <app-tarjetas-mini [t]="f"></app-tarjetas-mini>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <h5 class="titulo-seccion mt-4">Fotos y videos <span class="badge badge-soft-secondary ms-1" id="contador-medios">{{ p.medios?.length || 0 }}</span></h5>
        <app-galeria-medios [medios]="p.medios"></app-galeria-medios>

        <h5 class="titulo-seccion mt-4">Cronología</h5>
        <app-estado-lista [vacio]="!linea.length" mensaje="Todavía no hay eventos registrados."></app-estado-lista>
        <div class="linea-tiempo" *ngIf="linea.length">
          <ng-container *ngFor="let it of linea">
          <div class="linea-marca" *ngIf="marcaDe(it) as m">
            <span><i [class]="m.icono + ' align-middle me-1'"></i>{{ m.texto }}<small class="text-muted ms-2" *ngIf="m.hora">{{ m.hora }}</small></span>
          </div>
          <div class="evento" *ngIf="eventoDe(it) as e" [class.evento-visita]="e.equipo === p.visitante">
            <div class="evento-cuerpo">
              <span class="evento-icono" [ngClass]="'text-' + tipo(e).clase"><i [class]="tipo(e).icono"></i></span>
              <div>
                <div class="fw-semibold">{{ titulo(e) }}</div>
                <div class="small text-muted" *ngIf="e.tipo === 'CAMBIO'">
                  <span class="text-danger"><i class="ri-arrow-left-down-line"></i> {{ e.jugador_nombre }}</span> ·
                  <span class="text-success"><i class="ri-arrow-right-up-line"></i> {{ e.relevo_nombre }}</span>
                </div>
                <div class="small text-muted" *ngIf="e.tipo !== 'CAMBIO' && (e.descripcion || e.equipo_detalle)">{{ e.descripcion || e.equipo_detalle?.nombre }}</div>
              </div>
            </div>
            <span class="evento-minuto">{{ e.minuto }}'</span>
          </div>
          </ng-container>
        </div>
      </ng-container>
    </div>`,
})
export class PartidoPublicoComponent implements OnInit, OnDestroy {
  partido: Partido | null = null;
  eventos: Evento[] = [];
  /** Cronología con las marcas de inicio, fin del 1.er tiempo, inicio del 2.º y final. */
  linea: ItemLinea[] = [];
  resumen: { equipo: number; nombre: string; amarillas: number; rojas: number }[] = [];
  noExiste = false;
  private sub?: Subscription;

  constructor(private route: ActivatedRoute, private api: PartidoService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(pm => {
      this.sub?.unsubscribe();
      const id = Number(pm.get('id'));
      this.partido = null;
      // refresco cada 30 s mientras el partido esté en juego
      this.sub = timer(0, REFRESCO_MS).pipe(
        switchMap(n => this.api.detalle(id, n > 0).pipe(catchError(() => {
          if (n === 0) { this.noExiste = true; }
          return EMPTY;
        }))),
      ).subscribe(p => {
        this.partido = p;
        this.eventos = [...(p.eventos ?? [])].sort((a, b) => (a.tiempo ?? 1) - (b.tiempo ?? 1) || a.minuto - b.minuto || a.id - b.id);
        this.linea = lineaDeTiempo(p, this.eventos);
        this.resumen = resumirTarjetas(this.eventos);
        if (p.estado === 'FINALIZADO') { this.sub?.unsubscribe(); }
      });
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  marcaDe(it: ItemLinea) { return it.tipo === 'marca' ? it : null; }
  eventoDe(it: ItemLinea) { return it.tipo === 'evento' ? it.evento : null; }

  filasDe(equipo: number) { return this.resumen.filter(f => f.equipo === equipo); }

  tipo(e: Evento) { return TIPOS_EVENTO.find(t => t.valor === e.tipo) ?? TIPOS_EVENTO[7]; }

  titulo(e: Evento) {
    const t = this.tipo(e);
    if (e.tipo === 'CAMBIO' || e.tipo === 'INCIDENCIA') { return t.etiqueta; }
    return `${t.etiqueta}${e.jugador_nombre ? ' · ' + e.jugador_nombre : ''}`;
  }
}
