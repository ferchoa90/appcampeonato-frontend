import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Equipo, Jugador, POSICIONES } from '../../core/models';
import { DialogService } from '../../core/services/dialog.service';
import { EquipoService, JugadorService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';
import { JugadorFormComponent } from './jugador-form.component';

@Component({
  selector: 'app-jugadores',
  template: `
    <app-page-title titulo="Jugadores">
      <button class="btn btn-primary" (click)="abrir()"><i class="ri-add-line align-middle me-1"></i> Nuevo jugador</button>
    </app-page-title>
    <div class="card">
      <div class="card-header">
        <div class="row g-2">
          <div class="col-md-4"><input type="search" class="form-control" placeholder="Buscar por nombre o identificación" [(ngModel)]="busqueda" (keyup.enter)="buscar()" (search)="buscar()"></div>
          <div class="col-6 col-md-3">
            <select class="form-select" [(ngModel)]="filtroEquipo" (change)="buscar()">
              <option [ngValue]="''">Todos los equipos</option>
              <option *ngFor="let e of equipos" [ngValue]="e.id">{{ e.nombre }}</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <select class="form-select" [(ngModel)]="filtroPosicion" (change)="buscar()">
              <option [ngValue]="''">Todas las posiciones</option>
              <option *ngFor="let p of posiciones" [ngValue]="p.valor">{{ p.etiqueta }}</option>
            </select>
          </div>
          <div class="col-auto"><button class="btn btn-soft-secondary" (click)="buscar()">Buscar</button></div>
        </div>
      </div>
      <div class="card-body">
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !jugadores.length" mensaje="No hay jugadores con esos filtros."></app-estado-lista>
        <div class="table-responsive" *ngIf="jugadores.length">
          <table class="table table-hover align-middle admin-tabla mb-0">
            <thead class="table-light"><tr><th>Foto</th><th>N°</th><th>Jugador</th><th>Equipo</th><th>Posición</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let j of jugadores">
                <td><img *ngIf="j.foto; else ini" [src]="j.foto" class="rounded-circle" width="36" height="36" style="object-fit:cover" alt="">
                  <ng-template #ini><span class="avatar-xs"><span class="avatar-title rounded-circle badge-soft-primary">{{ j.nombres.charAt(0) }}</span></span></ng-template></td>
                <td class="fw-semibold">{{ j.numero ?? '–' }}</td>
                <td class="fw-medium">{{ j.nombre_completo }}</td>
                <td>{{ j.equipo_nombre }}</td>
                <td>{{ j.posicion_nombre }}</td>
                <td><span class="badge" [ngClass]="j.activo ? 'badge-soft-success' : 'badge-soft-secondary'">{{ j.activo ? 'Activo' : 'Inactivo' }}</span></td>
                <td class="text-end text-nowrap">
                  <button class="btn btn-sm btn-soft-primary me-1" (click)="abrir(j)" title="Editar"><i class="ri-pencil-line"></i></button>
                  <button class="btn btn-sm btn-soft-danger" (click)="eliminar(j)" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
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
export class JugadoresComponent implements OnInit {
  jugadores: Jugador[] = [];
  equipos: Equipo[] = [];
  posiciones = POSICIONES;
  busqueda = '';
  filtroEquipo: number | '' = '';
  filtroPosicion: string = '';
  pagina = 1;
  total = 0;
  cargando = true;

  constructor(private api: JugadorService, private equiposApi: EquipoService, private modal: NgbModal,
              private dialogo: DialogService, private toast: ToastService) {}

  ngOnInit() {
    this.equiposApi.todos().subscribe(e => (this.equipos = e));
    this.cargar();
  }

  buscar() { this.pagina = 1; this.cargar(); }

  cargar() {
    this.cargando = true;
    this.api.listar({ search: this.busqueda, equipo: this.filtroEquipo, posicion: this.filtroPosicion, page: this.pagina }).subscribe({
      next: r => { this.jugadores = r.results; this.total = r.count; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }

  abrir(jugador?: Jugador) {
    const ref = this.modal.open(JugadorFormComponent, { centered: true, backdrop: 'static', size: 'lg' });
    ref.componentInstance.jugador = jugador ?? null;
    ref.componentInstance.equipos = this.equipos;
    ref.componentInstance.equipoInicial = this.filtroEquipo || null;
    ref.result.then(() => this.cargar(), () => undefined);
  }

  async eliminar(j: Jugador) {
    if (!(await this.dialogo.confirmar(`¿Eliminar a ${j.nombre_completo}?`, '', 'Eliminar', true))) { return; }
    this.api.eliminar(j.id).subscribe(() => { this.toast.ok('Jugador eliminado.'); this.cargar(); });
  }
}
