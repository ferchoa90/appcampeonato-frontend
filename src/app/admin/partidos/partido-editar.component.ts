import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Partido } from '../../core/models';
import { PartidoService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';

/** Convierte un ISO a valor de <input type="datetime-local"> (hora local). */
export function isoALocal(iso: string | null): string {
  if (!iso) { return ''; }
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

@Component({
  selector: 'app-partido-editar',
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <div class="modal-header"><h5 class="modal-title">Editar partido</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button></div>
      <div class="modal-body">
        <p class="fw-medium mb-3">{{ partido.local_detalle.nombre }} vs {{ partido.visitante_detalle.nombre }}
          <span class="text-muted fw-normal">· {{ partido.fecha_nombre }}</span></p>
        <app-aviso-postergacion [partido]="partido"></app-aviso-postergacion>
        <div class="mb-3"><label class="form-label">{{ partido.estado === 'POSTERGADO' ? 'Nueva fecha y hora' : 'Fecha y hora' }}</label><input type="datetime-local" class="form-control" formControlName="fecha_hora"></div>
        <div class="form-check mb-3" *ngIf="partido.estado === 'POSTERGADO'">
          <input class="form-check-input" type="checkbox" id="reprogramar" formControlName="reprogramar">
          <label class="form-check-label" for="reprogramar">Reprogramar: volver el partido a Pendiente con esta fecha</label>
        </div>
        <div class="mb-3"><label class="form-label">Estadio</label><input class="form-control" formControlName="estadio"></div>
        <div><label class="form-label">Observaciones</label><textarea rows="2" class="form-control" formControlName="observaciones"></textarea></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" (click)="modal.dismiss()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="guardando"><span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
      </div>
    </form>`,
})
export class PartidoEditarComponent implements OnInit {
  @Input() partido!: Partido;
  guardando = false;
  form = this.fb.nonNullable.group({ fecha_hora: [''], estadio: [''], observaciones: [''], reprogramar: [true] });

  constructor(private fb: FormBuilder, public modal: NgbActiveModal, private api: PartidoService, private toast: ToastService) {}

  ngOnInit() {
    this.form.patchValue({
      fecha_hora: isoALocal(this.partido.fecha_hora),
      estadio: this.partido.estadio,
      observaciones: this.partido.observaciones ?? '',
    });
  }

  guardar() {
    const v = this.form.getRawValue();
    const reprogramar = this.partido.estado === 'POSTERGADO' && v.reprogramar;
    if (reprogramar && !v.fecha_hora) { this.toast.aviso('Indique la nueva fecha para reprogramar el partido.'); return; }
    this.guardando = true;
    this.api.actualizar(this.partido.id, {
      fecha_hora: v.fecha_hora ? new Date(v.fecha_hora).toISOString() : null,
      estadio: v.estadio,
      observaciones: v.observaciones,
      ...(reprogramar ? { estado: 'PENDIENTE' as const } : {}),
    }).subscribe({
      next: p => { this.toast.ok(reprogramar ? 'Partido reprogramado.' : 'Partido actualizado.'); this.modal.close(p); },
      error: () => (this.guardando = false),
    });
  }
}
