import { Component, OnInit } from '@angular/core';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Campeonato, ESTADOS_CAMPEONATO, Partido } from '../../core/models';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { EquipoService, JugadorService, PartidoService } from '../../core/services/recursos.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-dashboard',
  template: `
    <app-page-title titulo="Dashboard"></app-page-title>
    <div class="row">
      <div class="col-sm-6 col-xl-3" *ngFor="let k of kpis">
        <div class="card card-animate">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="flex-grow-1">
                <p class="text-uppercase fw-medium text-muted mb-2">{{ k.etiqueta }}</p>
                <h3 class="mb-0">{{ k.valor ?? '…' }}</h3>
              </div>
              <div class="avatar-sm flex-shrink-0">
                <span class="avatar-title rounded fs-3" [ngClass]="'badge-soft-' + k.clase"><i [class]="k.icono"></i></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-xl-7">
        <div class="card">
          <div class="card-header d-flex align-items-center"><h5 class="card-title mb-0 flex-grow-1">Próximos partidos</h5>
            <a routerLink="/admin/partidos" class="btn btn-sm btn-soft-primary">Ver todos</a></div>
          <div class="card-body">
            <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !proximos.length" mensaje="No hay partidos pendientes."></app-estado-lista>
            <div class="table-responsive" *ngIf="proximos.length">
              <table class="table table-sm align-middle mb-0 admin-tabla">
                <tbody>
                  <tr *ngFor="let p of proximos">
                    <td class="text-muted small">{{ p.campeonato_nombre }}<br>{{ p.fecha_nombre }}</td>
                    <td class="text-end"><span class="me-2">{{ p.local_detalle.nombre }}</span><app-escudo [equipo]="p.local_detalle" [tam]="24"></app-escudo></td>
                    <td class="text-center text-muted">vs</td>
                    <td><app-escudo [equipo]="p.visitante_detalle" [tam]="24"></app-escudo><span class="ms-2">{{ p.visitante_detalle.nombre }}</span></td>
                    <td class="text-end"><a [routerLink]="['/admin/partidos', p.id]" class="btn btn-sm btn-soft-success">Gestionar</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="col-xl-5">
        <div class="card">
          <div class="card-header d-flex align-items-center"><h5 class="card-title mb-0 flex-grow-1">Campeonatos activos</h5>
            <a routerLink="/admin/campeonatos" class="btn btn-sm btn-soft-primary">Ver todos</a></div>
          <div class="card-body">
            <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !activos.length" mensaje="No hay campeonatos en curso."></app-estado-lista>
            <div class="list-group list-group-flush">
              <a *ngFor="let c of activos" [routerLink]="['/admin/campeonatos', c.id]" class="list-group-item list-group-item-action d-flex align-items-center">
                <i class="ri-trophy-line fs-4 text-primary me-3"></i>
                <div class="flex-grow-1"><div class="fw-medium">{{ c.nombre }}</div><small class="text-muted">{{ c.temporada }} · {{ c.num_equipos }} equipos · {{ c.num_partidos }} partidos</small></div>
                <span class="badge badge-soft-success">{{ etiqueta(c) }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>`,
})
export class DashboardComponent implements OnInit {
  kpis: { etiqueta: string; valor: number | null; icono: string; clase: string }[] = [
    { etiqueta: 'Campeonatos activos', valor: null, icono: 'ri-trophy-line', clase: 'primary' },
    { etiqueta: 'Equipos', valor: null, icono: 'ri-shield-star-line', clase: 'info' },
    { etiqueta: 'Jugadores', valor: null, icono: 'ri-run-line', clase: 'success' },
    { etiqueta: 'Partidos en vivo', valor: null, icono: 'ri-live-line', clase: 'danger' },
  ];
  activos: Campeonato[] = [];
  proximos: Partido[] = [];
  cargando = true;

  constructor(private camps: CampeonatoService, private equipos: EquipoService, private jugadores: JugadorService, private partidos: PartidoService) {}

  ngOnInit() {
    forkJoin({
      camps: this.camps.listar({ estado: 'EN_CURSO' }),
      equipos: this.equipos.listar(),
      jugadores: this.jugadores.listar(),
      vivo: this.partidos.enVivo(),
      proximos: this.partidos.listar({ estado: 'PENDIENTE' }),
    }).subscribe({
      next: r => {
        this.activos = r.camps.results;
        this.proximos = r.proximos.results.slice(0, 8);
        [r.camps.count, r.equipos.count, r.jugadores.count, r.vivo.length].forEach((v, i) => (this.kpis[i].valor = v));
        this.cargando = false;
      },
      error: () => (this.cargando = false),
    });
  }

  etiqueta(c: Campeonato) { return ESTADOS_CAMPEONATO.find(e => e.valor === c.estado)?.etiqueta; }
}

@NgModule({
  declarations: [DashboardComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: DashboardComponent }])],
})
export class DashboardModule {}
