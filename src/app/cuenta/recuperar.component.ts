import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { mensajeError } from '../core/services/api-utils';
import { AuthService } from '../core/services/auth.service';

const iguales = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirmar')?.value ? null : { distintas: true };

const detalle = (e: HttpErrorResponse) => {
  if (e.status === 429) { return 'Demasiados intentos. Vuelva a intentarlo más tarde.'; }
  const d = e.error;
  if (d && typeof d === 'object' && !d.detail) {
    return Object.values(d as Record<string, unknown>).map(v => (Array.isArray(v) ? v.join(' ') : String(v))).join(' ');
  }
  return d?.detail ?? mensajeError(e);
};

/** Confirma el correo con el enlace recibido (`?token=`) y permite reenviarlo. */
@Component({
  selector: 'app-verificar-correo',
  template: `
    <div class="cuenta-pagina">
      <div class="cuenta-card card"><div class="card-body p-4 p-sm-5 text-center">
        <div *ngIf="estado === 'cargando'"><div class="spinner-border text-primary mb-3"></div><p class="text-muted mb-0">Confirmando su correo…</p></div>
        <ng-container *ngIf="estado === 'ok'">
          <div class="avatar-lg mx-auto mb-3"><span class="avatar-title rounded-circle badge-soft-success fs-1"><i class="ri-check-line"></i></span></div>
          <h5>Correo confirmado</h5><p class="text-muted">{{ mensaje }}</p>
          <a routerLink="/cuenta/ingresar" class="btn btn-primary">Ingresar</a>
        </ng-container>
        <ng-container *ngIf="estado === 'error'">
          <div class="avatar-lg mx-auto mb-3"><span class="avatar-title rounded-circle badge-soft-danger fs-1"><i class="ri-close-line"></i></span></div>
          <h5>No se pudo confirmar</h5><p class="text-muted">{{ mensaje }}</p>
          <form [formGroup]="form" (ngSubmit)="reenviar()" class="text-start mt-4" novalidate>
            <label class="form-label" for="v-correo">Reenviar el enlace a mi correo</label>
            <div class="input-group">
              <input id="v-correo" type="email" class="form-control" formControlName="email" placeholder="correo@ejemplo.com" [class.is-invalid]="form.touched && form.invalid">
              <button class="btn btn-primary" type="submit" [disabled]="enviando"><span *ngIf="enviando" class="spinner-border spinner-border-sm me-1"></span>Reenviar</button>
            </div>
            <div *ngIf="reenvio" class="alert alert-success py-2 mt-3 mb-0">{{ reenvio }}</div>
          </form>
        </ng-container>
      </div></div>
    </div>`,
})
export class VerificarCorreoComponent implements OnInit {
  estado: 'cargando' | 'ok' | 'error' = 'cargando';
  mensaje = '';
  reenvio = '';
  enviando = false;
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  constructor(private fb: FormBuilder, private auth: AuthService, private route: ActivatedRoute) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.estado = 'error'; this.mensaje = 'El enlace no es válido: falta el código de confirmación.'; return; }
    this.auth.verificarCorreo(token).subscribe({
      next: r => { this.estado = 'ok'; this.mensaje = r.detail; },
      error: (e: HttpErrorResponse) => { this.estado = 'error'; this.mensaje = detalle(e); },
    });
  }

  reenviar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { return; }
    this.enviando = true;
    this.auth.reenviarVerificacion(this.form.getRawValue().email.trim()).subscribe({
      next: r => { this.enviando = false; this.reenvio = r.detail; },
      error: (e: HttpErrorResponse) => { this.enviando = false; this.reenvio = ''; this.mensaje = detalle(e); },
    });
  }
}

/** Solicita el enlace para cambiar la contraseña. */
@Component({
  selector: 'app-olvide-clave',
  template: `
    <div class="cuenta-pagina">
      <div class="cuenta-card card"><div class="card-body p-4 p-sm-5">
        <h4 class="mb-1">Recuperar contraseña</h4>
        <p class="text-muted mb-4">Le enviaremos un enlace a su correo para elegir una nueva contraseña.</p>
        <div *ngIf="resultado" class="alert alert-success py-2">{{ resultado }}</div>
        <div *ngIf="error" class="alert alert-danger py-2">{{ error }}</div>
        <form [formGroup]="form" (ngSubmit)="enviar()" novalidate *ngIf="!resultado">
          <div class="mb-3"><label class="form-label" for="o-correo">Correo</label>
            <input id="o-correo" type="email" class="form-control" formControlName="email" autocomplete="email" [class.is-invalid]="form.touched && form.invalid">
            <div class="invalid-feedback">Ingrese un correo válido.</div></div>
          <button class="btn btn-primary w-100" type="submit" [disabled]="cargando"><span *ngIf="cargando" class="spinner-border spinner-border-sm me-2"></span>Enviar enlace</button>
        </form>
        <div class="text-center mt-4 small"><a routerLink="/cuenta/ingresar"><i class="ri-arrow-left-line"></i> Volver a ingresar</a></div>
      </div></div>
    </div>`,
})
export class OlvideClaveComponent {
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  cargando = false;
  resultado = '';
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  enviar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { return; }
    this.cargando = true;
    this.error = '';
    this.auth.olvideClave(this.form.getRawValue().email.trim()).subscribe({
      next: r => { this.cargando = false; this.resultado = r.detail; },
      error: (e: HttpErrorResponse) => { this.cargando = false; this.error = detalle(e); },
    });
  }
}

/** Elige una nueva contraseña con el enlace `?uid=&token=`. */
@Component({
  selector: 'app-restablecer-clave',
  template: `
    <div class="cuenta-pagina">
      <div class="cuenta-card card"><div class="card-body p-4 p-sm-5">
        <h4 class="mb-4">Nueva contraseña</h4>
        <div *ngIf="resultado" class="text-center">
          <div class="alert alert-success py-2">{{ resultado }}</div>
          <a routerLink="/cuenta/ingresar" class="btn btn-primary">Ingresar</a>
        </div>
        <div *ngIf="error" class="alert alert-danger py-2">{{ error }}</div>
        <form [formGroup]="form" (ngSubmit)="enviar()" novalidate *ngIf="!resultado && uid && token">
          <div class="mb-3"><label class="form-label" for="n-clave">Nueva contraseña</label>
            <input id="n-clave" type="password" class="form-control" formControlName="password" autocomplete="new-password" [class.is-invalid]="form.get('password')!.touched && form.get('password')!.invalid">
            <div class="invalid-feedback">Mínimo 8 caracteres.</div></div>
          <div class="mb-3"><label class="form-label" for="n-confirmar">Repetir contraseña</label>
            <input id="n-confirmar" type="password" class="form-control" formControlName="confirmar" autocomplete="new-password" [class.is-invalid]="form.touched && form.hasError('distintas')">
            <div class="invalid-feedback">Las contraseñas no coinciden.</div></div>
          <button class="btn btn-primary w-100" type="submit" [disabled]="cargando"><span *ngIf="cargando" class="spinner-border spinner-border-sm me-2"></span>Cambiar contraseña</button>
        </form>
        <div *ngIf="!uid || !token" class="text-center"><p class="text-muted">El enlace no es válido.</p><a routerLink="/cuenta/olvide">Solicitar uno nuevo</a></div>
      </div></div>
    </div>`,
})
export class RestablecerClaveComponent {
  uid = this.route.snapshot.queryParamMap.get('uid') ?? '';
  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmar: ['', Validators.required],
  }, { validators: iguales });
  cargando = false;
  resultado = '';
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private route: ActivatedRoute) {}

  enviar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { return; }
    this.cargando = true;
    this.error = '';
    this.auth.restablecerClave(this.uid, this.token, this.form.getRawValue().password).subscribe({
      next: r => { this.cargando = false; this.resultado = r.detail; },
      error: (e: HttpErrorResponse) => { this.cargando = false; this.error = detalle(e); },
    });
  }
}
