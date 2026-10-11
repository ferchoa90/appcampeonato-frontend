import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Campeonato, ESTADOS_CAMPEONATO, FASES_ELIMINATORIA, Fecha } from '../core/models';
import { CampeonatoService } from '../core/services/campeonato.service';

@Component({
  selector: 'app-campeonato-publico',
  template: `
    <div class="pub-contenedor pub-cuerpo">
      <app-estado-lista [cargando]="!camp && !noExiste" [vacio]="noExiste" mensaje="El campeonato no existe o no está publicado."></app-estado-lista>
      <ng-container *ngIf="camp">
        <a routerLink="/" class="text-muted small"><i class="ri-arrow-left-line"></i> Todos los campeonatos</a>
        <div class="cabecera-campeonato">
          <img *ngIf="camp.logo; else sinLogo" [src]="camp.logo" alt="" class="campeonato-logo grande">
          <ng-template #sinLogo><span class="campeonato-logo grande campeonato-logo-vacio"><i class="ri-trophy-line"></i></span></ng-template>
          <div class="flex-grow-1">
            <h2 class="mb-1">{{ camp.nombre }}</h2>
            <div class="text-muted">Temporada {{ camp.temporada || '—' }} · {{ camp.formato_nombre }}
              <span class="badge ms-1" [ngClass]="'badge-soft-' + claseEstado">{{ etiquetaEstado }}</span></div>
            <p class="mb-0 mt-1 text-muted" *ngIf="camp.descripcion">{{ camp.descripcion }}</p>
          </div>
          <app-seguir-boton tipo="campeonato" [id]="camp.id" [nombre]="camp.nombre"></app-seguir-boton>
        </div>

        <ul ngbNav #nav="ngbNav" class="nav-tabs nav-tabs-custom mt-4 tabs-scroll" [(activeId)]="tab">
          <li ngbNavItem="resultados"><a ngbNavLink>Resultados</a>
            <ng-template ngbNavContent><app-resultados-campeonato [campeonatoId]="camp.id"></app-resultados-campeonato></ng-template></li>
          <li ngbNavItem="tabla" *ngIf="!(camp.modalidad === 'RELAMPAGO' && camp.num_partidos)"><a ngbNavLink>Posiciones</a>
            <ng-template ngbNavContent><app-tabla-posiciones [campeonatoId]="camp.id" [clasificados]="camp.formato === 'GRUPOS' ? camp.clasificados_por_grupo : 0"></app-tabla-posiciones></ng-template></li>
          <li ngbNavItem="calendario"><a ngbNavLink>Calendario</a>
            <ng-template ngbNavContent>
              <div class="text-end mb-3"><app-descargar-calendario [campeonatoId]="camp.id" [nombre]="camp.nombre"></app-descargar-calendario></div>
              <app-calendario [fechas]="fechasLiga"></app-calendario></ng-template></li>
          <li ngbNavItem="goleadores"><a ngbNavLink>Goleadores</a>
            <ng-template ngbNavContent><app-goleadores [campeonatoId]="camp.id"></app-goleadores></ng-template></li>
          <li ngbNavItem="tarjetas"><a ngbNavLink>Tarjetas</a>
            <ng-template ngbNavContent><app-tarjetas-ranking [campeonatoId]="camp.id"></app-tarjetas-ranking></ng-template></li>
          <li ngbNavItem="equipos"><a ngbNavLink>Equipos</a>
            <ng-template ngbNavContent><app-equipos-inscritos [campeonatoId]="camp.id"></app-equipos-inscritos></ng-template></li>
          <li ngbNavItem="llaves" *ngIf="fechasLlaves.length"><a ngbNavLink>Llaves</a>
            <ng-template ngbNavContent><app-llaves [fechas]="fechasLlaves"></app-llaves></ng-template></li>
          <li ngbNavItem="estadisticas"><a ngbNavLink>Estadísticas</a>
            <ng-template ngbNavContent><app-estadisticas-campeonato [campeonatoId]="camp.id"></app-estadisticas-campeonato></ng-template></li>
        </ul>
        <div [ngbNavOutlet]="nav" class="mt-4"></div>
      </ng-container>
    </div>`,
})
export class CampeonatoPublicoComponent implements OnInit {
  camp: Campeonato | null = null;
  noExiste = false;
  tab = 'resultados';
  fechasLiga: Fecha[] = [];
  fechasLlaves: Fecha[] = [];

  constructor(private route: ActivatedRoute, private api: CampeonatoService, private titulo: Title) {}

  ngOnInit() {
    this.route.paramMap.subscribe(p => {
      const id = Number(p.get('id'));
      this.camp = null;
      this.noExiste = false;
      this.api.obtener(id).subscribe({
        next: c => {
          this.camp = c;
          this.titulo.setTitle(`${c.nombre} · GoalScore`);
          this.api.calendario(id).subscribe(f => {
            this.fechasLiga = f.filter(x => !FASES_ELIMINATORIA.includes(x.fase));
            this.fechasLlaves = f.filter(x => FASES_ELIMINATORIA.includes(x.fase));
          });
        },
        error: () => (this.noExiste = true),
      });
    });
  }

  get etiquetaEstado() { return ESTADOS_CAMPEONATO.find(e => e.valor === this.camp?.estado)?.etiqueta; }
  get claseEstado() { return ESTADOS_CAMPEONATO.find(e => e.valor === this.camp?.estado)?.clase ?? 'secondary'; }
}
