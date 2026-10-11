import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Equipo, Usuario } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { toFormData } from '../../core/services/api-utils';
import { EquipoService, UsuarioService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-equipo-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <div class="modal-header"><h5 class="modal-title">{{ equipo ? 'Editar equipo' : 'Nuevo equipo' }}</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button></div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-8"><label class="form-label">Nombre *</label>
            <input class="form-control" formControlName="nombre" [class.is-invalid]="form.controls.nombre.touched && form.controls.nombre.invalid">
            <div class="invalid-feedback">El nombre es obligatorio.</div></div>
          <div class="col-md-4"><label class="form-label">Sigla</label><input class="form-control" formControlName="abreviatura" maxlength="5"></div>
          <div class="col-md-6"><label class="form-label">Ciudad</label><input class="form-control" formControlName="ciudad"></div>
          <div class="col-md-6"><label class="form-label">Estadio</label><input class="form-control" formControlName="estadio"></div>
          <div class="col-12" *ngIf="auth.esAdmin"><label class="form-label">Propietario</label>
            <select class="form-select" formControlName="propietario">
              <option [ngValue]="null">Del sistema (sin propietario)</option>
              <option *ngFor="let o of organizadores" [ngValue]="o.id">{{ o.username }}</option>
            </select>
            <div class="form-text">Los equipos de un campeonato deben ser de su mismo propietario.</div></div>
          <div class="col-md-8"><label class="form-label">Entrenador</label><input class="form-control" formControlName="entrenador"></div>
          <div class="col-md-4"><label class="form-label">Color principal</label><input type="color" class="form-control form-control-color w-100" formControlName="color_principal"></div>
          <div class="col-12"><label class="form-label">Escudo</label>
            <app-imagen-input [url]="equipo?.escudo" (archivoChange)="escudo = $event"></app-imagen-input></div>
          <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="eq-activo" formControlName="activo"><label class="form-check-label" for="eq-activo">Equipo activo</label></div></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" (click)="modal.dismiss()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="guardando"><span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
      </div>
    </form>`,
})
export class EquipoFormComponent implements OnInit {
  @Input() equipo: Equipo | null = null;
  escudo: File | null = null;
  guardando = false;
  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required], abreviatura: [''], ciudad: [''], estadio: [''], entrenador: [''],
    color_principal: ['#405189'], activo: [true], propietario: [null as number | null],
  });
  organizadores: Usuario[] = [];

  constructor(private fb: FormBuilder, public modal: NgbActiveModal, private api: EquipoService, private toast: ToastService,
              public auth: AuthService, private usuarios: UsuarioService) {}

  ngOnInit() {
    if (this.auth.esAdmin) { this.usuarios.organizadores().subscribe(o => (this.organizadores = o)); }
    if (this.equipo) { this.form.patchValue(this.equipo); }
  }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.aviso('Revise los campos obligatorios del formulario.'); return; }
    const datos: Record<string, any> = { ...this.form.getRawValue() };
    if (!this.auth.esAdmin) { delete datos['propietario']; }                       // el servidor lo asigna al organizador
    else if (this.escudo && datos['propietario'] == null) { datos['propietario'] = ''; }  // multipart: vacío = sin propietario
    if (this.escudo) { datos['escudo'] = this.escudo; }
    const cuerpo = this.escudo ? toFormData(datos) : datos;
    this.guardando = true;
    const req = this.equipo ? this.api.actualizar(this.equipo.id, cuerpo) : this.api.crear(cuerpo);
    req.subscribe({
      next: e => { this.toast.ok('Equipo guardado.'); this.modal.close(e); },
      error: () => (this.guardando = false),
    });
  }
}
