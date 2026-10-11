import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeError } from '../core/services/api-utils';
import { AuthService, rutaInternaSegura } from '../core/services/auth.service';

/** Ingreso de aficionados (correo y contraseña) o de Google. */
@Component({
  selector: 'app-ingresar',
  template: `
    <div class="cuenta-pagina">
      <div class="cuenta-card card">
        <div class="card-body p-4 p-sm-5">
          <h4 class="mb-1">Ingresar</h4>
          <p class="text-muted mb-4">Siga a sus equipos y reciba avisos de los partidos.</p>
          <div *ngIf="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
          <form [formGroup]="form" (ngSubmit)="entrar()" novalidate>
            <div class="mb-3">
              <label class="form-label" for="i-correo">Correo</label>
              <input id="i-correo" type="email" class="form-control" formControlName="username" autocomplete="username" [class.is-invalid]="malo('username')">
              <div class="invalid-feedback">Ingrese su correo.</div>
            </div>
            <div class="mb-2">
              <label class="form-label" for="i-clave">Contraseña</label>
              <input id="i-clave" type="password" class="form-control" formControlName="password" autocomplete="current-password" [class.is-invalid]="malo('password')">
              <div class="invalid-feedback">Ingrese su contraseña.</div>
            </div>
            <div class="text-end mb-3"><a routerLink="/cuenta/olvide" class="small">Olvidé mi contraseña</a></div>
            <button class="btn btn-primary w-100" type="submit" [disabled]="cargando">
              <span *ngIf="cargando" class="spinner-border spinner-border-sm me-2"></span>Ingresar
            </button>
          </form>
          <app-boton-google (sesion)="listo()" (fallo)="error = $event"></app-boton-google>
          <div class="text-center mt-4 small">
            ¿No tiene cuenta? <a routerLink="/cuenta/registro" [queryParams]="volver ? { volver: volver } : {}">Crear cuenta</a>
          </div>
        </div>
      </div>
    </div>`,
})
export class IngresarComponent {
  form = this.fb.nonNullable.group({ username: ['', Validators.required], password: ['', Validators.required] });
  cargando = false;
  error = '';
  volver = rutaInternaSegura(this.route.snapshot.queryParamMap.get('volver'));

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {
    if (this.auth.autenticado) { this.router.navigateByUrl(this.volver ?? this.auth.rutaInicio); }
  }

  malo(c: 'username' | 'password') {
    const x = this.form.controls[c];
    return x.invalid && (x.dirty || x.touched);
  }

  entrar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { return; }
    this.cargando = true;
    this.error = '';
    const { username, password } = this.form.getRawValue();
    this.auth.login(username.trim(), password).subscribe({
      next: () => this.listo(),
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        const detalle = String(e.error?.detail ?? '');
        // simplejwt responde en inglés para credenciales incorrectas; el resto de mensajes (cuenta pendiente...) vienen en español
        this.error = e.status === 401
          ? (detalle && !/no active account|combinaci[oó]n de credenciales/i.test(detalle) ? detalle : 'Correo o contraseña incorrectos.')
          : e.status === 429 ? 'Demasiados intentos. Vuelva a intentarlo más tarde.' : mensajeError(e);
      },
    });
  }

  listo() { this.router.navigateByUrl(this.volver ?? this.auth.rutaInicio); }
}
