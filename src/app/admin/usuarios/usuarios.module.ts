import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, NgModule, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Campeonato, ROLES, Rol, Usuario } from '../../core/models';
import { mensajeError } from '../../core/services/api-utils';
import { AuthService } from '../../core/services/auth.service';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { DialogService } from '../../core/services/dialog.service';
import { UsuarioService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-usuario-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <div class="modal-header"><h5 class="modal-title">{{ usuario ? 'Editar' : 'Nuevo' }} {{ auth.esAdmin ? 'usuario' : 'operador' }}</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button></div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label">Usuario *</label>
            <input class="form-control" formControlName="username" autocomplete="off" [class.is-invalid]="form.controls.username.touched && form.controls.username.invalid"><div class="invalid-feedback">Obligatorio.</div></div>
          <div class="col-md-6" *ngIf="auth.esAdmin"><label class="form-label">Rol *</label>
            <select class="form-select" formControlName="rol"><option *ngFor="let r of roles" [value]="r">{{ r }}</option></select></div>
          <div class="col-md-6" *ngIf="!auth.esAdmin"><label class="form-label">Rol</label>
            <input class="form-control" value="Operador (solo carga resultados)" disabled></div>
          <div class="col-md-6"><label class="form-label">Nombres</label><input class="form-control" formControlName="first_name"></div>
          <div class="col-md-6"><label class="form-label">Apellidos</label><input class="form-control" formControlName="last_name"></div>
          <div class="col-md-6"><label class="form-label">Correo</label>
            <input type="email" class="form-control" formControlName="email" [class.is-invalid]="form.controls.email.touched && form.controls.email.invalid"><div class="invalid-feedback">Correo no válido.</div></div>
          <div class="col-md-6"><label class="form-label">Contraseña {{ usuario ? '(dejar vacío para no cambiar)' : '*' }}</label>
            <input type="password" class="form-control" formControlName="password" autocomplete="new-password" [class.is-invalid]="form.controls.password.touched && form.controls.password.invalid">
            <div class="invalid-feedback">Mínimo 8 caracteres.</div></div>

          <div class="col-12" *ngIf="esOperador">
            <label class="form-label">Campeonatos que puede operar {{ auth.esAdmin ? '' : '*' }}</label>
            <div class="border rounded p-2" style="max-height:180px;overflow:auto">
              <div class="form-check" *ngFor="let c of campeonatos">
                <input class="form-check-input" type="checkbox" [id]="'camp-' + c.id" [checked]="seleccion.has(c.id)" (change)="alternar(c.id)">
                <label class="form-check-label" [for]="'camp-' + c.id">{{ c.nombre }} <span class="text-muted small" *ngIf="auth.esAdmin && c.propietario_nombre">· de {{ c.propietario_nombre }}</span></label>
              </div>
              <div class="text-muted small" *ngIf="!campeonatos.length">Aún no hay campeonatos.</div>
            </div>
            <div class="form-text" *ngIf="auth.esAdmin">Sin marcar ninguno, el operador opera todos los campeonatos (como los operadores de siempre).</div>
            <div class="form-text" *ngIf="!auth.esAdmin">El operador solo verá y podrá cargar resultados de los campeonatos marcados.</div>
          </div>

          <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="us-activo" formControlName="is_active"><label class="form-check-label" for="us-activo">Usuario activo</label></div></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" (click)="modal.dismiss()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="guardando"><span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
      </div>
    </form>`,
})
export class UsuarioFormComponent implements OnInit {
  @Input() usuario: Usuario | null = null;
  roles = ROLES;
  campeonatos: Campeonato[] = [];
  seleccion = new Set<number>();
  guardando = false;
  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    rol: ['Operador' as Rol, Validators.required],
    first_name: [''],
    last_name: [''],
    email: ['', Validators.email],
    password: ['', Validators.minLength(8)],
    is_active: [true],
  });

  constructor(private fb: FormBuilder, public modal: NgbActiveModal, private api: UsuarioService, private toast: ToastService,
              public auth: AuthService, private campeonatosApi: CampeonatoService) {}

  get esOperador() { return !this.auth.esAdmin || this.form.controls.rol.value === 'Operador'; }

  ngOnInit() {
    this.campeonatosApi.todos().subscribe(c => (this.campeonatos = c));
    if (this.usuario) {
      this.form.patchValue({ ...this.usuario, rol: this.usuario.roles?.[0] ?? 'Operador', password: '' });
      this.seleccion = new Set((this.usuario.campeonatos_asignados ?? []).map(c => c.id));
    } else {
      this.form.controls.password.addValidators(Validators.required);
    }
  }

  alternar(id: number) {
    this.seleccion.has(id) ? this.seleccion.delete(id) : this.seleccion.add(id);
    this.seleccion = new Set(this.seleccion);
  }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.aviso('Revise los campos obligatorios del formulario.'); return; }
    if (!this.auth.esAdmin && !this.seleccion.size) {
      this.toast.aviso('Marque al menos un campeonato que el operador pueda operar.');
      return;
    }
    const datos: Partial<Usuario> = { ...this.form.getRawValue() };
    if (!datos.password) { delete datos.password; }
    if (this.esOperador) { datos.campeonatos = [...this.seleccion]; }
    this.guardando = true;
    const req = this.usuario ? this.api.actualizar(this.usuario.id, datos) : this.api.crear(datos);
    req.subscribe({
      next: u => { this.toast.ok('Usuario guardado.'); this.modal.close(u); },
      error: () => (this.guardando = false),
    });
  }
}

@Component({
  selector: 'app-usuarios',
  template: `
    <app-page-title [titulo]="auth.esAdmin ? 'Usuarios' : 'Mis operadores'">
      <button class="btn btn-primary" (click)="abrir()"><i class="ri-add-line align-middle me-1"></i> {{ auth.esAdmin ? 'Nuevo usuario' : 'Nuevo operador' }}</button>
    </app-page-title>
    <div class="alert alert-info py-2 small" *ngIf="!auth.esAdmin">
      <i class="ri-information-line me-1"></i>Los operadores solo cargan resultados (partidos y eventos) y únicamente de los campeonatos que usted les asigne.
    </div>
    <div class="card">
      <div class="card-header" *ngIf="auth.esAdmin">
        <div class="row g-2 align-items-center">
          <div class="col-sm-4 col-lg-3">
            <select class="form-select" id="filtro-rol" [(ngModel)]="filtroRol" (change)="cambiaFiltro()" aria-label="Filtrar por rol">
              <option value="">Personal (todos los roles)</option>
              <option *ngFor="let r of filtrosRol" [value]="r">{{ r }}{{ r === 'Aficionado' ? 's' : '' }}</option>
            </select>
          </div>
          <div class="col-auto form-check form-switch mb-0 ms-2">
            <input class="form-check-input" type="checkbox" id="solo-pend" [checked]="soloPendientes" (change)="alternarPendientes()">
            <label class="form-check-label" for="solo-pend">Solo cuentas pendientes de aprobación</label>
          </div>
        </div>
      </div>
      <div class="card-body">
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !usuarios.length"
                          [mensaje]="soloPendientes ? 'No hay cuentas pendientes de aprobación.' : (auth.esAdmin ? 'No hay usuarios.' : 'Aún no tiene operadores.')"></app-estado-lista>
        <div class="table-responsive" *ngIf="usuarios.length">
          <table class="table table-hover align-middle admin-tabla mb-0">
            <thead class="table-light"><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Alcance</th><th *ngIf="auth.esAdmin">Creado por</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let u of usuarios">
                <td class="fw-medium">{{ u.username }}</td>
                <td>{{ u.first_name }} {{ u.last_name }}</td>
                <td>{{ u.email }}</td>
                <td><span *ngFor="let r of u.roles" class="badge me-1" [ngClass]="claseRol(r)">{{ r }}</span></td>
                <td>
                  <ng-container *ngIf="u.roles.includes('Operador')">
                    <span *ngIf="!u.restringido" class="text-muted">Todos los campeonatos</span>
                    <span *ngFor="let c of u.campeonatos_asignados" class="badge badge-soft-secondary me-1">{{ c.nombre }}</span>
                    <span *ngIf="u.restringido && !u.campeonatos_asignados?.length" class="text-danger small">Sin campeonatos asignados</span>
                  </ng-container>
                  <span *ngIf="u.roles.includes('Organizador')" class="text-muted">Sus campeonatos y equipos</span>
                  <span *ngIf="u.roles.includes('Administrador')" class="text-muted">Todo</span>
                  <span *ngIf="esAficionado(u)" class="text-muted">Portal público (sin acceso al panel)</span>
                </td>
                <td *ngIf="auth.esAdmin">{{ u.creado_por_nombre || '—' }}</td>
                <td>
                  <span *ngIf="u.pendiente" class="badge badge-soft-warning">Pendiente de aprobación</span>
                  <span *ngIf="!u.pendiente" class="badge" [ngClass]="u.is_active ? 'badge-soft-success' : 'badge-soft-secondary'">{{ u.is_active ? 'Activo' : 'Inactivo' }}</span>
                </td>
                <td class="text-end text-nowrap">
                  <button *ngIf="!u.is_active" class="btn btn-sm btn-soft-success me-1" (click)="activar(u)" title="Activar cuenta"><i class="ri-check-line"></i> Activar</button>
                  <button *ngIf="u.is_active && esAficionado(u)" class="btn btn-sm btn-soft-warning me-1" (click)="desactivar(u)" title="Desactivar cuenta"><i class="ri-forbid-line"></i></button>
                  <button *ngIf="!esAficionado(u)" class="btn btn-sm btn-soft-primary me-1" (click)="abrir(u)" title="Editar"><i class="ri-pencil-line"></i></button>
                  <button class="btn btn-sm btn-soft-danger" (click)="eliminar(u)" [disabled]="u.id === auth.usuario?.id" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
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
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  pagina = 1;
  total = 0;
  cargando = true;
  soloPendientes = false;
  filtroRol = '';
  filtrosRol = ['Administrador', 'Organizador', 'Operador', 'Aficionado'];

  constructor(private api: UsuarioService, private modal: NgbModal, private dialogo: DialogService,
              private toast: ToastService, public auth: AuthService) {}

  ngOnInit() { this.cargar(); }

  claseRol(r: string) {
    return r === 'Administrador' ? 'badge-soft-primary' : r === 'Organizador' ? 'badge-soft-success'
      : r === 'Aficionado' ? 'badge-soft-secondary' : 'badge-soft-info';
  }

  esAficionado(u: Usuario) { return u.roles.includes('Aficionado') && u.roles.length === 1; }

  cambiaFiltro() { this.pagina = 1; this.cargar(); }

  desactivar(u: Usuario) {
    this.api.actualizarAficionado(u.id, { is_active: false }).subscribe(() => { this.toast.ok(`Cuenta de ${u.username} desactivada.`); this.cargar(); });
  }

  alternarPendientes() { this.soloPendientes = !this.soloPendientes; this.pagina = 1; this.cargar(); }

  cargar() {
    this.cargando = true;
    const filtros: Record<string, any> = { page: this.pagina };
    if (this.soloPendientes) { filtros['pendientes'] = 1; }
    if (this.filtroRol) { filtros['rol'] = this.filtroRol; }
    this.api.listar(filtros).subscribe({
      next: r => { this.usuarios = r.results; this.total = r.count; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }

  abrir(usuario?: Usuario) {
    const ref = this.modal.open(UsuarioFormComponent, { centered: true, backdrop: 'static', size: 'lg' });
    ref.componentInstance.usuario = usuario ?? null;
    ref.result.then(() => this.cargar(), () => undefined);
  }

  activar(u: Usuario) {
    const req = this.esAficionado(u) ? this.api.actualizarAficionado(u.id, { is_active: true }) : this.api.actualizar(u.id, { is_active: true });
    req.subscribe(() => { this.toast.ok(`Cuenta de ${u.username} activada.`); this.cargar(); });
  }

  async eliminar(u: Usuario) {
    if (!(await this.dialogo.confirmar(`¿Eliminar al usuario "${u.username}"?`, '', 'Eliminar', true))) { return; }
    this.api.eliminarSinAviso(u.id, this.esAficionado(u) ? 'Aficionado' : undefined).subscribe({
      next: () => { this.toast.ok('Usuario eliminado.'); this.cargar(); },
      error: async (e: HttpErrorResponse) => {
        if (e.status === 409 && e.error?.puede_desactivar) {
          // tiene campeonatos, equipos u operadores a su nombre: se ofrece desactivar la cuenta
          if (u.is_active && await this.dialogo.confirmar('No se puede eliminar', `${e.error.detail} ¿Desea desactivarla?`, 'Desactivar cuenta')) {
            this.api.actualizar(u.id, { is_active: false }).subscribe(() => { this.toast.ok('Cuenta desactivada.'); this.cargar(); });
          } else if (!u.is_active) { this.toast.aviso(e.error.detail); }
          return;
        }
        this.toast.error(mensajeError(e));
      },
    });
  }
}

@NgModule({
  declarations: [UsuariosComponent, UsuarioFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: UsuariosComponent }])],
})
export class UsuariosModule {}
