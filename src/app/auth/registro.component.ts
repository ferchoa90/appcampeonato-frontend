import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { mensajeError } from '../core/services/api-utils';
import { AuthService } from '../core/services/auth.service';

const iguales = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirmar')?.value ? null : { distintas: true };

/** Solicitud de cuenta de organizador: queda pendiente hasta que un administrador la apruebe. */
@Component({
  selector: 'app-registro',
  template: `
    <div class="auth-page">
      <div class="auth-card card shadow-lg" style="max-width:520px">
        <div class="card-body p-4 p-sm-5">
          <div class="text-center mb-4">
            <a routerLink="/" class="logo-marca justify-content-center" aria-label="GoalScore">
              <img class="logo-goalscore sobre-claro" src="assets/images/logo-goalscore.png" alt="GoalScore" height="44">
              <img class="logo-goalscore sobre-oscuro" src="assets/images/logo-goalscore-blanco.png" alt="GoalScore" height="44">
            </a>
            <h5 class="mt-3 mb-1">Solicitar cuenta de organizador</h5>
            <p class="text-muted mb-0 small">Podrá crear y administrar sus propios campeonatos y equipos. Un administrador debe aprobar la cuenta antes de que pueda ingresar.</p>
          </div>

          <div *ngIf="enviado" class="text-center py-3">
            <div class="avatar-lg mx-auto mb-3"><span class="avatar-title rounded-circle bg-success-subtle text-success fs-1"><i class="ri-mail-check-line"></i></span></div>
            <h5>¡Solicitud enviada!</h5>
            <p class="text-muted">{{ enviado }}</p>
            <a routerLink="/auth/login" class="btn btn-primary">Ir a iniciar sesión</a>
          </div>

          <form *ngIf="!enviado" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
            <div *ngIf="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
            <div class="row g-3">
              <div class="col-sm-6"><label class="form-label" for="r-nombre">Nombres *</label>
                <input id="r-nombre" class="form-control" formControlName="first_name" autocomplete="given-name" [class.is-invalid]="malo('first_name')">
                <div class="invalid-feedback">Obligatorio.</div></div>
              <div class="col-sm-6"><label class="form-label" for="r-apellido">Apellidos</label>
                <input id="r-apellido" class="form-control" formControlName="last_name" autocomplete="family-name"></div>
              <div class="col-12"><label class="form-label" for="r-correo">Correo *</label>
                <input id="r-correo" type="email" class="form-control" formControlName="email" autocomplete="email" [class.is-invalid]="malo('email')">
                <div class="invalid-feedback">Ingrese un correo válido.</div></div>
              <div class="col-12"><label class="form-label" for="r-usuario">Usuario *</label>
                <input id="r-usuario" class="form-control" formControlName="username" autocomplete="username" [class.is-invalid]="malo('username') || errorCampo('username')">
                <div class="invalid-feedback">{{ errorCampo('username') || 'De 3 a 150 caracteres: letras, números y . @ + - _' }}</div></div>
              <div class="col-sm-6"><label class="form-label" for="r-clave">Contraseña *</label>
                <input id="r-clave" type="password" class="form-control" formControlName="password" autocomplete="new-password" [class.is-invalid]="malo('password') || errorCampo('password')">
                <div class="invalid-feedback">{{ errorCampo('password') || 'Mínimo 8 caracteres.' }}</div></div>
              <div class="col-sm-6"><label class="form-label" for="r-confirmar">Repetir contraseña *</label>
                <input id="r-confirmar" type="password" class="form-control" formControlName="confirmar" autocomplete="new-password"
                       [class.is-invalid]="form.touched && form.hasError('distintas')">
                <div class="invalid-feedback">Las contraseñas no coinciden.</div></div>
            </div>
            <button class="btn btn-primary w-100 mt-4" type="submit" [disabled]="cargando">
              <span *ngIf="cargando" class="spinner-border spinner-border-sm me-2"></span>Enviar solicitud
            </button>
          </form>
          <div class="text-center mt-4" *ngIf="!enviado"><a routerLink="/auth/login" class="text-muted"><i class="ri-arrow-left-line"></i> Ya tengo cuenta</a></div>
        </div>
      </div>
    </div>`,
})
export class RegistroComponent {
  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: [''],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[\w.@+-]+$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmar: ['', Validators.required],
  }, { validators: iguales });
  cargando = false;
  enviado = '';
  error = '';
  /** Errores por campo devueltos por el servidor (usuario repetido, contraseña débil...). */
  private servidor: Record<string, string> = {};

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  malo(c: string) {
    const x = this.form.get(c)!;
    return x.invalid && (x.dirty || x.touched);
  }

  errorCampo(c: string) { return this.servidor[c] ?? ''; }

  enviar() {
    this.form.markAllAsTouched();
    this.servidor = {};
    if (this.form.invalid) { return; }
    this.cargando = true;
    this.error = '';
    const { confirmar, ...datos } = this.form.getRawValue();
    this.auth.registrar(datos).subscribe({
      next: r => { this.cargando = false; this.enviado = r.detail; },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        if (e.status === 429) { this.error = 'Demasiados intentos. Vuelva a intentarlo más tarde.'; return; }
        if (e.status === 400 && e.error && typeof e.error === 'object') {
          for (const [campo, msgs] of Object.entries(e.error as Record<string, unknown>)) {
            this.servidor[campo] = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
          }
          this.error = 'Revise los campos marcados.';
          return;
        }
        this.error = mensajeError(e);
      },
    });
  }
}
