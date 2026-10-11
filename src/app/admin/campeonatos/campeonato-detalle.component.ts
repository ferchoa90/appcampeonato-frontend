import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HorariosFijosModalComponent } from './horarios-fijos-modal.component';
import { ProgramarRondaModalComponent } from './programar-ronda-modal.component';
import {
  Campeonato, ESTADOS_CAMPEONATO, Equipo, FASES_ELIMINATORIA, Fecha, FeriadoConflicto, FixtureInfo, Inscripcion, MODALIDADES,
  ModalidadCampeonato, etiquetaModalidad,
} from '../../core/models';
import { mensajeError } from '../../core/services/api-utils';
import { CampeonatoService, OpcionesFixture } from '../../core/services/campeonato.service';
import { DialogService } from '../../core/services/dialog.service';
import { EquipoService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-campeonato-detalle',
  template: `
    <app-page-title titulo="Campeonato">
      <a routerLink="/admin/campeonatos" class="btn btn-light me-1"><i class="ri-arrow-left-line align-middle"></i> Campeonatos</a>
      <a *ngIf="camp" [routerLink]="['editar']" class="btn btn-soft-primary"><i class="ri-pencil-line align-middle"></i> Editar</a>
    </app-page-title>
    <app-estado-lista [cargando]="!camp"></app-estado-lista>

    <ng-container *ngIf="camp">
      <div class="card">
        <div class="card-body d-flex flex-wrap align-items-center gap-3">
          <div class="avatar-md"><img *ngIf="camp.logo; else sinLogo" [src]="camp.logo" class="img-fluid rounded" alt="">
            <ng-template #sinLogo><span class="avatar-title rounded badge-soft-primary fs-2"><i class="ri-trophy-line"></i></span></ng-template></div>
          <div class="flex-grow-1">
            <h4 class="mb-1">{{ camp.nombre }} <small class="text-muted">{{ camp.temporada }}</small></h4>
            <div class="text-muted">{{ camp.formato_nombre }}{{ camp.num_partidos ? ' · ' + etiquetaModalidad(camp.modalidad) : '' }}
              <ng-container *ngIf="camp.formato === 'GRUPOS'"> · {{ camp.num_grupos }} grupos, clasifican {{ camp.clasificados_por_grupo }}</ng-container></div>
          </div>
          <span class="badge fs-12" [ngClass]="'badge-soft-' + estado.clase">{{ estado.etiqueta }}</span>
          <span class="badge fs-12" [ngClass]="camp.publicado ? 'badge-soft-success' : 'badge-soft-secondary'">{{ camp.publicado ? 'Publicado' : 'Oculto' }}</span>
          <a *ngIf="camp.publicado" [routerLink]="['/campeonato', camp.id]" target="_blank" class="btn btn-sm btn-soft-info"><i class="ri-external-link-line"></i> Ver en el portal</a>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <ul ngbNav #nav="ngbNav" class="nav-tabs nav-tabs-custom tabs-scroll" [(activeId)]="tab">
            <li ngbNavItem="equipos"><a ngbNavLink>Equipos inscritos</a>
              <ng-template ngbNavContent>
                <p class="text-muted" *ngIf="camp.num_partidos">El fixture ya fue generado: la inscripción no se puede modificar.</p>
                <div class="row g-2 mb-3">
                  <div class="col-md-5"><input type="search" class="form-control" placeholder="Filtrar equipos" [(ngModel)]="filtroEquipos"></div>
                  <div class="col-auto d-flex align-items-center text-muted">{{ seleccion.size }} seleccionados</div>
                  <div class="col-auto ms-auto"><button class="btn btn-primary" (click)="guardarInscripcion()" [disabled]="!!camp.num_partidos || guardando"><i class="ri-save-line align-middle me-1"></i> Guardar inscripción</button></div>
                </div>
                <div class="row g-2">
                  <div class="col-sm-6 col-lg-4" *ngFor="let e of equiposFiltrados">
                    <label class="form-check border rounded p-2 ps-5 d-flex align-items-center gap-2 cursor-pointer mb-0" [class.border-primary]="seleccion.has(e.id)">
                      <input class="form-check-input" type="checkbox" [checked]="seleccion.has(e.id)" [disabled]="!!camp.num_partidos" (change)="alternar(e.id)">
                      <app-escudo [equipo]="e" [tam]="28"></app-escudo><span>{{ e.nombre }}</span>
                    </label>
                  </div>
                </div>
                <app-estado-lista [vacio]="!equipos.length" mensaje="No hay equipos registrados. Cree equipos primero."></app-estado-lista>
              </ng-template></li>

            <li ngbNavItem="grupos" *ngIf="camp.formato === 'GRUPOS'"><a ngbNavLink>Grupos</a>
              <ng-template ngbNavContent>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <p class="text-muted mb-0">Reparte al azar los equipos inscritos en {{ camp.num_grupos }} grupos.</p>
                  <button class="btn btn-primary" (click)="sortearGrupos()" [disabled]="sorteoBloqueado || !inscritos.length"><i class="ri-shuffle-line align-middle me-1"></i> Sortear grupos</button>
                </div>
                <app-estado-lista [vacio]="!inscritos.length" mensaje="Inscriba equipos antes de sortear los grupos."></app-estado-lista>
                <div class="row g-3">
                  <div class="col-md-6 col-xl-4" *ngFor="let g of grupos">
                    <div class="card border mb-0"><div class="card-header"><h6 class="mb-0">{{ g.nombre || 'Sin grupo' }}</h6></div>
                      <ul class="list-group list-group-flush"><li class="list-group-item d-flex align-items-center gap-2" *ngFor="let i of g.items"><app-escudo [equipo]="i.equipo_detalle" [tam]="24"></app-escudo>{{ i.equipo_detalle.nombre }}</li></ul></div>
                  </div>
                </div>
              </ng-template></li>

            <li ngbNavItem="fixture"><a ngbNavLink>Fixture</a>
              <ng-template ngbNavContent>
                <div class="card border bg-light-subtle">
                  <div class="card-body">
                    <h6 class="mb-3"><i class="ri-magic-line me-1"></i> Asistente de sorteo</h6>
                    <div class="row g-3">
                      <div class="col-md-4"><label class="form-label">Fecha del primer partido (opcional)</label>
                        <input type="date" class="form-control" [(ngModel)]="fechaInicio"></div>
                      <div class="col-md-8"><label class="form-label">Días de la semana en que se juega</label>
                        <div class="d-flex flex-wrap gap-2">
                          <ng-container *ngFor="let d of diasSemana">
                            <input type="checkbox" class="btn-check" [id]="'dia-' + d.n" [checked]="dias.has(d.n)" (change)="alternarDia(d.n)">
                            <label class="btn btn-outline-primary btn-sm px-3" [for]="'dia-' + d.n">{{ d.corto }}</label>
                          </ng-container>
                        </div>
                        <div class="form-text">Cada fecha se asigna al siguiente día elegido, en orden (ej. martes y jueves: fecha 1 martes, fecha 2 jueves, fecha 3 martes...).</div></div>
                      <div class="col-sm-4 col-md-3"><label class="form-label">Partidos por día</label>
                        <input type="number" min="1" class="form-control" placeholder="Todos los de la fecha" [(ngModel)]="partidosPorDia">
                        <div class="form-text">Vacío: todos los partidos de la fecha el mismo día.</div></div>
                      <div class="col-sm-4 col-md-3"><label class="form-label">Hora del primer partido</label>
                        <input type="time" class="form-control" [(ngModel)]="horaInicio"></div>
                      <div class="col-sm-4 col-md-3"><label class="form-label">Minutos entre partidos</label>
                        <input type="number" min="1" class="form-control" [(ngModel)]="minEntre"></div>
                      <div class="col-sm-4 col-md-3" *ngIf="!dias.size"><label class="form-label">Días entre fechas</label>
                        <input type="number" min="1" class="form-control" [(ngModel)]="diasEntre">
                        <div class="form-text">Se usa si no elige días de la semana.</div></div>
                      <div class="col-12"><button class="btn btn-primary" (click)="asistenteSorteo()" [disabled]="guardando || !inscritos.length || sorteoBloqueado">
                        <i class="ri-shuffle-line align-middle me-1"></i> {{ camp.num_partidos ? 'Regenerar fixture' : 'Sortear fixture' }}</button>
                        <button type="button" class="btn btn-soft-danger ms-2" *ngIf="puedeLimpiar" (click)="limpiarSorteo()" [disabled]="guardando">
                          <i class="ri-delete-bin-line align-middle me-1"></i> Limpiar sorteo</button>
                        <button type="button" class="btn btn-soft-info ms-2" *ngIf="camp.num_partidos" (click)="aplicarFeriados()" [disabled]="guardando"
                                title="Mueve al siguiente día disponible los partidos pendientes que caen en feriado">
                          <i class="ri-calendar-close-line align-middle me-1"></i> Aplicar feriados</button>
                        <button type="button" class="btn btn-soft-secondary ms-2" *ngIf="camp.num_partidos" (click)="abrirHorariosFijos()" [disabled]="guardando"
                                title="Un equipo siempre en el mismo horario del día (solo reordena las horas)">
                          <i class="ri-time-line align-middle me-1"></i> Horarios fijos<span class="badge bg-secondary-subtle text-body ms-1" *ngIf="camp.horarios_fijos?.length">{{ camp.horarios_fijos.length }}</span></button></div>
                      <div class="col-12 pt-0" *ngIf="camp.formato === 'LIGA' && inscritos.length > 1 && !sorteoBloqueado">
                        <a class="small text-muted opacity-50 cursor-pointer text-decoration-none" role="button" aria-label="Primera fecha manual" (click)="alternarManual()">
                          <i class="ri-edit-2-line"></i></a>
                        <span class="badge bg-light text-body fw-normal ms-2" *ngIf="manualValidos.length && !manualAbierto">
                          {{ manualValidos.length }} partidos · <a class="cursor-pointer text-danger" (click)="limpiarManual()">quitar</a></span>
                        <div class="border rounded p-3 mt-2" *ngIf="manualAbierto">
                          <div class="small text-muted mb-2">Elija los {{ partidosEsperados }} partidos de la fecha 1 (local vs visitante). El resto de las fechas se sortea sin repetir cruces.</div>
                          <div class="row g-2 align-items-center mb-2" *ngFor="let f of manual; let i = index">
                            <div class="col"><select class="form-select form-select-sm" [(ngModel)]="f.local">
                              <option [ngValue]="null">Local…</option><option *ngFor="let e of opcionesEquipo(f, 'local')" [ngValue]="e.id">{{ e.nombre }}</option></select></div>
                            <div class="col-auto text-muted small">vs</div>
                            <div class="col"><select class="form-select form-select-sm" [(ngModel)]="f.visitante">
                              <option [ngValue]="null">Visitante…</option><option *ngFor="let e of opcionesEquipo(f, 'visitante')" [ngValue]="e.id">{{ e.nombre }}</option></select></div>
                            <div class="col-auto"><button type="button" class="btn btn-sm btn-light" title="Quitar" (click)="quitarFila(i)"><i class="ri-close-line"></i></button></div>
                          </div>
                          <div class="d-flex flex-wrap align-items-center gap-2">
                            <button type="button" class="btn btn-sm btn-soft-secondary" (click)="agregarFila()" [disabled]="manual.length >= partidosEsperados">Agregar partido</button>
                            <span class="small" [ngClass]="manualCompleto ? 'text-success' : 'text-muted'">{{ resumenManual }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="text-muted small mt-2" *ngIf="!inscritos.length">Inscriba equipos para poder sortear.</div>
                    <div class="text-muted small mt-2" *ngIf="camp.num_partidos && !sorteoBloqueado">Ya existe un fixture con {{ camp.num_partidos }} partidos. Mientras no comience ningún partido puede volver a sortear: se reemplazarán los partidos actuales.</div>
                    <div class="alert alert-warning py-2 small mt-2 mb-0" *ngIf="sorteoBloqueado"><i class="ri-lock-line me-1"></i>Ya hay partidos iniciados o jugados: el sorteo no se puede repetir.</div>
                    <div class="text-muted small mt-2">Al sortear se pregunta la modalidad: <b>solo ida</b>, <b>ida y vuelta</b> o <b>relámpago</b> (eliminación directa), y si hay equipos impares, si uno descansa.</div>
                  </div>
                </div>
                <div class="alert alert-info" *ngIf="camp.modalidad === 'RELAMPAGO' && camp.num_partidos">Modalidad relámpago: las rondas se muestran en la pestaña <b>Eliminatoria</b>.</div>
                <div class="text-end mb-3" *ngIf="camp.num_partidos"><app-descargar-calendario [campeonatoId]="camp.id" [nombre]="camp.nombre"></app-descargar-calendario></div>
                <app-calendario [fechas]="fechasFixture"></app-calendario>
              </ng-template></li>

            <li ngbNavItem="tabla" *ngIf="!(camp.modalidad === 'RELAMPAGO' && camp.num_partidos)"><a ngbNavLink>Tabla</a>
              <ng-template ngbNavContent><app-tabla-posiciones [campeonatoId]="camp.id" [clasificados]="camp.formato === 'GRUPOS' ? camp.clasificados_por_grupo : 0"></app-tabla-posiciones></ng-template></li>

            <li ngbNavItem="goleadores"><a ngbNavLink>Goleadores</a>
              <ng-template ngbNavContent><app-goleadores [campeonatoId]="camp.id"></app-goleadores></ng-template></li>

            <li ngbNavItem="tarjetas"><a ngbNavLink>Tarjetas</a>
              <ng-template ngbNavContent><app-tarjetas-ranking [campeonatoId]="camp.id"></app-tarjetas-ranking></ng-template></li>

            <li ngbNavItem="eliminatoria"*ngIf="camp.formato === 'GRUPOS' || camp.modalidad === 'RELAMPAGO'"><a ngbNavLink>Eliminatoria</a>
              <ng-template ngbNavContent>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <button *ngIf="camp.formato === 'GRUPOS'" class="btn btn-primary" (click)="generarEliminatoria()" [disabled]="guardando || !camp.num_partidos || !!fechasLlaves.length"><i class="ri-git-merge-line align-middle me-1"></i> Generar llaves</button>
                  <button class="btn btn-soft-primary" (click)="avanzarEliminatoria()" [disabled]="guardando || !fechasLlaves.length || camp.estado === 'FINALIZADO'"><i class="ri-arrow-right-double-line align-middle me-1"></i> Avanzar de ronda</button>
                </div>
                <p class="text-muted small" *ngIf="camp.formato === 'GRUPOS'">Genere las llaves cuando termine la fase de grupos. Al finalizar todos los partidos de una ronda, avance a la siguiente; tras la final el campeonato se cierra.</p>
                <p class="text-muted small" *ngIf="camp.modalidad === 'RELAMPAGO'">Relámpago: el que pierde queda eliminado. Si un partido termina empatado, registre los penales. Al finalizar todos los partidos de la ronda, avance a la siguiente; si quedan equipos impares, uno descansa y pasa directo.</p>
                <app-estado-lista [vacio]="!fechasLlaves.length" mensaje="Aún no se generó la fase eliminatoria."></app-estado-lista>
                <div class="d-flex flex-wrap align-items-center gap-2 mb-3" *ngIf="fechasLlaves.length">
                  <span class="text-muted small me-1">Día y hora de cada ronda:</span>
                  <button type="button" *ngFor="let f of fechasLlaves" class="btn btn-sm" [ngClass]="sinHorario(f) ? 'btn-soft-warning' : 'btn-soft-secondary'"
                          [disabled]="!pendientes(f)" (click)="programarRonda(f)">
                    <i class="ri-calendar-event-line align-middle me-1"></i>{{ f.nombre }}<span class="ms-1" *ngIf="sinHorario(f)">· sin fecha</span>
                  </button>
                </div>
                <app-llaves [fechas]="fechasLlaves"></app-llaves>
              </ng-template></li>
          </ul>
          <div [ngbNavOutlet]="nav" class="mt-4"></div>
        </div>
      </div>
    </ng-container>`,
})
export class CampeonatoDetalleComponent implements OnInit {
  camp: Campeonato | null = null;
  tab = 'equipos';
  equipos: Equipo[] = [];
  inscritos: Inscripcion[] = [];
  grupos: { nombre: string | null; items: Inscripcion[] }[] = [];
  seleccion = new Set<number>();
  filtroEquipos = '';
  fechasFixture: Fecha[] = [];
  fechasLlaves: Fecha[] = [];
  fechaInicio = '';
  diasEntre = 7;
  readonly diasSemana = [
    { n: 1, corto: 'Lun' }, { n: 2, corto: 'Mar' }, { n: 3, corto: 'Mié' }, { n: 4, corto: 'Jue' },
    { n: 5, corto: 'Vie' }, { n: 6, corto: 'Sáb' }, { n: 7, corto: 'Dom' },
  ];
  dias = new Set<number>();
  partidosPorDia: number | null = null;
  horaInicio = '19:00';
  minEntre = 90;
  guardando = false;
  readonly etiquetaModalidad = etiquetaModalidad;

  constructor(private route: ActivatedRoute, private router: Router, private api: CampeonatoService,
              private equiposApi: EquipoService, private dialogo: DialogService, private toast: ToastService,
              private modal: NgbModal) {}

  get id() { return Number(this.route.snapshot.paramMap.get('id')); }
  get estado() { return ESTADOS_CAMPEONATO.find(e => e.valor === this.camp?.estado) ?? ESTADOS_CAMPEONATO[0]; }
  get equiposFiltrados() {
    const q = this.filtroEquipos.trim().toLowerCase();
    return this.equipos.filter(e => !q || e.nombre.toLowerCase().includes(q));
  }

  ngOnInit() {
    this.recargar();
  }

  /** Recarga campeonato, inscripciones y calendario. */
  recargar() {
    this.api.obtener(this.id).subscribe({
      next: c => {
        // la primera vez se precarga la programación guardada en el campeonato
        if (!this.camp) {
          this.dias = new Set(c.dias_semana ?? []);
          this.partidosPorDia = c.partidos_por_dia;
          this.horaInicio = c.hora_inicio?.slice(0, 5) || '19:00';
          this.minEntre = c.minutos_entre_partidos || 90;
          this.diasEntre = c.dias_entre_fechas || 7;
        }
        const primera = !this.camp;
        this.camp = c;
        if (primera) {
          // sólo se pueden inscribir equipos del mismo propietario que el campeonato
          const dueno = c.propietario ? { propietario: c.propietario } : { propietario__isnull: true };
          this.equiposApi.todos({ activo: true, ...dueno }).subscribe(e => (this.equipos = e));
        }
      },
      error: () => this.router.navigate(['/admin/campeonatos']),
    });
    this.api.equipos(this.id).subscribe(i => {
      this.inscritos = i;
      this.seleccion = new Set(i.map(x => x.equipo));
      const mapa = new Map<string | null, Inscripcion[]>();
      i.forEach(x => mapa.set(x.grupo_nombre, [...(mapa.get(x.grupo_nombre) ?? []), x]));
      this.grupos = [...mapa.entries()].map(([nombre, items]) => ({ nombre, items }));
    });
    this.api.calendario(this.id).subscribe(f => {
      this.fechasFixture = f.filter(x => !FASES_ELIMINATORIA.includes(x.fase));
      this.fechasLlaves = f.filter(x => FASES_ELIMINATORIA.includes(x.fase));
      if (this.abrirProgramacion) {
        // la ronda recién creada no trae día ni hora: se piden de inmediato
        this.abrirProgramacion = false;
        const nueva = [...this.fechasLlaves].reverse().find(x => this.sinHorario(x));
        if (nueva) { this.programarRonda(nueva); }
      }
    });
  }

  // ---- Día y hora de las rondas de eliminatoria (semifinal, final...)
  private abrirProgramacion = false;

  /** Hay partidos que aún se pueden programar (pendientes). */
  pendientes(f: Fecha) { return (f.partidos ?? []).some(p => p.estado === 'PENDIENTE'); }
  sinHorario(f: Fecha) { return (f.partidos ?? []).some(p => p.estado === 'PENDIENTE' && !p.fecha_hora); }

  programarRonda(f: Fecha) {
    const ref = this.modal.open(ProgramarRondaModalComponent, { centered: true, backdrop: 'static', size: 'lg' });
    ref.componentInstance.fecha = f;
    ref.result.then(() => this.recargar(), () => { /* cancelado: se puede programar luego */ });
  }

  private esc(s: string) { return s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`); }

  /** 'AAAA-MM-DD' -> 'mar 3 nov 2026' (como fecha local, sin corrimiento por zona horaria). */
  private fechaCorta(iso: string) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Hay algo del sorteo que limpiar (fixture o grupos) y todavía no comenzó ningún partido. */
  get puedeLimpiar() {
    return !this.sorteoBloqueado && (!!this.camp?.num_partidos || this.inscritos.some(i => !!i.grupo));
  }

  abrirHorariosFijos() {
    if (!this.camp) { return; }
    const ref = this.modal.open(HorariosFijosModalComponent, { centered: true, backdrop: 'static', size: 'lg' });
    ref.componentInstance.campeonatoId = this.id;
    ref.componentInstance.equipos = this.inscritos.map(i => i.equipo_detalle);
    ref.componentInstance.reglasGuardadas = this.camp.horarios_fijos ?? [];
    ref.result.then(() => this.recargar(), () => undefined);
  }

  /** Muestra qué fechas se moverían por los feriados y, tras confirmar, las mueve. */
  aplicarFeriados() {
    this.guardando = true;
    this.api.aplicarFeriados(this.id, false).subscribe({
      next: async r => {
        this.guardando = false;
        const avisos = r.sin_mover.length
          ? `<div class="text-start small mt-3 text-muted"><b>No se mueven solos:</b><ul class="mb-0">${r.sin_mover.map(s =>
              `<li>${this.esc(s.partido)} — ${this.fechaCorta(s.dia)} (${this.esc(s.feriado)}). ${this.esc(s.motivo)}.</li>`).join('')}</ul></div>`
          : '';
        if (!r.cambios.length) {
          if (avisos) { await this.dialogo.avisoHtml('Sin cambios automáticos', `Ninguna fecha pendiente se puede mover sola.${avisos}`); }
          else { this.toast.info('Ningún partido pendiente cae en un feriado.'); }
          return;
        }
        const lista = r.cambios.map(c => `<li><b>${this.esc(c.nombre)}</b>: ${c.desde ? this.fechaCorta(c.desde) : '—'} → <b>${this.fechaCorta(c.hasta)}</b>` +
          `${c.feriado ? ` <span class="text-danger">(feriado: ${this.esc(c.feriado)})</span>` : ' <span class="text-muted">(se corre por el feriado anterior)</span>'}</li>`).join('');
        const ok = await this.dialogo.confirmarHtml('Mover fechas por feriados',
          `<div class="text-start"><p class="mb-2">Estas fechas pasan al siguiente día de juego disponible; cada partido conserva su hora:</p><ul>${lista}</ul></div>${avisos}`,
          'Mover fechas');
        if (!ok) { return; }
        this.guardando = true;
        this.api.aplicarFeriados(this.id, true).subscribe({
          next: res => {
            this.guardando = false;
            this.toast.ok(`Calendario actualizado: ${res.cambios.length} fechas movidas.`);
            this.recargar();
          },
          error: () => (this.guardando = false),
        });
      },
      error: () => (this.guardando = false),
    });
  }

  async limpiarSorteo() {
    const ok = await this.dialogo.confirmar(
      '¿Limpiar el sorteo?',
      'Se eliminarán todas las fechas, partidos, descansos y grupos del sorteo, y el campeonato volverá a Borrador. Los equipos inscritos se conservan.',
      'Sí, limpiar', true);
    if (!ok) { return; }
    this.guardando = true;
    this.api.limpiarSorteo(this.id).subscribe({
      next: r => {
        this.guardando = false;
        this.limpiarManual();
        this.toast.ok(`Sorteo limpiado: ${r.partidos} partidos y ${r.fechas} fechas eliminados.`);
        this.recargar();
      },
      error: () => { this.guardando = false; this.recargar(); },
    });
  }

  /** El sorteo se bloquea cuando algún partido ya comenzó o se jugó (el servidor también lo valida). */
  get sorteoBloqueado() {
    return [...this.fechasFixture, ...this.fechasLlaves].some(f =>
      (f.partidos ?? []).some(p => ['INICIADO', 'ENTRETIEMPO', 'FINALIZADO'].includes(p.estado)));
  }

  // ---- Primera fecha manual (opcional)
  manualAbierto = false;
  manual: { local: number | null; visitante: number | null }[] = [];

  get partidosEsperados() { return Math.floor(this.inscritos.length / 2); }
  get manualValidos() { return this.manual.filter(f => f.local != null && f.visitante != null); }
  get manualCompleto() { return this.manualValidos.length === this.partidosEsperados; }
  get resumenManual() {
    if (!this.manualCompleto) {
      return `Faltan ${this.partidosEsperados - this.manualValidos.length} partidos por definir.`;
    }
    if (this.inscritos.length % 2) {
      const usados = new Set(this.manualValidos.flatMap(f => [f.local, f.visitante]));
      const libre = this.inscritos.find(i => !usados.has(i.equipo));
      return `Completo · descansa ${libre?.equipo_detalle.nombre ?? ''} en la fecha 1.`;
    }
    return 'Completo.';
  }

  alternarManual() {
    this.manualAbierto = !this.manualAbierto;
    if (this.manualAbierto && !this.manual.length) {
      this.manual = Array.from({ length: this.partidosEsperados }, () => ({ local: null, visitante: null }));
    }
  }

  agregarFila() { this.manual = [...this.manual, { local: null, visitante: null }]; }
  quitarFila(i: number) { this.manual = this.manual.filter((_, k) => k !== i); }
  limpiarManual() { this.manual = []; this.manualAbierto = false; }

  /** Equipos aún libres para un selector (los ya elegidos en otras casillas no se repiten). */
  opcionesEquipo(fila: { local: number | null; visitante: number | null }, lado: 'local' | 'visitante') {
    const usados = new Set<number>();
    for (const f of this.manual) {
      if (f.local != null && !(f === fila && lado === 'local')) { usados.add(f.local); }
      if (f.visitante != null && !(f === fila && lado === 'visitante')) { usados.add(f.visitante); }
    }
    return this.inscritos.map(i => i.equipo_detalle).filter(e => !usados.has(e.id));
  }

  alternarDia(n: number) {
    this.dias.has(n) ? this.dias.delete(n) : this.dias.add(n);
    this.dias = new Set(this.dias);
  }

  alternar(id: number) {
    this.seleccion.has(id) ? this.seleccion.delete(id) : this.seleccion.add(id);
    this.seleccion = new Set(this.seleccion);
  }

  guardarInscripcion() {
    this.guardando = true;
    this.api.fijarEquipos(this.id, [...this.seleccion]).subscribe({
      next: () => { this.guardando = false; this.toast.ok('Inscripción guardada.'); this.recargar(); },
      error: () => (this.guardando = false),
    });
  }

  async sortearGrupos() {
    if (this.camp?.num_partidos) {
      if (!(await this.dialogo.confirmar('¿Volver a sortear los grupos?',
        'Se reemplazará la distribución actual y se eliminará el fixture generado (deberá sortearlo de nuevo).', 'Sí, sortear', true))) { return; }
    } else if (this.inscritos.some(i => i.grupo) &&
        !(await this.dialogo.confirmar('¿Volver a sortear los grupos?', 'Se reemplazará la distribución actual.'))) { return; }
    this.guardando = true;
    this.api.sortearGrupos(this.id).subscribe({
      next: () => { this.guardando = false; this.toast.ok('Grupos sorteados.'); this.recargar(); },
      error: () => (this.guardando = false),
    });
  }

  /** Asistente: pregunta ida/vuelta y, si hay número impar, si se acepta el descanso. */
  async asistenteSorteo() {
    if (!this.camp) { return; }
    let info: FixtureInfo;
    try {
      info = await new Promise<FixtureInfo>((ok, ko) => this.api.fixtureInfo(this.id).subscribe({ next: ok, error: ko }));
    } catch { return; }
    if (info.sorteo_bloqueado) {
      this.toast.error(info.sorteo_bloqueado);
      this.recargar();
      return;
    }

    const permitidas = MODALIDADES.filter(m => info.modalidades.some(x => x.valor === m.valor));
    const modalidad = await this.dialogo.elegirOpcion<ModalidadCampeonato>(
      'Modalidad de los partidos', '¿Cómo se jugará este campeonato?',
      permitidas.map(m => ({ valor: m.valor, texto: m.etiqueta, descripcion: m.descripcion, icono: m.icono })),
      info.fixture_generado ? info.modalidad_actual : 'IDA', 'Continuar',
    );
    if (!modalidad) { return; }

    const opciones: OpcionesFixture = { modalidad };
    if (this.dias.size && !this.fechaInicio) {
      this.toast.aviso('Indique la fecha del primer partido para asignar los días de juego.');
      return;
    }
    if (this.fechaInicio) { opciones.fecha_inicio = this.fechaInicio; }
    opciones.dias_semana = [...this.dias].sort((a, b) => a - b);
    opciones.partidos_por_dia = this.partidosPorDia && this.partidosPorDia > 0 ? this.partidosPorDia : 0;
    if (this.horaInicio) { opciones.hora_inicio = this.horaInicio; }
    if (this.minEntre > 0) { opciones.minutos_entre_partidos = this.minEntre; }
    if (this.diasEntre > 0) { opciones.dias_entre_fechas = this.diasEntre; }

    if (this.manual.length) {
      if (!this.manualCompleto) {
        this.toast.aviso(`La primera fecha manual debe tener ${this.partidosEsperados} partidos completos (o quite la opción).`);
        this.manualAbierto = true;
        return;
      }
      opciones.primera_fecha = this.manualValidos.map(f => ({ local: f.local as number, visitante: f.visitante as number }));
    }

    if (info.hay_descanso) {
      let texto: string;
      if (modalidad === 'RELAMPAGO') {
        texto = `Hay ${info.equipos} equipos (número impar): un equipo descansará esta fecha y pasará directo a la siguiente ronda.`;
      } else if (this.camp.formato === 'GRUPOS') {
        texto = `Hay grupos con número impar de equipos (${info.grupos_impares.map(g => `${g.grupo ?? 'Grupo'}: ${g.equipos}`).join(', ')}): un equipo de cada uno descansará cada fecha.`;
      } else {
        texto = `Hay ${info.equipos} equipos (número impar): un equipo descansará cada fecha.`;
      }
      if (!(await this.dialogo.confirmar('¿Un equipo descansa?', `${texto} ¿Continuar?`, 'Sí, que descanse'))) { return; }
      opciones.confirmar_descanso = true;
    }

    if (info.fixture_generado) {
      if (!(await this.dialogo.confirmar('Ya existe un fixture', 'Se eliminarán los partidos actuales y se generarán nuevos.', 'Regenerar', true))) { return; }
      opciones.regenerar = true;
    }
    this.enviarFixture(opciones);
  }

  private enviarFixture(opciones: OpcionesFixture) {
    this.guardando = true;
    this.api.generarFixture(this.id, opciones).subscribe({
      next: r => {
        this.guardando = false;
        this.toast.ok(opciones.modalidad === 'RELAMPAGO'
          ? `Sorteo realizado: ${r.partidos} partidos en la primera ronda.`
          : `Fixture generado: ${r.fechas} fechas, ${r.partidos} partidos.`);
        this.recargar();
      },
      error: async (e: HttpErrorResponse) => {
        this.guardando = false;
        if (e.status === 409 && e.error?.requiere_decision_feriados) {
          // algún partido caería en feriado: ¿se omiten esas fechas o se juega igual?
          const dias = (e.error.feriados as FeriadoConflicto[]).map(f =>
            `<b>${this.fechaCorta(f.fecha)}</b> (${this.esc(f.nombre)})`).join(', ');
          const decision = await this.dialogo.elegirOpcion<'omitir' | 'jugar'>(
            'Hay partidos en feriado', `Con los días elegidos, estas fechas son feriado: ${dias}. ¿Se juega en ellas?`,
            [
              { valor: 'omitir', texto: 'Omitir los feriados', descripcion: 'No se juega esos días: los partidos pasan al siguiente día de juego.', icono: 'ri-calendar-close-line' },
              { valor: 'jugar', texto: 'Jugar igual', descripcion: 'Los partidos se programan en esas fechas.', icono: 'ri-calendar-check-line' },
            ], 'omitir');
          if (decision) { this.enviarFixture({ ...opciones, feriados: decision }); }
          return;
        }
        if (e.status === 409 && e.error?.requiere_confirmacion) {
          // el servidor exige confirmar el descanso
          const ok = await this.dialogo.confirmar('Equipos impares', `${e.error.detail} ¿Continuar?`);
          if (ok) { this.enviarFixture({ ...opciones, confirmar_descanso: true }); }
          return;
        }
        this.toast.error(mensajeError(e));
      },
    });
  }

  async generarEliminatoria() {
    if (!(await this.dialogo.confirmar('¿Generar la fase eliminatoria?', 'Se crearán las llaves con los clasificados de cada grupo.'))) { return; }
    this.guardando = true;
    this.api.generarEliminatoria(this.id).subscribe({
      next: () => { this.guardando = false; this.toast.ok('Llaves generadas.'); this.abrirProgramacion = true; this.recargar(); },
      error: () => (this.guardando = false),
    });
  }

  async avanzarEliminatoria() {
    if (!(await this.dialogo.confirmar('¿Avanzar a la siguiente ronda?', 'Todos los partidos de la ronda actual deben estar finalizados.'))) { return; }
    this.enviarAvance(false);
  }

  private enviarAvance(confirmarDescanso: boolean) {
    this.guardando = true;
    this.api.avanzarEliminatoria(this.id, confirmarDescanso).subscribe({
      next: r => {
        this.guardando = false;
        this.toast.ok('detail' in r ? r.detail : 'Siguiente ronda generada. Elija el día y la hora de cada partido.');
        this.abrirProgramacion = !('detail' in r);
        this.recargar();
      },
      error: async (e: HttpErrorResponse) => {
        this.guardando = false;
        if (e.status === 409 && e.error?.requiere_confirmacion) {
          // número impar de equipos: preguntar si uno descansa
          if (await this.dialogo.confirmar('¿Un equipo descansa?', `${e.error.detail}`, 'Sí, que descanse')) {
            this.enviarAvance(true);
          }
          return;
        }
        this.toast.error(mensajeError(e));
      },
    });
  }
}
