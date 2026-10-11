import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { EquipoMini, ResultadoHorarios } from '../../core/models';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { ToastService } from '../../core/services/toast.service';

interface Regla { equipo: number | null; orden: number; }

/**
 * Reglas de logística: un equipo siempre juega en el N-ésimo horario del día (p. ej. BODEGA en el 2.º, a las 20:00).
 * Sólo se intercambian horas entre partidos del mismo día: no cambian los cruces, las fechas ni los días.
 */
@Component({
  selector: 'app-horarios-fijos-modal',
  template: `
    <div class="modal-header">
      <h5 class="modal-title"><i class="ri-time-line me-1"></i> Horarios fijos por equipo</h5>
      <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Cerrar"></button>
    </div>

    <div class="modal-body" *ngIf="!vista">
      <p class="text-muted small">Elija un equipo y en qué horario del día debe jugar siempre. El sorteo no cambia: solo el orden de los partidos dentro del mismo día (los que ya comenzaron no se tocan).</p>
      <div class="row g-2 align-items-center mb-2" *ngFor="let r of reglas; let i = index">
        <div class="col"><select class="form-select" [(ngModel)]="r.equipo" [attr.aria-label]="'Equipo ' + (i + 1)">
          <option [ngValue]="null">Equipo…</option><option *ngFor="let e of opciones(r)" [ngValue]="e.id">{{ e.nombre }}</option></select></div>
        <div class="col-auto text-muted small">siempre en el</div>
        <div class="col-4 col-md-3"><select class="form-select" [(ngModel)]="r.orden" aria-label="Horario">
          <option *ngFor="let o of ordenes" [ngValue]="o.valor">{{ o.etiqueta }}</option></select></div>
        <div class="col-auto"><button type="button" class="btn btn-light" title="Quitar" (click)="quitar(i)"><i class="ri-close-line"></i></button></div>
      </div>
      <p class="text-muted small mb-2" *ngIf="!reglas.length">No hay reglas. Con la lista vacía se quitan las reglas guardadas.</p>
      <button type="button" class="btn btn-sm btn-soft-secondary" (click)="agregar()"><i class="ri-add-line align-middle"></i> Agregar equipo</button>
      <div class="form-text mt-3">Las reglas quedan guardadas y se aplican también si se repite el sorteo. Quitar una regla no devuelve los horarios ya cambiados.</div>
    </div>

    <div class="modal-body" *ngIf="vista">
      <div class="alert alert-success py-2 small" *ngIf="!vista.cambios.length">Los partidos ya cumplen estas reglas: no hay nada que reordenar.</div>
      <ng-container *ngIf="vista.cambios.length">
        <p class="mb-2">Se intercambiarán las horas de <b>{{ vista.cambios.length }}</b> partidos pendientes (mismo día, mismos cruces):</p>
        <div class="table-responsive" style="max-height:320px;overflow:auto">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light"><tr><th>Fecha</th><th>Día</th><th>Partido</th><th class="text-nowrap">Hora</th></tr></thead>
            <tbody><tr *ngFor="let c of vista.cambios">
              <td>{{ c.fecha }}</td><td class="text-nowrap">{{ fechaCorta(c.dia) }}</td><td>{{ c.partido }}</td>
              <td class="text-nowrap">{{ c.de }} → <b>{{ c.a }}</b></td></tr></tbody>
          </table>
        </div>
      </ng-container>
      <div class="alert alert-warning py-2 small mt-3 mb-0" *ngIf="vista.sin_aplicar.length">
        <b>No se pudo cumplir en:</b>
        <ul class="mb-0"><li *ngFor="let s of vista.sin_aplicar">{{ s.equipo }} · {{ s.fecha }} ({{ fechaCorta(s.dia) }}): {{ s.motivo }}.</li></ul>
      </div>
    </div>

    <div class="modal-footer">
      <ng-container *ngIf="!vista">
        <button type="button" class="btn btn-light" (click)="modal.dismiss()">Cancelar</button>
        <button type="button" class="btn btn-primary" (click)="previsualizar()" [disabled]="cargando">
          <span *ngIf="cargando" class="spinner-border spinner-border-sm me-1"></span>Vista previa</button>
      </ng-container>
      <ng-container *ngIf="vista">
        <button type="button" class="btn btn-light" (click)="vista = null">Atrás</button>
        <button type="button" class="btn btn-primary" (click)="aplicar()" [disabled]="cargando">
          <span *ngIf="cargando" class="spinner-border spinner-border-sm me-1"></span>{{ reglas.length ? 'Guardar y aplicar' : 'Guardar' }}</button>
      </ng-container>
    </div>`,
})
export class HorariosFijosModalComponent implements OnInit {
  @Input() campeonatoId!: number;
  @Input() equipos: EquipoMini[] = [];
  @Input() reglasGuardadas: { equipo: number; orden: number }[] = [];

  reglas: Regla[] = [];
  vista: ResultadoHorarios | null = null;
  cargando = false;
  readonly ordenes = [
    { valor: 1, etiqueta: '1.er horario' }, { valor: 2, etiqueta: '2.º horario' },
    { valor: 3, etiqueta: '3.er horario' }, { valor: 4, etiqueta: '4.º horario' },
  ];

  constructor(public modal: NgbActiveModal, private api: CampeonatoService, private toast: ToastService) {}

  ngOnInit() {
    this.reglas = this.reglasGuardadas.length
      ? this.reglasGuardadas.map(r => ({ equipo: r.equipo, orden: r.orden }))
      : [{ equipo: null, orden: 2 }];
  }

  /** Equipos aún no usados en otra regla. */
  opciones(actual: Regla) {
    const usados = new Set(this.reglas.filter(r => r !== actual && r.equipo != null).map(r => r.equipo));
    return this.equipos.filter(e => !usados.has(e.id));
  }

  agregar() { this.reglas = [...this.reglas, { equipo: null, orden: 2 }]; }
  quitar(i: number) { this.reglas = this.reglas.filter((_, k) => k !== i); }

  private completas() { return this.reglas.filter(r => r.equipo != null).map(r => ({ equipo: r.equipo as number, orden: r.orden })); }

  previsualizar() {
    if (this.reglas.some(r => r.equipo == null) && this.reglas.length > 1) {
      this.toast.aviso('Elija el equipo en cada regla o quite las filas vacías.');
      return;
    }
    this.cargando = true;
    this.api.horariosFijos(this.campeonatoId, this.completas(), false).subscribe({
      next: r => { this.cargando = false; this.vista = r; },
      error: () => (this.cargando = false),
    });
  }

  aplicar() {
    this.cargando = true;
    this.api.horariosFijos(this.campeonatoId, this.completas(), true).subscribe({
      next: r => {
        this.cargando = false;
        this.toast.ok(r.cambios.length ? `Horarios reordenados: ${r.cambios.length} partidos.` : 'Reglas guardadas.');
        this.modal.close(r);
      },
      error: () => (this.cargando = false),
    });
  }

  fechaCorta(iso: string) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}
