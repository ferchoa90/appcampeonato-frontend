import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { mensajeError } from '../core/services/api-utils';

@Component({
  selector: 'app-login',
  template: `
    <div class="auth-page">
      <div class="auth-card card shadow-lg">
        <div class="card-body p-4 p-sm-5">
          <div class="text-center mb-4">
            <a routerLink="/" class="logo-marca justify-content-center" aria-label="GoalScore">
              <img class="logo-goalscore sobre-claro" src="assets/images/logo-goalscore.png" alt="GoalScore" height="48">
              <img class="logo-goalscore sobre-oscuro" src="assets/images/logo-goalscore-blanco.png" alt="GoalScore" height="48">
            </a>
            <p class="text-muted mt-2 mb-0">Inicie sesión para administrar los campeonatos</p>
          </div>
          <div *ngIf="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
          <form [formGroup]="form" (ngSubmit)="entrar()" novalidate>
            <div class="mb-3">
              <label class="form-label" for="username">Usuario</label>
              <input id="username" class="form-control" formControlName="username" autocomplete="username" autofocus
                     [class.is-invalid]="invalido('username')">
              <div class="invalid-feedback">Ingrese su usuario.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="password">Contraseña</label>
              <div class="position-relative">
                <input id="password" class="form-control pe-5" [type]="ver ? 'text' : 'password'" formControlName="password"
                       autocomplete="current-password" [class.is-invalid]="invalido('password')">
                <button type="button" class="btn btn-link position-absolute end-0 top-0 text-muted" (click)="ver = !ver" tabindex="-1"
                        [attr.aria-label]="ver ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                  <i [class]="ver ? 'ri-eye-off-fill' : 'ri-eye-fill'"></i>
                </button>
                <div class="invalid-feedback">Ingrese su contraseña.</div>
              </div>
            </div>
            <button class="btn btn-primary w-100" type="submit" [disabled]="cargando">
              <span *ngIf="cargando" class="spinner-border spinner-border-sm me-2"></span>Ingresar
            </button>
          </form>
          <div class="text-center mt-4">
            <a routerLink="/auth/registro" class="d-block mb-2"><i class="ri-user-add-line"></i> Solicitar cuenta de organizador</a>
            <a routerLink="/" class="text-muted"><i class="ri-arrow-left-line"></i> Volver al portal público</a>
          </div>
        </div>
      </div>
    </div>`,
})
export class LoginComponent {
  form = this.fb.nonNullable.group({ username: ['', Validators.required], password: ['', Validators.required] });
  cargando = false;
  ver = false;
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    if (this.auth.autenticado) { this.router.navigateByUrl(this.auth.rutaInicio); }
  }

  invalido(c: 'username' | 'password') {
    const x = this.form.controls[c];
    return x.invalid && (x.dirty || x.touched);
  }

  entrar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { return; }
    this.cargando = true;
    this.error = '';
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => this.router.navigateByUrl(this.auth.rutaInicio),
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        // cuenta correcta pero aún sin aprobar: el servidor lo indica; si no, credenciales incorrectas
        const pendiente = e.status === 401 && /administrador/i.test(String(e.error?.detail ?? ''));
        this.error = pendiente ? e.error.detail : e.status === 401 ? 'Usuario o contraseña incorrectos.' : mensajeError(e);
      },
    });
  }
}
