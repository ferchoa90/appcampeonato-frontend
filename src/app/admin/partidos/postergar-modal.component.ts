import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MOTIVOS_POSTERGACION, Partido } from '../../core/models';
import { PartidoService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';
import { isoALocal } from './partido-editar.component';

/** Modal para postergar (motivo obligatorio, nueva fecha opcional) o reprogramar (nueva fecha obligatoria) un partido. */
@Component({
  selector: 'app-postergar-modal',
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <div class="modal-header">
        <h5 class="modal-title">{{ reprogramar ? 'Reprogramar partido' : 'Postergar partido' }}</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button>
      </div>
      <div class="modal-body">
        <p class="fw-medium mb-3">{{ partido.local_detalle.nombre }} vs {{ partido.visitante_detalle.nombre }}
          <span class="text-muted fw-normal">· {{ partido.fecha_nombre }}</span></p>

        <div class="mb-3" *ngIf="!reprogramar">
          <label class="form-label">Motivo *</label>
          <div class="d-flex flex-wrap gap-2 mb-2">
            <button type="button" *ngFor="let m of atajos" class="btn btn-sm"
                    [ngClass]="form.controls.motivo.value === m ? 'btn-primary' : 'btn-soft-primary'" (click)="elegirMotivo(m)">{{ m }}</button>
            <button type="button" class="btn btn-sm" [ngClass]="esOtro ? 'btn-primary' : 'btn-soft-primary'" (click)="elegirMotivo('')">Otro</button>
          </div>
          <input id="motivo-posterga" class="form-control" formControlName="motivo" maxlength="255" placeholder="Describa el motivo"
                 [class.is-invalid]="form.controls.motivo.touched && form.controls.motivo.invalid">
          <div class="invalid-feedback">El motivo es obligatorio.</div>
        </div>

        <div class="mb-2">
          <label class="form-label">Nueva fecha y hora {{ reprogramar ? '*' : '(opcional)' }}</label>
          <input id="nueva-fecha" type="datetime-local" class="form-control" formControlName="fecha_hora"
                 [class.is-invalid]="form.controls.fecha_hora.touched && form.controls.fecha_hora.invalid">
          <div class="invalid-feedback">Indique la nueva fecha y hora.</div>
          <div class="form-text" *ngIf="!reprogramar">Si la deja vacía, la nueva fecha quedará «por definir».</div>
          <div class="form-text" *ngIf="reprogramar">El partido volverá al estado Pendiente.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" (click)="modal.dismiss()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="guardando">
          <span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>{{ reprogramar ? 'Reprogramar' : 'Postergar' }}
        </button>
      </div>
    </form>`,
})
export class PostergarModalComponent implements OnInit {
  @Input() partido!: Partido;
  /** true = reprogramar un partido ya postergado. */
  @Input() reprogramar = false;
  atajos = MOTIVOS_POSTERGACION;
  guardando = false;
  form = this.fb.nonNullable.group({ motivo: [''], fecha_hora: [''] });

  constructor(private fb: FormBuilder, public modal: NgbActiveModal, private api: PartidoService, private toast: ToastService) {}

  get esOtro() {
    const m = this.form.controls.motivo.value;
    return !this.atajos.includes(m);
  }

  ngOnInit() {
    if (this.reprogramar) {
      this.form.controls.fecha_hora.addValidators(Validators.required);
      this.form.patchValue({ fecha_hora: isoALocal(this.partido.fecha_hora) });
    } else {
      this.form.controls.motivo.addValidators([Validators.required, Validators.pattern(/\S/)]);
    }
  }

  elegirMotivo(m: string) {
    this.form.controls.motivo.setValue(m);
    if (!m) { setTimeout(() => document.getElementById('motivo-posterga')?.focus()); }
  }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { return; }
    const v = this.form.getRawValue();
    const iso = v.fecha_hora ? new Date(v.fecha_hora).toISOString() : undefined;
    this.guardando = true;
    const req = this.reprogramar
      ? this.api.reprogramar(this.partido.id, iso!)
      : this.api.cambiarEstado(this.partido.id, 'POSTERGADO', { motivo: v.motivo.trim(), fechaHora: iso });
    req.subscribe({
      next: p => {
        this.toast.ok(this.reprogramar ? 'Partido reprogramado.' : (iso ? 'Partido postergado con nueva fecha.' : 'Partido postergado: nueva fecha por definir.'));
        this.modal.close(p);
      },
      error: () => (this.guardando = false),
    });
  }
}
