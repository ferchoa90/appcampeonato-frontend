import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Equipo, Jugador, POSICIONES, Posicion } from '../../core/models';
import { toFormData } from '../../core/services/api-utils';
import { JugadorService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-jugador-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <div class="modal-header"><h5 class="modal-title">{{ jugador ? 'Editar jugador' : 'Nuevo jugador' }}</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button></div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label">Nombres *</label>
            <input class="form-control" formControlName="nombres" [class.is-invalid]="inv('nombres')"><div class="invalid-feedback">Obligatorio.</div></div>
          <div class="col-md-6"><label class="form-label">Apellidos *</label>
            <input class="form-control" formControlName="apellidos" [class.is-invalid]="inv('apellidos')"><div class="invalid-feedback">Obligatorio.</div></div>
          <div class="col-md-6"><label class="form-label">Equipo *</label>
            <select class="form-select" formControlName="equipo" [class.is-invalid]="inv('equipo')">
              <option [ngValue]="null" disabled>Seleccione…</option>
              <option *ngFor="let e of equipos" [ngValue]="e.id">{{ e.nombre }}</option>
            </select><div class="invalid-feedback">Seleccione un equipo.</div></div>
          <div class="col-6 col-md-3"><label class="form-label">Número</label>
            <input type="number" min="0" max="99" class="form-control" formControlName="numero"></div>
          <div class="col-6 col-md-3"><label class="form-label">Posición *</label>
            <select class="form-select" formControlName="posicion"><option *ngFor="let p of posiciones" [ngValue]="p.valor">{{ p.etiqueta }}</option></select></div>
          <div class="col-md-4"><label class="form-label">Fecha de nacimiento</label><input type="date" class="form-control" formControlName="fecha_nacimiento"></div>
          <div class="col-md-4"><label class="form-label">Nacionalidad</label><input class="form-control" formControlName="nacionalidad"></div>
          <div class="col-md-4"><label class="form-label">Identificación</label><input class="form-control" formControlName="identificacion"></div>
          <div class="col-12"><label class="form-label">Foto</label>
            <app-imagen-input [url]="jugador?.foto" (archivoChange)="foto = $event"></app-imagen-input></div>
          <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="ju-activo" formControlName="activo"><label class="form-check-label" for="ju-activo">Jugador activo</label></div></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" (click)="modal.dismiss()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="guardando"><span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
      </div>
    </form>`,
})
export class JugadorFormComponent implements OnInit {
  @Input() jugador: Jugador | null = null;
  @Input() equipos: Equipo[] = [];
  @Input() equipoInicial: number | null = null;
  posiciones = POSICIONES;
  foto: File | null = null;
  guardando = false;
  form = this.fb.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    equipo: [null as number | null, Validators.required],
    numero: [null as number | null],
    posicion: ['MED' as Posicion, Validators.required],
    fecha_nacimiento: [null as string | null],
    nacionalidad: [''],
    identificacion: [''],
    activo: [true],
  });

  constructor(private fb: FormBuilder, public modal: NgbActiveModal, private api: JugadorService, private toast: ToastService) {}

  ngOnInit() {
    if (this.jugador) { this.form.patchValue(this.jugador); }
    else if (this.equipoInicial) { this.form.patchValue({ equipo: this.equipoInicial }); }
  }

  inv(c: 'nombres' | 'apellidos' | 'equipo') {
    const x = this.form.controls[c];
    return x.invalid && x.touched;
  }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.aviso('Revise los campos obligatorios del formulario.'); return; }
    const v = this.form.getRawValue();
    const datos: Record<string, any> = { ...v, numero: v.numero === null || (v.numero as any) === '' ? null : v.numero, fecha_nacimiento: v.fecha_nacimiento || null };
    if (this.foto) { datos['foto'] = this.foto; }
    const cuerpo = this.foto ? toFormData(datos) : datos;
    this.guardando = true;
    const req = this.jugador ? this.api.actualizar(this.jugador.id, cuerpo) : this.api.crear(cuerpo);
    req.subscribe({
      next: j => { this.toast.ok('Jugador guardado.'); this.modal.close(j); },
      error: () => (this.guardando = false),
    });
  }
}
