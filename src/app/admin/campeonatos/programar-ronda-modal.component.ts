import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Fecha, FeriadoConflicto, Partido, etiquetaEstadoPartido } from '../../core/models';
import { mensajeError } from '../../core/services/api-utils';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { isoALocal } from '../partidos/partido-editar.component';

interface Fila { partido: Partido; valor: string; editable: boolean; }

/** Modal para elegir día y hora de cada partido de una ronda (semifinal, final...), una vez terminada la anterior. */
@Component({
  selector: 'app-programar-ronda-modal',
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Programar {{ fecha.nombre }}</h5>
      <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button>
    </div>
    <div class="modal-body">
      <p class="text-muted small mb-3">Elija el día y la hora de cada partido. Los que deje vacíos quedarán «por definir» y podrá programarlos después.</p>
      <div class="row g-2 align-items-center mb-3" *ngFor="let f of filas">
        <div class="col-md-7">
          <div class="fw-medium">{{ f.partido.local_detalle.nombre }} <span class="text-muted fw-normal">vs</span> {{ f.partido.visitante_detalle.nombre }}</div>
          <div class="small text-muted" *ngIf="!f.editable">{{ etiquetaEstado(f.partido.estado) }}: ya no se puede programar aquí.</div>
        </div>
        <div class="col-md-5">
          <input type="datetime-local" class="form-control" [(ngModel)]="f.valor" [disabled]="!f.editable" [attr.aria-label]="'Día y hora de ' + f.partido.local_detalle.nombre + ' vs ' + f.partido.visitante_detalle.nombre">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="modal.dismiss()">Más tarde</button>
      <button type="button" class="btn btn-primary" (click)="guardar()" [disabled]="guardando">
        <span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>Guardar
      </button>
    </div>`,
})
export class ProgramarRondaModalComponent implements OnInit {
  @Input() fecha!: Fecha;
  filas: Fila[] = [];
  guardando = false;
  readonly etiquetaEstado = etiquetaEstadoPartido;

  constructor(public modal: NgbActiveModal, private api: CampeonatoService, private toast: ToastService,
              private dialogo: DialogService) {}

  ngOnInit() {
    this.filas = (this.fecha.partidos ?? []).map(p => ({
      partido: p, valor: isoALocal(p.fecha_hora), editable: p.estado === 'PENDIENTE',
    }));
  }

  guardar(confirmarFeriados = false) {
    const partidos = this.filas
      .filter(f => f.editable && f.valor)
      .map(f => ({ id: f.partido.id, fecha_hora: new Date(f.valor).toISOString() }));
    if (!partidos.length) {
      this.toast.aviso('Indique el día y la hora de al menos un partido.');
      return;
    }
    this.guardando = true;
    this.api.programarRonda(this.fecha.id, partidos, confirmarFeriados).subscribe({
      next: f => { this.toast.ok('Ronda programada.'); this.modal.close(f); },
      error: async (e: HttpErrorResponse) => {
        this.guardando = false;
        if (e.status === 409 && e.error?.requiere_confirmacion_feriados) {
          // algún partido cae en feriado: se pide confirmación para jugarlo igual
          const lista = (e.error.feriados as FeriadoConflicto[]).map(f => `${this.fechaCorta(f.fecha)} (${f.nombre})`).join(', ');
          if (await this.dialogo.confirmar('Partido en feriado', `Elegiste un día feriado: ${lista}. ¿Se juega igual?`, 'Sí, jugar igual')) {
            this.guardar(true);
          }
          return;
        }
        this.toast.error(mensajeError(e));
      },
    });
  }

  private fechaCorta(iso: string) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
}
