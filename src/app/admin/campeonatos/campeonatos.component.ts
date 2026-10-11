import { Component, OnInit } from '@angular/core';
import { Campeonato, ESTADOS_CAMPEONATO, Usuario, etiquetaModalidad } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/recursos.service';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-campeonatos',
  template: `
    <app-page-title [titulo]="auth.esAdmin ? 'Campeonatos' : 'Mis campeonatos'">
      <a routerLink="nuevo" class="btn btn-primary"><i class="ri-add-line align-middle me-1"></i> Nuevo campeonato</a>
    </app-page-title>
    <div class="card">
      <div class="card-header">
        <div class="row g-2">
          <div class="col-sm-6 col-lg-4"><input type="search" class="form-control" placeholder="Buscar por nombre o temporada" [(ngModel)]="busqueda" (keyup.enter)="buscar()" (search)="buscar()"></div>
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
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !lista.length" mensaje="No hay campeonatos. Cree el primero."></app-estado-lista>
        <div class="table-responsive" *ngIf="lista.length">
          <table class="table table-hover align-middle admin-tabla mb-0">
            <thead class="table-light"><tr><th>Campeonato</th><th *ngIf="auth.esAdmin">Propietario</th><th>Temporada</th><th>Formato</th><th>Equipos</th><th>Partidos</th><th>Estado</th><th>Público</th><th class="text-end">Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of lista">
                <td><a [routerLink]="[c.id]" class="fw-medium">{{ c.nombre }}</a></td>
                <td *ngIf="auth.esAdmin">{{ c.propietario_nombre || 'Sistema' }}</td>
                <td>{{ c.temporada }}</td>
                <td>{{ c.formato_nombre }}{{ c.num_partidos ? ' · ' + etiquetaModalidad(c.modalidad) : '' }}</td>
                <td>{{ c.num_equipos }}</td>
                <td>{{ c.num_partidos }}</td>
                <td><span class="badge" [ngClass]="'badge-soft-' + estado(c).clase">{{ estado(c).etiqueta }}</span></td>
                <td><i [class]="c.publicado ? 'ri-eye-line text-success' : 'ri-eye-off-line text-muted'" [title]="c.publicado ? 'Publicado' : 'Oculto'"></i></td>
                <td class="text-end text-nowrap">
                  <a [routerLink]="[c.id]" class="btn btn-sm btn-soft-info me-1" title="Ver detalle"><i class="ri-eye-line"></i></a>
                  <a [routerLink]="[c.id, 'editar']" class="btn btn-sm btn-soft-primary me-1" title="Editar"><i class="ri-pencil-line"></i></a>
                  <button class="btn btn-sm btn-soft-danger" (click)="eliminar(c)" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer" *ngIf="total > 50">
        <ngb-pagination [collectionSize]="total" [pageSize]="50" [(page)]="pagina" (pageChange)="cargar()" class="d-flex justify-content-end"></ngb-pagination>
      </div>
    </div>`,
})
export class CampeonatosComponent implements OnInit {
  lista: Campeonato[] = [];
  busqueda = '';
  pagina = 1;
  total = 0;
  cargando = true;

  readonly etiquetaModalidad = etiquetaModalidad;

  propietario = '';
  organizadores: Usuario[] = [];

  constructor(private api: CampeonatoService, private dialogo: DialogService, private toast: ToastService,
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
      next: r => { this.lista = r.results; this.total = r.count; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }

  estado(c: Campeonato) { return ESTADOS_CAMPEONATO.find(e => e.valor === c.estado) ?? ESTADOS_CAMPEONATO[0]; }

  async eliminar(c: Campeonato) {
    if (!(await this.dialogo.confirmar(`¿Eliminar "${c.nombre}"?`, 'Se borrarán sus partidos, eventos y resultados.', 'Eliminar', true))) { return; }
    this.api.eliminar(c.id).subscribe(() => { this.toast.ok('Campeonato eliminado.'); this.cargar(); });
  }
}
