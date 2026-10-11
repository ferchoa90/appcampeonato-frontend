import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  EstadoPartido, Evento, FASES_ELIMINATORIA, Jugador, Partido, TIPOS_EVENTO, TipoEvento, etiquetaEstadoPartido,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../core/services/dialog.service';
import { EventoService, JugadorService, PartidoService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';
import { PartidoEditarComponent } from './partido-editar.component';
import { PostergarModalComponent } from './postergar-modal.component';

interface AccionEstado {
  estado: EstadoPartido;
  texto: string;
  icono: string;
  clase: string;
  aviso: string;
}

const ACCIONES: AccionEstado[] = [
  { estado: 'INICIADO', texto: 'Iniciar', icono: 'ri-play-circle-line', clase: 'success', aviso: 'Se notificará a los seguidores que el partido comenzó.' },
  { estado: 'ENTRETIEMPO', texto: 'Entretiempo', icono: 'ri-pause-circle-line', clase: 'warning', aviso: 'Se notificará el entretiempo.' },
  { estado: 'FINALIZADO', texto: 'Finalizar', icono: 'ri-stop-circle-line', clase: 'primary', aviso: 'Se cerrará el partido con el marcador actual y se notificará el resultado.' },
  { estado: 'POSTERGADO', texto: 'Postergar', icono: 'ri-time-line', clase: 'info', aviso: 'El partido quedará postergado.' },
  { estado: 'PENDIENTE', texto: 'Pendiente', icono: 'ri-restart-line', clase: 'secondary', aviso: 'El partido volverá al estado pendiente.' },
];

@Component({
  selector: 'app-gestionar-partido',
  template: `
    <app-page-title titulo="Gestionar partido">
      <a routerLink="/admin/partidos" class="btn btn-light"><i class="ri-arrow-left-line align-middle"></i> Partidos</a>
    </app-page-title>
    <app-estado-lista [cargando]="!partido"></app-estado-lista>

    <ng-container *ngIf="partido as p">
      <!-- Marcador -->
      <div class="card">
        <div class="card-body">
          <div class="text-center text-muted small mb-2">
            {{ p.campeonato_nombre }} · {{ p.fecha_nombre }}<ng-container *ngIf="p.grupo_nombre"> · {{ p.grupo_nombre }}</ng-container>
            <ng-container *ngIf="p.fecha_hora && p.estado !== 'POSTERGADO'"> · {{ p.fecha_hora | date:'dd/MM/yyyy HH:mm' }}</ng-container>
            <ng-container *ngIf="p.estadio"> · {{ p.estadio }}</ng-container>
            <button class="btn btn-sm btn-link" (click)="editar()">Editar</button>
          </div>
          <div class="mx-auto mb-3" style="max-width:420px"><app-aviso-postergacion [partido]="p"></app-aviso-postergacion></div>
          <div class="marcador-fila">
            <div class="marcador-equipo"><app-escudo [equipo]="p.local_detalle" [tam]="64"></app-escudo><span>{{ p.local_detalle.nombre }}</span><app-tarjetas-mini [t]="p.tarjetas?.local"></app-tarjetas-mini></div>
            <div class="marcador-centro">
              <div class="marcador-gestion">{{ p.goles_local }} <span class="text-muted">-</span> {{ p.goles_visitante }}</div>
              <app-estado-partido [estado]="p.estado"></app-estado-partido>
              <div class="small text-muted mt-1" *ngIf="p.penales_local !== null && p.penales_visitante !== null">Penales: {{ p.penales_local }} - {{ p.penales_visitante }}</div>
            </div>
            <div class="marcador-equipo"><app-escudo [equipo]="p.visitante_detalle" [tam]="64"></app-escudo><span>{{ p.visitante_detalle.nombre }}</span><app-tarjetas-mini [t]="p.tarjetas?.visitante"></app-tarjetas-mini></div>
          </div>
          <hr>
          <div class="d-flex flex-wrap justify-content-center gap-2">
            <ng-container *ngFor="let a of acciones">
              <button *ngIf="!(a.estado === 'POSTERGADO' && p.estado === 'POSTERGADO')" type="button" class="btn" [ngClass]="'btn-' + (a.estado === p.estado ? a.clase : 'soft-' + a.clase)"
                      [disabled]="a.estado === p.estado || cambiando" (click)="cambiarEstado(a)">
                <i [class]="a.icono + ' align-middle me-1'"></i>{{ a.texto }}
              </button>
            </ng-container>
            <button *ngIf="p.estado === 'POSTERGADO'" type="button" class="btn btn-info" (click)="reprogramar()" [disabled]="cambiando">
              <i class="ri-calendar-event-line align-middle me-1"></i>Reprogramar
            </button>
          </div>
        </div>
      </div>

      <div class="row">
        <!-- Registrar evento -->
        <div class="col-xl-5">
          <div class="card">
            <div class="card-header"><h5 class="card-title mb-0">Registrar evento</h5></div>
            <div class="card-body">
              <form [formGroup]="form" (ngSubmit)="registrar()">
                <div class="mb-3">
                  <label class="form-label">Tipo de evento</label>
                  <div class="d-flex flex-wrap gap-2">
                    <button type="button" *ngFor="let t of tipos" class="btn btn-sm" [ngClass]="form.controls.tipo.value === t.valor ? 'btn-' + t.clase : 'btn-soft-' + t.clase"
                            (click)="elegirTipo(t.valor)"><i [class]="t.icono + ' align-middle me-1'"></i>{{ t.etiqueta }}</button>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Equipo</label>
                  <div class="btn-group w-100" role="group">
                    <button type="button" class="btn" [ngClass]="form.controls.equipo.value === p.local ? 'btn-primary' : 'btn-light'" (click)="elegirEquipo(p.local)">{{ p.local_detalle.nombre }}</button>
                    <button type="button" class="btn" [ngClass]="form.controls.equipo.value === p.visitante ? 'btn-primary' : 'btn-light'" (click)="elegirEquipo(p.visitante)">{{ p.visitante_detalle.nombre }}</button>
                  </div>
                  <div class="form-text" *ngIf="form.controls.tipo.value === 'AUTOGOL'">Autogol: elija el equipo del jugador que lo marcó; el gol se suma al rival.</div>
                </div>

                <ng-container *ngIf="tipoActual !== 'INCIDENCIA'">
                  <div class="mb-3">
                    <label class="form-label">{{ tipoActual === 'CAMBIO' ? 'Jugador que sale' : 'Jugador' }} *</label>
                    <select class="form-select" formControlName="jugador">
                      <option [ngValue]="null">Seleccione…</option>
                      <option *ngFor="let j of jugadores" [ngValue]="j.id">{{ j.numero ?? '–' }} · {{ j.nombre_completo }}</option>
                    </select>
                  </div>
                  <div class="mb-3" *ngIf="tipoActual === 'CAMBIO'">
                    <label class="form-label">Jugador que entra *</label>
                    <select class="form-select" formControlName="jugador_relevo">
                      <option [ngValue]="null">Seleccione…</option>
                      <option *ngFor="let j of jugadores" [ngValue]="j.id" [disabled]="j.id === form.controls.jugador.value">{{ j.numero ?? '–' }} · {{ j.nombre_completo }}</option>
                    </select>
                  </div>
                </ng-container>

                <div class="row g-3">
                  <div class="col-4"><label class="form-label">Minuto *</label><input type="number" min="0" max="150" class="form-control" formControlName="minuto"></div>
                  <div class="col-8"><label class="form-label">Descripción {{ tipoActual === 'INCIDENCIA' ? '*' : '(opcional)' }}</label><input class="form-control" formControlName="descripcion" maxlength="255"></div>
                </div>
                <div class="text-muted small mt-2" *ngIf="!jugadores.length && tipoActual !== 'INCIDENCIA'">Este equipo no tiene jugadores registrados.</div>
                <button type="submit" class="btn btn-success w-100 mt-3" [disabled]="guardando"><span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span><i class="ri-add-circle-line align-middle me-1"></i> Registrar evento</button>
              </form>
            </div>
          </div>

          <!-- Penales -->
          <div class="card" *ngIf="esEliminatoria">
            <div class="card-header"><h5 class="card-title mb-0">Penales</h5></div>
            <div class="card-body">
              <p class="text-muted small">En las llaves un empate se define por penales.</p>
              <div class="row g-2 align-items-end">
                <div class="col"><label class="form-label">{{ p.local_detalle.abreviatura }}</label><input type="number" min="0" class="form-control" [(ngModel)]="penLocal"></div>
                <div class="col"><label class="form-label">{{ p.visitante_detalle.abreviatura }}</label><input type="number" min="0" class="form-control" [(ngModel)]="penVisita"></div>
                <div class="col-auto"><button class="btn btn-primary" (click)="guardarPenales()" [disabled]="guardando">Guardar</button></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Eventos -->
        <div class="col-xl-7">
          <div class="card">
            <div class="card-header"><h5 class="card-title mb-0">Eventos del partido</h5></div>
            <div class="card-body">
              <app-estado-lista [vacio]="!eventos.length" mensaje="Todavía no hay eventos."></app-estado-lista>
              <ul class="list-group list-group-flush" *ngIf="eventos.length">
                <li class="list-group-item d-flex align-items-center gap-3" *ngFor="let e of eventos">
                  <span class="badge bg-primary rounded-pill" style="min-width:48px">{{ e.minuto }}'</span>
                  <span class="fs-4" [ngClass]="'text-' + tipo(e).clase"><i [class]="tipo(e).icono"></i></span>
                  <div class="flex-grow-1">
                    <div class="fw-medium">{{ tipo(e).etiqueta }}<ng-container *ngIf="e.tipo !== 'CAMBIO' && e.jugador_nombre"> · {{ e.jugador_nombre }}</ng-container></div>
                    <div class="small text-muted">
                      {{ e.equipo === p.local ? p.local_detalle.nombre : p.visitante_detalle.nombre }}
                      <ng-container *ngIf="e.tipo === 'CAMBIO'"> · sale {{ e.jugador_nombre }}, entra {{ e.relevo_nombre }}</ng-container>
                      <ng-container *ngIf="e.descripcion"> · {{ e.descripcion }}</ng-container>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-soft-danger" (click)="eliminar(e)" title="Eliminar evento"><i class="ri-delete-bin-line"></i></button>
                </li>
              </ul>
            </div>
          </div>
          <app-medios-admin *ngIf="auth.esAdmin || auth.esOrganizador" [partidoId]="p.id" [medios]="p.medios || []" (cambio)="cargar()"></app-medios-admin>
        </div>
      </div>
    </ng-container>`,
})
export class GestionarPartidoComponent implements OnInit {
  partido: Partido | null = null;
  eventos: Evento[] = [];
  jugadores: Jugador[] = [];
  tipos = TIPOS_EVENTO;
  acciones = ACCIONES;
  cambiando = false;
  guardando = false;
  penLocal: number | null = null;
  penVisita: number | null = null;
  private cachePlantel = new Map<number, Jugador[]>();

  form = this.fb.group({
    tipo: ['GOL' as TipoEvento],
    equipo: [0],
    jugador: [null as number | null],
    jugador_relevo: [null as number | null],
    minuto: [1],
    descripcion: [''],
  });

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private api: PartidoService,
              private eventosApi: EventoService, private jugadoresApi: JugadorService, private dialogo: DialogService,
              private toast: ToastService, private modal: NgbModal, public auth: AuthService) {}

  get tipoActual() { return this.form.controls.tipo.value as TipoEvento; }
  get esEliminatoria() { return !!this.partido && FASES_ELIMINATORIA.includes(this.partido.fase); }
  tipo(e: Evento) { return TIPOS_EVENTO.find(t => t.valor === e.tipo) ?? TIPOS_EVENTO[7]; }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id, true);
  }

  cargar(id = this.partido!.id, primera = false) {
    this.api.detalle(id).subscribe({
      next: p => {
        this.partido = p;
        this.eventos = [...(p.eventos ?? [])].sort((a, b) => b.minuto - a.minuto || b.id - a.id);
        this.penLocal = p.penales_local;
        this.penVisita = p.penales_visitante;
        if (primera) { this.elegirEquipo(p.local); }
      },
      error: () => this.router.navigate(['/admin/partidos']),
    });
  }

  elegirTipo(t: TipoEvento) { this.form.patchValue({ tipo: t }); }

  elegirEquipo(id: number) {
    this.form.patchValue({ equipo: id, jugador: null, jugador_relevo: null });
    const cache = this.cachePlantel.get(id);
    if (cache) { this.jugadores = cache; return; }
    this.jugadores = [];
    this.jugadoresApi.todos({ equipo: id, activo: true }).subscribe(js => {
      this.cachePlantel.set(id, js);
      if (this.form.controls.equipo.value === id) { this.jugadores = js; }
    });
  }

  async cambiarEstado(a: AccionEstado) {
    if (!this.partido) { return; }
    if (a.estado === 'POSTERGADO') { this.abrirPostergar(false); return; }
    if (!(await this.dialogo.confirmar(`¿${a.texto} el partido?`, a.aviso, `Sí, ${a.texto.toLowerCase()}`))) { return; }
    this.cambiando = true;
    this.api.cambiarEstado(this.partido.id, a.estado).subscribe({
      next: () => { this.cambiando = false; this.toast.ok(`Estado: ${etiquetaEstadoPartido(a.estado)}.`); this.cargar(); },
      error: () => (this.cambiando = false),
    });
  }

  reprogramar() { this.abrirPostergar(true); }

  private abrirPostergar(reprogramar: boolean) {
    const ref = this.modal.open(PostergarModalComponent, { centered: true, backdrop: 'static' });
    ref.componentInstance.partido = this.partido;
    ref.componentInstance.reprogramar = reprogramar;
    ref.result.then(() => this.cargar(), () => undefined);
  }

  registrar() {
    if (!this.partido) { return; }
    const v = this.form.getRawValue();
    const t = v.tipo as TipoEvento;
    if (t === 'INCIDENCIA' && !v.descripcion?.trim()) { this.toast.aviso('Describa la incidencia.'); return; }
    if (t !== 'INCIDENCIA' && !v.jugador) { this.toast.aviso('Seleccione el jugador.'); return; }
    if (t === 'CAMBIO' && !v.jugador_relevo) { this.toast.aviso('Seleccione el jugador que entra.'); return; }
    this.guardando = true;
    this.eventosApi.crear({
      partido: this.partido.id,
      tipo: t,
      equipo: v.equipo!,
      jugador: t === 'INCIDENCIA' ? null : v.jugador,
      jugador_relevo: t === 'CAMBIO' ? v.jugador_relevo : null,
      minuto: v.minuto ?? 0,
      descripcion: v.descripcion ?? '',
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.toast.ok('Evento registrado.');
        this.form.patchValue({ jugador: null, jugador_relevo: null, descripcion: '' });
        this.cargar();
      },
      error: () => (this.guardando = false),
    });
  }

  async eliminar(e: Evento) {
    if (!(await this.dialogo.confirmar('¿Eliminar el evento?', 'Si era un gol, el marcador se recalculará.', 'Eliminar', true))) { return; }
    this.eventosApi.eliminar(e.id).subscribe(() => { this.toast.ok('Evento eliminado.'); this.cargar(); });
  }

  guardarPenales() {
    if (!this.partido) { return; }
    this.guardando = true;
    this.api.actualizar(this.partido.id, { penales_local: this.penLocal, penales_visitante: this.penVisita }).subscribe({
      next: () => { this.guardando = false; this.toast.ok('Penales guardados.'); this.cargar(); },
      error: () => (this.guardando = false),
    });
  }

  editar() {
    const ref = this.modal.open(PartidoEditarComponent, { centered: true, backdrop: 'static' });
    ref.componentInstance.partido = this.partido;
    ref.result.then(() => this.cargar(), () => undefined);
  }
}
