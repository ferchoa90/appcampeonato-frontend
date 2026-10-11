import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Equipo, Usuario } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { mensajeError } from '../../core/services/api-utils';
import { DialogService } from '../../core/services/dialog.service';
import { EquipoService, UsuarioService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';
import { EquipoFormComponent } from './equipo-form.component';

@Component({
  selector: 'app-equipos',
  template: `
    <app-page-title [titulo]="auth.esAdmin ? 'Equipos' : 'Mis equipos'">
      <button class="btn btn-primary" (click)="abrir()"><i class="ri-add-line align-middle me-1"></i> Nuevo equipo</button>
    </app-page-title>
    <div class="card">
      <div class="card-header">
        <div class="row g-2">
          <div class="col-sm-6 col-lg-4">
            <div class="search-box"><input type="search" class="form-control" placeholder="Buscar por nombre, sigla o ciudad" [(ngModel)]="busqueda" (keyup.enter)="buscar()" (search)="buscar()"><i class="ri-search-line search-icon"></i></div>
          </div>
          <div class="col-sm-5 col-lg-3" *ngIf="auth.esAdmin">
            <select class="form-select" [(ngModel)]="propietario" (change)="buscar()" aria-label="Propietario">
              <option value="">Todos los propietarios</option><option value="sistema">Del sistema</option>
              <option *ngFor="let o of organizadores" [value]="o.id">{{ o.username }}</option>
            </select>
          </div>
          <div class="col-auto"><button class="btn btn-soft-secondary" (click)="buscar()">Buscar</button></div>
        </div>
      </div>
      <div class="card-body">
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !equipos.length" mensaje="No hay equipos registrados."></app-estado-lista>
        <div class="table-responsive" *ngIf="equipos.length">
          <table class="table table-hover align-middle admin-tabla mb-0">
            <thead class="table-light"><tr><th>Escudo</th><th>Nombre</th><th *ngIf="auth.esAdmin">Propietario</th><th>Sigla</th><th>Ciudad</th><th>Estadio</th><th>Jugadores</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let e of equipos">
                <td><app-escudo [equipo]="e" [tam]="36"></app-escudo></td>
                <td class="fw-medium">{{ e.nombre }}</td>
                <td *ngIf="auth.esAdmin">{{ e.propietario_nombre || 'Sistema' }}</td>
                <td>{{ e.abreviatura }}</td>
                <td>{{ e.ciudad }}</td>
                <td>{{ e.estadio }}</td>
                <td>{{ e.num_jugadores }}</td>
                <td><span class="badge" [ngClass]="e.activo ? 'badge-soft-success' : 'badge-soft-secondary'">{{ e.activo ? 'Activo' : 'Inactivo' }}</span></td>
                <td class="text-end text-nowrap">
                  <button class="btn btn-sm btn-soft-primary me-1" (click)="abrir(e)" title="Editar"><i class="ri-pencil-line"></i></button>
                  <button class="btn btn-sm btn-soft-danger" (click)="eliminar(e)" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
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
export class EquiposComponent implements OnInit {
  equipos: Equipo[] = [];
  busqueda = '';
  pagina = 1;
  total = 0;
  cargando = true;

  propietario = '';
  organizadores: Usuario[] = [];

  constructor(private api: EquipoService, private modal: NgbModal, private dialogo: DialogService, private toast: ToastService,
              public auth: AuthService, private usuarios: UsuarioService) {}

  ngOnInit() {
    if (this.auth.esAdmin) { this.usuarios.organizadores().subscribe(o => (this.organizadores = o)); }
    this.cargar();
  }

  buscar() { this.pagina = 1; this.cargar(); }

  cargar() {
    this.cargando = true;
    const filtros: Record<string, any> = { search: this.busqueda, page: this.pagina };
    if (this.propietario === 'sistema') { filtros['propietario__isnull'] = true; }
    else if (this.propietario) { filtros['propietario'] = this.propietario; }
    this.api.listar(filtros).subscribe({
      next: r => { this.equipos = r.results; this.total = r.count; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }

  abrir(equipo?: Equipo) {
    const ref = this.modal.open(EquipoFormComponent, { centered: true, backdrop: 'static' });
    ref.componentInstance.equipo = equipo ?? null;
    ref.result.then(() => this.cargar(), () => undefined);
  }

  async eliminar(e: Equipo) {
    if (!(await this.dialogo.confirmar(`¿Eliminar "${e.nombre}"?`, 'También se eliminarán sus jugadores.', 'Eliminar', true))) { return; }
    this.api.eliminarSinAviso(e.id).subscribe({
      next: () => { this.toast.ok('Equipo eliminado.'); this.cargar(); },
      error: async (err: HttpErrorResponse) => {
        if (err.status === 409 && err.error?.puede_desactivar) {
          // tiene partidos: no se puede borrar sin perder el historial; se ofrece desactivarlo
          if (e.activo && await this.dialogo.confirmar('No se puede eliminar', `${err.error.detail} ¿Desea desactivarlo?`, 'Desactivar equipo')) {
            this.api.actualizar(e.id, { activo: false }).subscribe(() => { this.toast.ok('Equipo desactivado.'); this.cargar(); });
          } else if (!e.activo) {
            this.toast.aviso(err.error.detail);
          }
          return;
        }
        this.toast.error(mensajeError(err));
      },
    });
  }
}
