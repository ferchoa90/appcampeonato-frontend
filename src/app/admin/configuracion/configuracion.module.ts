import { HttpErrorResponse } from '@angular/common/http';
import { Component, NgModule, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Configuracion } from '../../core/models';
import { mensajeError } from '../../core/services/api-utils';
import { AuthService } from '../../core/services/auth.service';
import { ConfiguracionService } from '../../core/services/cuenta.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { SharedModule } from '../../shared/shared.module';

/** Errores de validación del servidor (por campo) en una sola frase. */
function textoError(e: HttpErrorResponse): string {
  const d = e.error;
  if (d && typeof d === 'object' && !d.detail) {
    return Object.entries(d as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`).join(' | ');
  }
  return d?.detail ?? mensajeError(e);
}

/** Configuración del sistema (sólo Administrador): correo, cuentas y Google, límites de medios y notificaciones web. */
@Component({
  selector: 'app-configuracion',
  template: `
    <app-page-title titulo="Configuración"></app-page-title>
    <app-estado-lista [cargando]="!cfg"></app-estado-lista>

    <div class="card" *ngIf="cfg">
      <div class="card-body">
        <ul ngbNav #nav="ngbNav" class="nav-tabs nav-tabs-custom tabs-scroll" [(activeId)]="tab">

          <!-- Correo -->
          <li ngbNavItem="correo"><a ngbNavLink><i class="ri-mail-settings-line me-1"></i>Correo</a>
            <ng-template ngbNavContent>
              <p class="text-muted mt-3">Servidor SMTP que usa el sistema para enviar los correos de confirmación y de recuperación de contraseña.
                <span class="badge ms-1" [ngClass]="cfg.correo_configurado ? 'badge-soft-success' : 'badge-soft-warning'">{{ cfg.correo_configurado ? 'Configurado' : 'Sin configurar' }}</span></p>
              <form [formGroup]="fCorreo" (ngSubmit)="guardarCorreo()" novalidate>
                <div class="row g-3">
                  <div class="col-md-6"><label class="form-label" for="smtp-host">Servidor SMTP</label>
                    <input id="smtp-host" class="form-control" formControlName="smtp_host" placeholder="smtp.gmail.com" autocomplete="off"></div>
                  <div class="col-6 col-md-3"><label class="form-label" for="smtp-puerto">Puerto</label>
                    <input id="smtp-puerto" type="number" class="form-control" formControlName="smtp_puerto" [class.is-invalid]="fCorreo.controls.smtp_puerto.invalid">
                    <div class="invalid-feedback">Entre 1 y 65535.</div></div>
                  <div class="col-6 col-md-3"><label class="form-label" for="smtp-seg">Seguridad</label>
                    <select id="smtp-seg" class="form-select" formControlName="smtp_seguridad">
                      <option value="NINGUNA">Ninguna</option><option value="STARTTLS">STARTTLS</option><option value="SSL">SSL/TLS</option>
                    </select></div>
                  <div class="col-md-6"><label class="form-label" for="smtp-user">Usuario</label>
                    <input id="smtp-user" class="form-control" formControlName="smtp_usuario" autocomplete="off"></div>
                  <div class="col-md-6"><label class="form-label" for="smtp-clave">Contraseña</label>
                    <input id="smtp-clave" type="password" class="form-control" formControlName="smtp_clave" autocomplete="new-password"
                           [placeholder]="cfg.tiene_clave ? '•••••• guardada' : ''">
                    <div class="form-text">Deje vacío para conservar la actual.</div></div>
                  <div class="col-md-6"><label class="form-label" for="smtp-rem">Remitente</label>
                    <input id="smtp-rem" class="form-control" formControlName="correo_remitente" placeholder="GoalScore &lt;avisos&#64;su-dominio.com&gt;"></div>
                </div>
                <div class="alert alert-light border small mt-3 mb-3">
                  <div class="fw-semibold mb-1"><i class="ri-information-line me-1"></i>Ejemplos</div>
                  <ul class="mb-0 ps-3">
                    <li><b>Gmail:</b> smtp.gmail.com, puerto 587, STARTTLS, con una «contraseña de aplicación» (no la clave normal de la cuenta).</li>
                    <li><b>Microsoft 365:</b> smtp.office365.com, puerto 587, STARTTLS.</li>
                    <li>Con puerto <b>465</b> elija seguridad <b>SSL/TLS</b>.</li>
                  </ul>
                </div>
                <div *ngIf="errorCorreo" class="alert alert-danger py-2">{{ errorCorreo }}</div>
                <button class="btn btn-primary" type="submit" [disabled]="guardando"><span *ngIf="guardando === 'correo'" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
              </form>

              <hr class="my-4">
              <h6><i class="ri-send-plane-line me-1"></i>Enviar correo de prueba</h6>
              <p class="small text-muted">Guarda la configuración y envía un mensaje de prueba al destino indicado.</p>
              <div class="row g-2 align-items-start">
                <div class="col-md-6"><input type="email" class="form-control" [(ngModel)]="destinoPrueba" placeholder="correo&#64;ejemplo.com" aria-label="Correo de destino"></div>
                <div class="col-auto"><button class="btn btn-soft-primary" (click)="probarCorreo()" [disabled]="probando"><span *ngIf="probando" class="spinner-border spinner-border-sm me-1"></span>Guardar y enviar prueba</button></div>
              </div>
              <div *ngIf="resultadoPrueba" class="alert mt-3 mb-0 py-2" [ngClass]="resultadoPrueba.ok ? 'alert-success' : 'alert-danger'" id="resultado-correo">{{ resultadoPrueba.detail }}</div>
            </ng-template></li>

          <!-- Cuentas y Google -->
          <li ngbNavItem="cuentas"><a ngbNavLink><i class="ri-user-shared-line me-1"></i>Cuentas y Google</a>
            <ng-template ngbNavContent>
              <form [formGroup]="fCuentas" (ngSubmit)="guardarCuentas()" class="mt-3" novalidate>
                <div class="form-check form-switch mb-1"><input class="form-check-input" type="checkbox" id="cfg-verif" formControlName="verificar_correo">
                  <label class="form-check-label" for="cfg-verif">Exigir verificación del correo al crear una cuenta</label></div>
                <div class="form-text mb-3">Sólo se aplica si el correo está configurado; si no, las cuentas quedan activas de inmediato.</div>
                <div class="mb-3"><label class="form-label" for="cfg-url">URL pública del portal</label>
                  <div class="input-group">
                    <input id="cfg-url" class="form-control" formControlName="url_publica" placeholder="https://goalscore.su-dominio.com">
                    <button class="btn btn-light" type="button" (click)="usarOrigen()">Usar {{ origen }}</button>
                  </div>
                  <div class="form-text">Se usa en los enlaces de los correos (confirmar correo, recuperar contraseña).</div></div>
                <div class="mb-3"><label class="form-label" for="cfg-google">Google client ID</label>
                  <input id="cfg-google" class="form-control" formControlName="google_client_id" placeholder="123456789-xxxx.apps.googleusercontent.com" autocomplete="off">
                  <div class="form-text">Déjelo vacío para ocultar el botón «Continuar con Google».</div></div>
                <div class="alert alert-light border small">
                  <div class="fw-semibold mb-1"><i class="ri-information-line me-1"></i>Cómo obtener el client ID</div>
                  Google Cloud Console → APIs y servicios → Credenciales → Crear credenciales → <b>ID de cliente de OAuth</b> → tipo <b>Aplicación web</b>.
                  En «Orígenes autorizados de JavaScript» agregue la URL pública del portal (por ejemplo <code>{{ origen }}</code>).
                </div>
                <div *ngIf="errorCuentas" class="alert alert-danger py-2">{{ errorCuentas }}</div>
                <button class="btn btn-primary" type="submit" [disabled]="guardando"><span *ngIf="guardando === 'cuentas'" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
              </form>
            </ng-template></li>

          <!-- Medios -->
          <li ngbNavItem="medios"><a ngbNavLink><i class="ri-gallery-line me-1"></i>Fotos y videos</a>
            <ng-template ngbNavContent>
              <form [formGroup]="fMedios" (ngSubmit)="guardarMedios()" class="mt-3" novalidate>
                <div class="row g-3">
                  <div class="col-sm-6 col-lg-3"><label class="form-label" for="m-imgs">Imágenes por partido</label>
                    <input id="m-imgs" type="number" class="form-control" formControlName="max_imagenes_partido" [class.is-invalid]="fMedios.controls.max_imagenes_partido.invalid">
                    <div class="invalid-feedback">Entre 0 y 200.</div></div>
                  <div class="col-sm-6 col-lg-3"><label class="form-label" for="m-vids">Videos por partido</label>
                    <input id="m-vids" type="number" class="form-control" formControlName="max_videos_partido" [class.is-invalid]="fMedios.controls.max_videos_partido.invalid">
                    <div class="invalid-feedback">Entre 0 y 200.</div></div>
                  <div class="col-sm-6 col-lg-3"><label class="form-label" for="m-mbi">Peso máximo imagen (MB)</label>
                    <input id="m-mbi" type="number" class="form-control" formControlName="max_mb_imagen" [class.is-invalid]="fMedios.controls.max_mb_imagen.invalid">
                    <div class="invalid-feedback">Entre 1 y 50.</div></div>
                  <div class="col-sm-6 col-lg-3"><label class="form-label" for="m-mbv">Peso máximo video (MB)</label>
                    <input id="m-mbv" type="number" class="form-control" formControlName="max_mb_video" [class.is-invalid]="fMedios.controls.max_mb_video.invalid">
                    <div class="invalid-feedback">Entre 1 y 2000.</div></div>
                </div>
                <div *ngIf="errorMedios" class="alert alert-danger py-2 mt-3">{{ errorMedios }}</div>
                <button class="btn btn-primary mt-3" type="submit" [disabled]="guardando"><span *ngIf="guardando === 'medios'" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
              </form>
            </ng-template></li>

          <!-- Notificaciones web -->
          <li ngbNavItem="push"><a ngbNavLink><i class="ri-notification-badge-line me-1"></i>Notificaciones del navegador</a>
            <ng-template ngbNavContent>
              <form [formGroup]="fPush" (ngSubmit)="guardarPush()" class="mt-3" novalidate>
                <div class="mb-3"><label class="form-label" for="p-pub">Clave pública (VAPID)</label>
                  <div class="input-group">
                    <input id="p-pub" class="form-control" [value]="cfg.vapid_publica" readonly>
                    <button class="btn btn-light" type="button" (click)="copiar(cfg.vapid_publica)" title="Copiar"><i class="ri-file-copy-line"></i></button>
                  </div></div>
                <div class="mb-3"><label class="form-label" for="p-contacto">Contacto</label>
                  <input id="p-contacto" class="form-control" formControlName="vapid_contacto" placeholder="mailto:admin&#64;su-dominio.com">
                  <div class="form-text">Correo de contacto del servidor de notificaciones, con el formato <code>mailto:correo&#64;dominio.com</code>.</div></div>
                <div *ngIf="errorPush" class="alert alert-danger py-2">{{ errorPush }}</div>
                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-primary" type="submit" [disabled]="guardando"><span *ngIf="guardando === 'push'" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
                  <button class="btn btn-soft-danger" type="button" (click)="regenerar()"><i class="ri-refresh-line me-1"></i>Regenerar claves</button>
                </div>
              </form>
            </ng-template></li>
        </ul>
        <div [ngbNavOutlet]="nav"></div>
      </div>
    </div>`,
})
export class ConfiguracionComponent implements OnInit {
  tab = 'correo';
  cfg: Configuracion | null = null;
  origen = window.location.origin;
  guardando: '' | 'correo' | 'cuentas' | 'medios' | 'push' = '';
  errorCorreo = ''; errorCuentas = ''; errorMedios = ''; errorPush = '';
  destinoPrueba = this.auth.usuario?.email ?? '';
  probando = false;
  resultadoPrueba: { ok: boolean; detail: string } | null = null;

  fCorreo = this.fb.nonNullable.group({
    smtp_host: [''], smtp_puerto: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
    smtp_seguridad: ['STARTTLS' as Configuracion['smtp_seguridad']], smtp_usuario: [''], smtp_clave: [''], correo_remitente: [''],
  });
  fCuentas = this.fb.nonNullable.group({ verificar_correo: [false], url_publica: [''], google_client_id: [''] });
  fMedios = this.fb.nonNullable.group({
    max_imagenes_partido: [10, [Validators.required, Validators.min(0), Validators.max(200)]],
    max_videos_partido: [2, [Validators.required, Validators.min(0), Validators.max(200)]],
    max_mb_imagen: [10, [Validators.required, Validators.min(1), Validators.max(50)]],
    max_mb_video: [200, [Validators.required, Validators.min(1), Validators.max(2000)]],
  });
  fPush = this.fb.nonNullable.group({ vapid_contacto: [''] });

  constructor(private fb: FormBuilder, private api: ConfiguracionService, private toast: ToastService,
              private dialogo: DialogService, public auth: AuthService) {}

  ngOnInit() { this.api.obtener().subscribe(c => this.cargar(c)); }

  private cargar(c: Configuracion) {
    this.cfg = c;
    this.fCorreo.patchValue({ ...c, smtp_clave: '' });
    this.fCuentas.patchValue(c);
    this.fMedios.patchValue(c);
    this.fPush.patchValue(c);
  }

  usarOrigen() { this.fCuentas.patchValue({ url_publica: this.origen }); }

  async copiar(texto: string) {
    try { await navigator.clipboard.writeText(texto); this.toast.ok('Clave copiada.'); }
    catch { this.toast.aviso('No se pudo copiar automáticamente: seleccione la clave y cópiela.'); }
  }

  /** Envía sólo los campos de la pestaña y devuelve la configuración actualizada. */
  private enviar(tipo: 'correo' | 'cuentas' | 'medios' | 'push', campos: Partial<Configuracion>, error: (m: string) => void): Promise<boolean> {
    this.guardando = tipo;
    error('');
    return new Promise(ok => this.api.guardar(campos).subscribe({
      next: c => { this.guardando = ''; this.cargar(c); ok(true); },
      error: (e: HttpErrorResponse) => { this.guardando = ''; error(textoError(e)); ok(false); },
    }));
  }

  async guardarCorreo(): Promise<boolean> {
    this.fCorreo.markAllAsTouched();
    if (this.fCorreo.invalid) { return false; }
    const { smtp_clave, ...resto } = this.fCorreo.getRawValue();
    const campos: Partial<Configuracion> = { ...resto };
    if (smtp_clave) { campos.smtp_clave = smtp_clave; }   // vacío = conservar la actual
    const ok = await this.enviar('correo', campos, m => (this.errorCorreo = m));
    if (ok) { this.toast.ok('Configuración de correo guardada.'); }
    return ok;
  }

  async probarCorreo() {
    const destino = this.destinoPrueba.trim();
    if (!destino) { this.toast.aviso('Indique el correo de destino de la prueba.'); return; }
    this.resultadoPrueba = null;
    this.probando = true;
    if (!(await this.guardarCorreo())) { this.probando = false; return; }
    this.api.probarCorreo(destino).subscribe({
      next: r => { this.probando = false; this.resultadoPrueba = { ok: r.ok, detail: r.detail }; },
      error: (e: HttpErrorResponse) => { this.probando = false; this.resultadoPrueba = { ok: false, detail: e.error?.detail ?? mensajeError(e) }; },
    });
  }

  async guardarCuentas() {
    if (await this.enviar('cuentas', this.fCuentas.getRawValue(), m => (this.errorCuentas = m))) { this.toast.ok('Configuración de cuentas guardada.'); }
  }

  async guardarMedios() {
    this.fMedios.markAllAsTouched();
    if (this.fMedios.invalid) { return; }
    if (await this.enviar('medios', this.fMedios.getRawValue(), m => (this.errorMedios = m))) { this.toast.ok('Límites guardados.'); }
  }

  async guardarPush() {
    if (await this.enviar('push', this.fPush.getRawValue(), m => (this.errorPush = m))) { this.toast.ok('Contacto guardado.'); }
  }

  async regenerar() {
    if (!(await this.dialogo.confirmar('¿Regenerar las claves de notificaciones?',
      'Todos los navegadores suscritos dejarán de recibir avisos hasta que cada usuario vuelva a activar las notificaciones. Esta acción no se puede deshacer.',
      'Sí, regenerar', true))) { return; }
    this.api.regenerarVapid().subscribe(r => {
      if (this.cfg) { this.cfg = { ...this.cfg, vapid_publica: r.vapid_publica }; }
      this.toast.ok(r.detail);
    });
  }
}

@NgModule({
  declarations: [ConfiguracionComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: ConfiguracionComponent }])],
})
export class ConfiguracionModule {}
