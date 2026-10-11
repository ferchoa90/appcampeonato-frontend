import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Campeonato, Feriado } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { FeriadoService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-feriado-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <div class="modal-header"><h5 class="modal-title">{{ feriado ? 'Editar feriado' : 'Nuevo feriado' }}</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button></div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-5"><label class="form-label">Fecha *</label>
            <input type="date" class="form-control" formControlName="fecha" [class.is-invalid]="form.controls.fecha.touched && form.controls.fecha.invalid">
            <div class="invalid-feedback">Indique la fecha.</div></div>
          <div class="col-md-7"><label class="form-label">Nombre *</label>
            <input class="form-control" formControlName="nombre" maxlength="100" placeholder="Ej. Día del Trabajo" [class.is-invalid]="form.controls.nombre.touched && form.controls.nombre.invalid">
            <div class="invalid-feedback">El nombre es obligatorio.</div></div>
          <div class="col-12"><label class="form-label">Aplica a</label>
            <select class="form-select" formControlName="campeonato" [class.is-invalid]="form.controls.campeonato.touched && form.controls.campeonato.invalid">
              <option [ngValue]="null">{{ auth.esAdmin ? 'Todos los campeonatos' : 'Elija uno de sus campeonatos…' }}</option>
              <option *ngFor="let c of campeonatos" [ngValue]="c.id">{{ c.nombre }} {{ c.temporada }}</option>
            </select></div>
          <div class="col-12"><div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="fer-repite" formControlName="se_repite">
            <label class="form-check-label" for="fer-repite">Se repite todos los años</label>
            <div class="form-text">Útil para feriados fijos (1 de mayo, 25 de diciembre...): se considera el mismo día y mes en cualquier año.</div></div></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" (click)="modal.dismiss()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="guardando"><span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
      </div>
    </form>`,
})
export class FeriadoFormComponent implements OnInit {
  @Input() feriado: Feriado | null = null;
  campeonatos: Campeonato[] = [];
  guardando = false;
  form = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    campeonato: [null as number | null],
    se_repite: [false],
  });

  constructor(private fb: FormBuilder, public modal: NgbActiveModal, private api: FeriadoService,
              private campeonatosApi: CampeonatoService, private toast: ToastService, public auth: AuthService) {}

  ngOnInit() {
    // el organizador sólo crea feriados para uno de sus campeonatos (los generales los define el administrador)
    if (!this.auth.esAdmin) { this.form.controls.campeonato.addValidators(Validators.required); }
    this.campeonatosApi.todos().subscribe(c => (this.campeonatos = c));
    if (this.feriado) { this.form.patchValue(this.feriado); }
  }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.aviso('Revise los campos obligatorios del formulario.'); return; }
    const datos = this.form.getRawValue();
    this.guardando = true;
    const req = this.feriado ? this.api.actualizar(this.feriado.id, datos) : this.api.crear(datos);
    req.subscribe({
      next: f => { this.toast.ok('Feriado guardado.'); this.modal.close(f); },
      error: () => (this.guardando = false),
    });
  }
}
