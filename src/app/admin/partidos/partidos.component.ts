import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Campeonato, ESTADOS_PARTIDO, Fecha, Partido } from '../../core/models';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { AuthService } from '../../core/services/auth.service';
import { PartidoService } from '../../core/services/recursos.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { todasLasPaginas } from '../../core/services/api-utils';
import { PartidoEditarComponent } from './partido-editar.component';

@Component({
  selector: 'app-partidos',
  template: `
    <app-page-title titulo="Partidos"></app-page-title>
    <div class="card">
      <div class="card-header">
        <div class="row g-2">
          <div class="col-md-4">
            <select class="form-select" [(ngModel)]="fCampeonato" (change)="cambiaCampeonato()">
              <option [ngValue]="''">Todos los campeonatos</option>
              <option *ngFor="let c of campeonatos" [ngValue]="c.id">{{ c.nombre }} {{ c.temporada }}</option>
            </select>
          </div>
          <div class="col-6 col-md-4">
            <select class="form-select" [(ngModel)]="fFecha" (change)="buscar()" [disabled]="!fCampeonato">
              <option [ngValue]="''">Todas las fechas</option>
              <option *ngFor="let f of fechas" [ngValue]="f.id">{{ f.nombre || 'Fecha ' + f.numero }}</option>
            </select>
          </div>
          <div class="col-6 col-md-4">
            <select class="form-select" [(ngModel)]="fEstado" (change)="buscar()">
              <option [ngValue]="''">Todos los estados</option>
              <option *ngFor="let e of estados" [ngValue]="e.valor">{{ e.etiqueta }}</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card-body">
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !lista.length" mensaje="No hay partidos con esos filtros."></app-estado-lista>
        <div class="table-responsive" *ngIf="lista.length">
          <table class="table table-hover align-middle admin-tabla mb-0">
            <thead class="table-light"><tr><th>Campeonato / Fecha</th><th class="text-end">Local</th><th class="text-center">Marcador</th><th>Visitante</th><th>Fecha y hora</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let p of lista">
                <td class="small"><div class="fw-medium">{{ p.campeonato_nombre }}</div><div class="text-muted">{{ p.fecha_nombre }}<ng-container *ngIf="p.grupo_nombre"> · {{ p.grupo_nombre }}</ng-container></div></td>
                <td class="text-end"><span class="me-2">{{ p.local_detalle.nombre }}</span><app-escudo [equipo]="p.local_detalle" [tam]="26"></app-escudo></td>
                <td class="text-center fw-bold text-nowrap">{{ p.estado === 'PENDIENTE' || p.estado === 'POSTERGADO' ? 'vs' : p.goles_local + ' - ' + p.goles_visitante }}</td>
                <td><app-escudo [equipo]="p.visitante_detalle" [tam]="26"></app-escudo><span class="ms-2">{{ p.visitante_detalle.nombre }}</span></td>
                <td class="small text-nowrap">
                  <ng-container *ngIf="p.estado === 'POSTERGADO'"><span class="text-warning">{{ p.fecha_hora ? ('Nueva: ' + (p.fecha_hora | date:'dd/MM/yyyy HH:mm')) : 'Nueva fecha por definir' }}</span>
                    <div class="text-muted text-wrap" style="max-width:200px" *ngIf="p.motivo_postergacion">{{ p.motivo_postergacion }}</div></ng-container>
                  <ng-container *ngIf="p.estado !== 'POSTERGADO'">{{ p.fecha_hora ? (p.fecha_hora | date:'dd/MM/yyyy HH:mm') : 'Sin programar' }}
                    <div class="text-muted" *ngIf="p.fecha_original">Reprogramado (antes: {{ p.fecha_original | date:'dd/MM HH:mm' }})</div></ng-container>
                  <div class="text-muted">{{ p.estadio }}</div></td>
                <td><app-estado-partido [estado]="p.estado"></app-estado-partido></td>
                <td class="text-end text-nowrap">
                  <a [routerLink]="[p.id]" class="btn btn-sm btn-soft-success me-1" title="Gestionar partido"><i class="ri-play-circle-line align-middle"></i> Gestionar</a>
                  <button class="btn btn-sm btn-soft-primary" (click)="editar(p)" title="Editar fecha, hora y estadio"><i class="ri-pencil-line"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer" *ngIf="total > 50">
        <ngb-pagination [collectionSize]="total" [pageSize]="50" [(page)]="pagina" (pageChange)="cargar()" [maxSize]="5" [rotate]="true" class="d-flex justify-content-end"></ngb-pagination>
      </div>
    </div>`,
})
export class PartidosComponent implements OnInit {
  lista: Partido[] = [];
  campeonatos: Campeonato[] = [];
  fechas: Fecha[] = [];
  estados = ESTADOS_PARTIDO;
  fCampeonato: number | '' = '';
  fFecha: number | '' = '';
  fEstado = '';
  pagina = 1;
  total = 0;
  cargando = true;

  constructor(private api: PartidoService, private camps: CampeonatoService, private modal: NgbModal,
              private http: HttpClient, public auth: AuthService) {}

  ngOnInit() {
    this.camps.todos().subscribe(c => (this.campeonatos = c));
    this.cargar();
  }

  cambiaCampeonato() {
    this.fFecha = '';
    this.fechas = [];
    if (this.fCampeonato) {
      todasLasPaginas<Fecha>(this.http, `${environment.apiUrl}fechas/`, { campeonato: this.fCampeonato }).subscribe(f => (this.fechas = f));
    }
    this.buscar();
  }

  buscar() { this.pagina = 1; this.cargar(); }

  cargar() {
    this.cargando = true;
    this.api.listar({ campeonato: this.fCampeonato, fecha: this.fFecha, estado: this.fEstado, page: this.pagina }).subscribe({
      next: r => { this.lista = r.results; this.total = r.count; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }

  editar(p: Partido) {
    const ref = this.modal.open(PartidoEditarComponent, { centered: true, backdrop: 'static' });
    ref.componentInstance.partido = p;
    ref.result.then(() => this.cargar(), () => undefined);
  }
}
