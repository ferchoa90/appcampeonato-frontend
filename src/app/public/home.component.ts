import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, catchError, forkJoin, of, switchMap, timer } from 'rxjs';
import { Campeonato, ESTADOS_CAMPEONATO, Partido } from '../core/models';
import { CampeonatoService } from '../core/services/campeonato.service';
import { PartidoService } from '../core/services/recursos.service';
import { REFRESCO_MS } from '../shared/campeonato-vistas';

@Component({
  selector: 'app-home',
  template: `
    <section class="pub-hero">
      <div class="pub-contenedor">
        <h1>Campeonatos de fútbol</h1>
        <p>Sigue los resultados en vivo, las tablas de posiciones y el calendario de tu campeonato.</p>
      </div>
    </section>

    <div class="pub-contenedor pub-cuerpo">
      <section *ngIf="enVivo.length" class="mb-5">
        <h5 class="titulo-seccion"><span class="punto-vivo"></span> En vivo ahora</h5>
        <div class="row g-3">
          <div class="col-md-6 col-xl-4" *ngFor="let p of enVivo"><app-partido-card [partido]="p"></app-partido-card></div>
        </div>
      </section>

      <section class="mb-5">
        <h5 class="titulo-seccion">Campeonatos</h5>
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !campeonatos.length" mensaje="No hay campeonatos publicados todavía."></app-estado-lista>
        <div class="row g-3">
          <div class="col-sm-6 col-lg-4" *ngFor="let c of campeonatos">
            <a class="campeonato-card" [routerLink]="['/campeonato', c.id]">
              <div class="d-flex align-items-center gap-3">
                <img *ngIf="c.logo; else sinLogo" [src]="c.logo" alt="" class="campeonato-logo">
                <ng-template #sinLogo><span class="campeonato-logo campeonato-logo-vacio"><i class="ri-trophy-line"></i></span></ng-template>
                <div class="min-w-0">
                  <div class="campeonato-nombre">{{ c.nombre }}</div>
                  <div class="text-muted small">Temporada {{ c.temporada || '—' }}</div>
                </div>
              </div>
              <div class="d-flex align-items-center justify-content-between mt-3">
                <span class="badge" [ngClass]="'badge-soft-' + clase(c)">{{ etiqueta(c) }}</span>
                <span class="small text-muted"><i class="ri-team-line"></i> {{ c.num_equipos }} equipos</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section *ngIf="ultimos.length">
        <h5 class="titulo-seccion">Últimos resultados</h5>
        <div class="row g-3">
          <div class="col-md-6 col-xl-4" *ngFor="let p of ultimos"><app-partido-card [partido]="p"></app-partido-card></div>
        </div>
      </section>
    </div>`,
})
export class HomeComponent implements OnInit, OnDestroy {
  campeonatos: Campeonato[] = [];
  enVivo: Partido[] = [];
  ultimos: Partido[] = [];
  cargando = true;
  private sub?: Subscription;

  constructor(private camps: CampeonatoService, private partidos: PartidoService) {}

  ngOnInit() {
    this.camps.listar().subscribe({
      next: r => {
        this.campeonatos = r.results;
        this.cargando = false;
        this.cargarUltimos();
      },
      error: () => (this.cargando = false),
    });
    // los partidos en vivo se refrescan cada 30 s
    this.sub = timer(0, REFRESCO_MS).pipe(
      switchMap(() => this.partidos.enVivo(true).pipe(catchError(() => of(null)))),
    ).subscribe(v => { if (v) { this.enVivo = v; } });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private cargarUltimos() {
    const activos = this.campeonatos.slice(0, 4);
    if (!activos.length) { return; }
    forkJoin(activos.map(c => this.camps.resultados(c.id, 4).pipe(catchError(() => of(null))))).subscribe(rs => {
      this.ultimos = rs.flatMap(r => r?.ultimos ?? []).slice(0, 9);
    });
  }

  etiqueta(c: Campeonato) { return ESTADOS_CAMPEONATO.find(e => e.valor === c.estado)?.etiqueta ?? c.estado; }
  clase(c: Campeonato) { return ESTADOS_CAMPEONATO.find(e => e.valor === c.estado)?.clase ?? 'secondary'; }
}
