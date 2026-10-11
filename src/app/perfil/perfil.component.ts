import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { forkJoin, of, catchError } from 'rxjs';
import {
  Campeonato, Dispositivo, EquipoMini, ModoNotificacion, Perfil, Preferencias, TIPOS_NOTIFICACION, TipoNotificacion,
} from '../core/models';
import { mensajeError } from '../core/services/api-utils';
import { AuthService } from '../core/services/auth.service';
import { CampeonatoService } from '../core/services/campeonato.service';
import { CuentaService } from '../core/services/cuenta.service';
import { DialogService } from '../core/services/dialog.service';
import { EstadoPush, PushService } from '../core/services/push.service';
import { ToastService } from '../core/services/toast.service';

const iguales = (g: AbstractControl): ValidationErrors | null =>
  g.get('nueva')?.value === g.get('confirmar')?.value ? null : { distintas: true };

const textoError = (e: HttpErrorResponse) => {
  const d = e.error;
  if (d && typeof d === 'object' && !d.detail) {
    return Object.values(d as Record<string, unknown>).map(v => (Array.isArray(v) ? v.join(' ') : String(v))).join(' ');
  }
  return d?.detail ?? mensajeError(e);
};

/** Perfil del usuario con sesión: sus datos y sus notificaciones (navegador, dispositivos e intereses). */
@Component({
  selector: 'app-perfil',
  template: `
    <div class="pub-contenedor pub-cuerpo" style="max-width:980px">
      <h2 class="mb-1">Mi perfil</h2>
      <p class="text-muted">{{ auth.usuario?.email || auth.usuario?.username }}</p>

      <ul ngbNav #nav="ngbNav" class="nav-tabs nav-tabs-custom tabs-scroll" [(activeId)]="tab">
        <li ngbNavItem="datos"><a ngbNavLink><i class="ri-user-3-line me-1"></i>Mis datos</a>
          <ng-template ngbNavContent>
            <div class="row g-4 mt-1">
              <div class="col-lg-6">
                <div class="card"><div class="card-body">
                  <h5 class="card-title mb-3">Datos personales</h5>
                  <app-estado-lista [cargando]="!perfil"></app-estado-lista>
                  <form *ngIf="perfil" [formGroup]="formDatos" (ngSubmit)="guardarDatos()" novalidate>
                    <div class="mb-3"><label class="form-label" for="p-nombre">Nombre *</label>
                      <input id="p-nombre" class="form-control" formControlName="first_name" [class.is-invalid]="formDatos.controls.first_name.touched && formDatos.controls.first_name.invalid">
                      <div class="invalid-feedback">Obligatorio.</div></div>
                    <div class="mb-3"><label class="form-label" for="p-apellido">Apellido</label>
                      <input id="p-apellido" class="form-control" formControlName="last_name"></div>
                    <div class="mb-3"><label class="form-label" for="p-correo">Correo</label>
                      <input id="p-correo" class="form-control" [value]="perfil.email || perfil.username" disabled>
                      <div class="form-text">El correo es su usuario y no se puede cambiar.</div></div>
                    <button class="btn btn-primary" type="submit" [disabled]="guardandoDatos"><span *ngIf="guardandoDatos" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
                  </form>
                </div></div>
              </div>
              <div class="col-lg-6" *ngIf="perfil?.tiene_clave">
                <div class="card"><div class="card-body">
                  <h5 class="card-title mb-3">Cambiar contraseña</h5>
                  <div *ngIf="errorClave" class="alert alert-danger py-2">{{ errorClave }}</div>
                  <form [formGroup]="formClave" (ngSubmit)="cambiarClave()" novalidate>
                    <div class="mb-3"><label class="form-label" for="c-actual">Contraseña actual</label>
                      <input id="c-actual" type="password" class="form-control" formControlName="actual" autocomplete="current-password" [class.is-invalid]="formClave.controls.actual.touched && formClave.controls.actual.invalid">
                      <div class="invalid-feedback">Obligatoria.</div></div>
                    <div class="mb-3"><label class="form-label" for="c-nueva">Nueva contraseña</label>
                      <input id="c-nueva" type="password" class="form-control" formControlName="nueva" autocomplete="new-password" [class.is-invalid]="formClave.controls.nueva.touched && formClave.controls.nueva.invalid">
                      <div class="invalid-feedback">Mínimo 8 caracteres.</div></div>
                    <div class="mb-3"><label class="form-label" for="c-confirmar">Repetir nueva contraseña</label>
                      <input id="c-confirmar" type="password" class="form-control" formControlName="confirmar" autocomplete="new-password" [class.is-invalid]="formClave.touched && formClave.hasError('distintas')">
                      <div class="invalid-feedback">Las contraseñas no coinciden.</div></div>
                    <button class="btn btn-primary" type="submit" [disabled]="guardandoClave"><span *ngIf="guardandoClave" class="spinner-border spinner-border-sm me-1"></span>Cambiar contraseña</button>
                  </form>
                </div></div>
              </div>
              <div class="col-lg-6" *ngIf="perfil && !perfil.tiene_clave">
                <div class="card"><div class="card-body"><h5 class="card-title">Contraseña</h5>
                  <p class="text-muted mb-0"><i class="ri-google-fill me-1"></i>Su cuenta usa Google para ingresar y no tiene contraseña propia.</p></div></div>
              </div>
            </div>
          </ng-template></li>

        <li ngbNavItem="notificaciones"><a ngbNavLink><i class="ri-notification-3-line me-1"></i>Notificaciones</a>
          <ng-template ngbNavContent>
            <!-- Navegador -->
            <div class="card mt-3"><div class="card-body">
              <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
                <div>
                  <h5 class="card-title mb-1">Este navegador</h5>
                  <span class="badge" [ngClass]="claseEstado">{{ textoEstado }}</span>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <button *ngIf="estadoPush === 'inactivo'" class="btn btn-primary" (click)="activar()" [disabled]="trabajando"><span *ngIf="trabajando" class="spinner-border spinner-border-sm me-1"></span><i class="ri-notification-badge-line me-1"></i>Activar notificaciones</button>
                  <button *ngIf="estadoPush === 'activado'" class="btn btn-soft-secondary" (click)="probar()" [disabled]="trabajando"><i class="ri-send-plane-line me-1"></i>Enviar prueba</button>
                  <button *ngIf="estadoPush === 'activado'" class="btn btn-soft-danger" (click)="desactivar()" [disabled]="trabajando"><i class="ri-notification-off-line me-1"></i>Desactivar</button>
                </div>
              </div>
              <div class="alert alert-warning py-2 mt-3 mb-0 small" *ngIf="estadoPush === 'bloqueado'">
                Las notificaciones están bloqueadas para este sitio en su navegador. Permítalas desde el candado de la barra de direcciones (Notificaciones → Permitir) y vuelva a cargar la página.
              </div>
              <div class="alert alert-info py-2 mt-3 mb-0 small" *ngIf="estadoPush === 'no_soportado'">
                <ng-container *ngIf="!seguro; else sinSoporte">Las notificaciones del navegador requieren una conexión segura (HTTPS). Este sitio se abrió sin ella.</ng-container>
                <ng-template #sinSoporte>Este navegador no admite notificaciones web.</ng-template>
              </div>

              <h6 class="mt-4 mb-2">Mis dispositivos</h6>
              <app-estado-lista [vacio]="!dispositivos.length" mensaje="Aún no tiene dispositivos registrados."></app-estado-lista>
              <ul class="list-group list-group-flush" *ngIf="dispositivos.length">
                <li class="list-group-item d-flex align-items-center gap-3 px-0" *ngFor="let d of dispositivos">
                  <i class="fs-4 text-muted" [ngClass]="d.tipo === 'WEB' ? 'ri-computer-line' : 'ri-smartphone-line'"></i>
                  <div class="flex-grow-1">
                    <div class="fw-medium">{{ d.nombre || (d.tipo === 'WEB' ? 'Navegador' : 'App móvil') }}
                      <span class="badge badge-soft-success ms-1" *ngIf="esEste(d)">este navegador</span></div>
                    <div class="small text-muted">Registrado el {{ d.creado | date:'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                  <button class="btn btn-sm btn-soft-danger" (click)="quitar(d)" title="Quitar dispositivo"><i class="ri-delete-bin-line"></i></button>
                </li>
              </ul>
            </div></div>

            <!-- Intereses -->
            <div class="card"><div class="card-body">
              <h5 class="card-title mb-3">¿Qué quiere recibir?</h5>
              <app-estado-lista [cargando]="!prefs"></app-estado-lista>
              <ng-container *ngIf="prefs">
                <div class="d-flex flex-column gap-2 mb-3">
                  <label class="opcion-radio" *ngFor="let o of modos" [class.activa]="prefs.modo === o.valor">
                    <input type="radio" class="form-check-input" name="modo" [value]="o.valor" [(ngModel)]="prefs.modo">
                    <span><span class="fw-medium d-block">{{ o.titulo }}</span><span class="small text-muted">{{ o.detalle }}</span></span>
                  </label>
                </div>

                <ng-container *ngIf="prefs.modo !== 'NADA'">
                  <h6 class="mt-4">Tipos de aviso</h6>
                  <div class="d-flex flex-wrap gap-3 mb-3">
                    <div class="form-check" *ngFor="let t of tiposNotif">
                      <input class="form-check-input" type="checkbox" [id]="'tipo-' + t.valor" [checked]="prefs.tipos.includes(t.valor)" (change)="alternarTipo(t.valor)">
                      <label class="form-check-label" [for]="'tipo-' + t.valor">{{ t.etiqueta }}</label>
                    </div>
                  </div>
                </ng-container>

                <ng-container *ngIf="prefs.modo === 'SELECCION'">
                  <h6 class="mt-4">Campeonatos</h6>
                  <p class="small text-muted">Recibirá los partidos de los campeonatos que marque o de los equipos que siga.</p>
                  <div class="row g-2 mb-4">
                    <div class="col-sm-6 col-lg-4" *ngFor="let c of campeonatos">
                      <label class="seleccion-tarjeta" [class.activa]="prefs.campeonatos.includes(c.id)">
                        <input class="form-check-input" type="checkbox" [checked]="prefs.campeonatos.includes(c.id)" (change)="alternarCampeonato(c.id)">
                        <img *ngIf="c.logo" [src]="c.logo" alt="" width="28" height="28" class="rounded">
                        <span class="text-truncate">{{ c.nombre }}</span>
                      </label>
                    </div>
                    <div class="col-12 text-muted small" *ngIf="!campeonatos.length">No hay campeonatos publicados.</div>
                  </div>

                  <h6>Equipos</h6>
                  <div class="d-flex flex-wrap gap-2 mb-2" *ngIf="equiposSeleccionados.length">
                    <span class="chip-equipo" *ngFor="let e of equiposSeleccionados">
                      <app-escudo [equipo]="e" [tam]="20"></app-escudo>{{ e.nombre }}
                      <button type="button" class="btn-close btn-sm" (click)="alternarEquipo(e.id)" [attr.aria-label]="'Quitar ' + e.nombre"></button>
                    </span>
                  </div>
                  <input type="search" class="form-control mb-2" placeholder="Buscar equipo…" [(ngModel)]="busquedaEquipo" [ngModelOptions]="{standalone: true}">
                  <div class="lista-equipos">
                    <label class="seleccion-fila" *ngFor="let e of equiposFiltrados" [class.activa]="prefs.equipos.includes(e.id)">
                      <input class="form-check-input" type="checkbox" [checked]="prefs.equipos.includes(e.id)" (change)="alternarEquipo(e.id)">
                      <app-escudo [equipo]="e" [tam]="24"></app-escudo><span>{{ e.nombre }}</span>
                    </label>
                    <div class="text-muted small p-2" *ngIf="!equiposFiltrados.length">No se encontraron equipos.</div>
                  </div>
                </ng-container>

                <div class="alert alert-warning py-2 small mt-4" *ngIf="prefs.modo !== 'NADA' && !hayDispositivo">
                  <i class="ri-alert-line me-1"></i>Eligió recibir notificaciones, pero aún no tiene ningún dispositivo activo. Active las notificaciones de este navegador (arriba) para recibirlas.
                </div>
                <button class="btn btn-primary mt-2" (click)="guardarPreferencias()" [disabled]="guardandoPrefs"><span *ngIf="guardandoPrefs" class="spinner-border spinner-border-sm me-1"></span>Guardar preferencias</button>
              </ng-container>
            </div></div>
          </ng-template></li>
      </ul>
      <div [ngbNavOutlet]="nav" class="mt-3"></div>
    </div>`,
})
export class PerfilComponent implements OnInit {
  tab = 'datos';
  perfil: Perfil | null = null;
  formDatos = this.fb.nonNullable.group({ first_name: ['', Validators.required], last_name: [''] });
  formClave = this.fb.nonNullable.group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, Validators.minLength(8)]],
    confirmar: ['', Validators.required],
  }, { validators: iguales });
  guardandoDatos = false;
  guardandoClave = false;
  errorClave = '';

  // notificaciones
  estadoPush: EstadoPush = 'inactivo';
  seguro = true;
  trabajando = false;
  endpointActual: string | null = null;
  dispositivos: Dispositivo[] = [];
  prefs: Preferencias | null = null;
  campeonatos: Campeonato[] = [];
  equipos: EquipoMini[] = [];
  busquedaEquipo = '';
  guardandoPrefs = false;
  tiposNotif = TIPOS_NOTIFICACION;
  modos: { valor: ModoNotificacion; titulo: string; detalle: string }[] = [
    { valor: 'NADA', titulo: 'No quiero notificaciones', detalle: 'No recibirá ningún aviso.' },
    { valor: 'TODO', titulo: 'Todos los partidos', detalle: 'Avisos de todos los campeonatos publicados.' },
    { valor: 'SELECCION', titulo: 'Solo lo que yo seleccione', detalle: 'Elija campeonatos y equipos concretos.' },
  ];

  constructor(private fb: FormBuilder, public auth: AuthService, private cuenta: CuentaService, private push: PushService,
              private camps: CampeonatoService, private toast: ToastService, private dialogo: DialogService) {}

  get hayDispositivo() { return this.dispositivos.some(d => d.activo !== false); }
  get equiposSeleccionados() { return this.equipos.filter(e => this.prefs?.equipos.includes(e.id)); }
  get equiposFiltrados() {
    const q = this.busquedaEquipo.trim().toLowerCase();
    return this.equipos.filter(e => !q || e.nombre.toLowerCase().includes(q));
  }
  get textoEstado() {
    return ({ activado: 'Activadas en este navegador', inactivo: 'No activadas', bloqueado: 'Bloqueadas por el navegador', no_soportado: 'No disponibles' } as Record<string, string>)[this.estadoPush];
  }
  get claseEstado() {
    return ({ activado: 'badge-soft-success', inactivo: 'badge-soft-secondary', bloqueado: 'badge-soft-danger', no_soportado: 'badge-soft-warning' } as Record<string, string>)[this.estadoPush];
  }

  ngOnInit() {
    this.seguro = this.push.contextoSeguro();
    this.cuenta.perfil().subscribe(p => { this.perfil = p; this.formDatos.patchValue(p); });
    this.refrescarPush();
    this.cuenta.preferencias().subscribe(p => (this.prefs = p));
    this.cargarDispositivos();
    this.cargarCatalogo();
  }

  /** Campeonatos publicados y los equipos inscritos en ellos (son los únicos que el servidor acepta como interés). */
  private cargarCatalogo() {
    this.camps.todos({ publicado: true }).subscribe(cs => {
      this.campeonatos = cs.filter(c => c.publicado);
      if (!this.campeonatos.length) { return; }
      forkJoin(this.campeonatos.map(c => this.camps.equipos(c.id).pipe(catchError(() => of([]))))).subscribe(listas => {
        const mapa = new Map<number, EquipoMini>();
        listas.flat().forEach(i => mapa.set(i.equipo, i.equipo_detalle));
        this.equipos = [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
    });
  }

  private async refrescarPush() {
    this.estadoPush = await this.push.estado();
    this.endpointActual = await this.push.endpointActual();
  }

  private cargarDispositivos() { this.cuenta.dispositivos().subscribe(d => (this.dispositivos = d)); }

  esEste(d: Dispositivo) { return !!this.endpointActual && (d.token === this.endpointActual || d.suscripcion?.endpoint === this.endpointActual); }

  // ---- Datos
  guardarDatos() {
    this.formDatos.markAllAsTouched();
    if (this.formDatos.invalid) { return; }
    this.guardandoDatos = true;
    this.cuenta.actualizarPerfil(this.formDatos.getRawValue()).subscribe({
      next: p => { this.guardandoDatos = false; this.perfil = p; this.toast.ok('Datos guardados.'); },
      error: (e: HttpErrorResponse) => { this.guardandoDatos = false; this.toast.error(textoError(e)); },
    });
  }

  cambiarClave() {
    this.formClave.markAllAsTouched();
    this.errorClave = '';
    if (this.formClave.invalid) { return; }
    this.guardandoClave = true;
    const { actual, nueva } = this.formClave.getRawValue();
    this.cuenta.cambiarClave(actual, nueva).subscribe({
      next: () => { this.guardandoClave = false; this.formClave.reset(); this.toast.ok('Contraseña actualizada.'); },
      error: (e: HttpErrorResponse) => { this.guardandoClave = false; this.errorClave = textoError(e); },
    });
  }

  // ---- Navegador
  async activar() {
    this.trabajando = true;
    try {
      await this.push.activar();
      this.toast.ok('Notificaciones activadas en este navegador.');
    } catch (e) {
      this.toast.error(e instanceof HttpErrorResponse ? textoError(e) : (e as Error).message || 'No se pudieron activar las notificaciones.');
    }
    this.trabajando = false;
    await this.refrescarPush();
    this.cargarDispositivos();
  }

  async desactivar() {
    if (!(await this.dialogo.confirmar('¿Desactivar las notificaciones en este navegador?', 'Dejará de recibir avisos aquí.', 'Desactivar', true))) { return; }
    this.trabajando = true;
    try { await this.push.desactivar(); this.toast.ok('Notificaciones desactivadas.'); }
    catch (e) { this.toast.error((e as Error).message || 'No se pudo desactivar.'); }
    this.trabajando = false;
    await this.refrescarPush();
    this.cargarDispositivos();
  }

  probar() {
    this.trabajando = true;
    this.push.probar().subscribe({
      next: r => { this.trabajando = false; this.toast.ok(r.detail); },
      error: () => (this.trabajando = false),
    });
  }

  async quitar(d: Dispositivo) {
    if (!(await this.dialogo.confirmar('¿Quitar este dispositivo?', 'Dejará de recibir avisos en él.', 'Quitar', true))) { return; }
    if (this.esEste(d)) {
      try { await this.push.desactivar(); } catch { /* se continúa: igual se quita del servidor */ }
      this.dispositivos = this.dispositivos.filter(x => x.id !== d.id);
      this.toast.ok('Dispositivo quitado.');
      await this.refrescarPush();
      this.cargarDispositivos();
      return;
    }
    this.cuenta.quitarDispositivo(d.id).subscribe(() => { this.toast.ok('Dispositivo quitado.'); this.cargarDispositivos(); });
  }

  // ---- Intereses
  alternarTipo(t: TipoNotificacion) { this.prefs!.tipos = this.alternar(this.prefs!.tipos, t); }
  alternarCampeonato(id: number) { this.prefs!.campeonatos = this.alternar(this.prefs!.campeonatos, id); }
  alternarEquipo(id: number) { this.prefs!.equipos = this.alternar(this.prefs!.equipos, id); }

  private alternar<T>(lista: T[], v: T): T[] { return lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v]; }

  guardarPreferencias() {
    if (!this.prefs) { return; }
    const { modo, tipos, campeonatos, equipos } = this.prefs;
    if (modo === 'SELECCION' && !campeonatos.length && !equipos.length) {
      this.toast.aviso('Elija al menos un campeonato o un equipo, o cambie la opción.');
      return;
    }
    if (modo !== 'NADA' && !tipos.length) { this.toast.aviso('Marque al menos un tipo de aviso.'); return; }
    this.guardandoPrefs = true;
    this.cuenta.guardarPreferencias({ modo, tipos, campeonatos, equipos }).subscribe({
      next: p => {
        this.guardandoPrefs = false;
        this.prefs = p;
        this.toast.ok('Preferencias guardadas.');
        if (p.modo !== 'NADA' && !this.hayDispositivo) { this.toast.aviso('Active las notificaciones de este navegador para recibir los avisos.'); }
      },
      error: () => (this.guardandoPrefs = false),
    });
  }
}
