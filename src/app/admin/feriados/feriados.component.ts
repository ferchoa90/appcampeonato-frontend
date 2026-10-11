import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Feriado } from '../../core/models';
import { DialogService } from '../../core/services/dialog.service';
import { AuthService } from '../../core/services/auth.service';
import { FeriadoService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';
import { FeriadoFormComponent } from './feriado-form.component';

@Component({
  selector: 'app-feriados',
  template: `
    <app-page-title titulo="Feriados">
      <button class="btn btn-primary" (click)="abrir()"><i class="ri-add-line align-middle me-1"></i> Nuevo feriado</button>
    </app-page-title>
    <div class="alert alert-info py-2 small">
      <i class="ri-information-line me-1"></i>Al sortear, si algún partido cae en un feriado, el sistema pregunta si se omite esa fecha o se juega igual.
      Un feriado puede aplicar a todos los campeonatos o solo a uno.
    </div>
    <div class="card">
      <div class="card-header">
        <div class="row g-2">
          <div class="col-sm-6 col-lg-4">
            <div class="search-box"><input type="search" class="form-control" placeholder="Buscar por nombre" [(ngModel)]="busqueda" (keyup.enter)="buscar()" (search)="buscar()"><i class="ri-search-line search-icon"></i></div>
          </div>
          <div class="col-auto"><button class="btn btn-soft-secondary" (click)="buscar()">Buscar</button></div>
        </div>
      </div>
      <div class="card-body">
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !feriados.length" mensaje="No hay feriados registrados."></app-estado-lista>
        <div class="table-responsive" *ngIf="feriados.length">
          <table class="table table-hover align-middle admin-tabla mb-0">
            <thead class="table-light"><tr><th>Fecha</th><th>Nombre</th><th>Aplica a</th><th>Repetición</th><th class="text-end">Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let f of feriados">
                <td class="text-nowrap">{{ fechaLocal(f.fecha) | date:'EEE d MMM y' }}</td>
                <td class="fw-medium">{{ f.nombre }}</td>
                <td>{{ f.campeonato_nombre || 'Todos los campeonatos' }}</td>
                <td><span class="badge" [ngClass]="f.se_repite ? 'badge-soft-info' : 'badge-soft-secondary'">{{ f.se_repite ? 'Cada año' : 'Solo esa fecha' }}</span></td>
                <td class="text-end text-nowrap">
                  <button class="btn btn-sm btn-soft-primary me-1" (click)="abrir(f)" [disabled]="!puedeEditar(f)" [title]="puedeEditar(f) ? 'Editar' : 'Feriado general: solo el administrador'"><i class="ri-pencil-line"></i></button>
                  <button class="btn btn-sm btn-soft-danger" (click)="eliminar(f)" [disabled]="!puedeEditar(f)" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
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
export class FeriadosComponent implements OnInit {
  feriados: Feriado[] = [];
  busqueda = '';
  pagina = 1;
  total = 0;
  cargando = true;

  constructor(private api: FeriadoService, private modal: NgbModal, private dialogo: DialogService, private toast: ToastService,
              public auth: AuthService) {}

  /** Los feriados generales (sin campeonato) sólo los modifica el administrador. */
  puedeEditar(f: Feriado) { return this.auth.esAdmin || f.campeonato != null; }

  ngOnInit() { this.cargar(); }

  buscar() { this.pagina = 1; this.cargar(); }

  /** 'AAAA-MM-DD' como fecha local (evita que la zona horaria la corra un día). */
  fechaLocal(iso: string) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
  }

  cargar() {
    this.cargando = true;
    this.api.listar({ search: this.busqueda, page: this.pagina }).subscribe({
      next: r => { this.feriados = r.results; this.total = r.count; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }

  abrir(feriado?: Feriado) {
    const ref = this.modal.open(FeriadoFormComponent, { centered: true, backdrop: 'static' });
    ref.componentInstance.feriado = feriado ?? null;
    ref.result.then(() => this.cargar(), () => undefined);
  }

  async eliminar(f: Feriado) {
    if (!(await this.dialogo.confirmar(`¿Eliminar "${f.nombre}"?`, 'Los sorteos que ya se hicieron no cambian.', 'Eliminar', true))) { return; }
    this.api.eliminar(f.id).subscribe(() => { this.toast.ok('Feriado eliminado.'); this.cargar(); });
  }
}
