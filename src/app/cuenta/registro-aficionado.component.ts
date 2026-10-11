import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeError } from '../core/services/api-utils';
import { AuthService, rutaInternaSegura } from '../core/services/auth.service';

const iguales = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirmar')?.value ? null : { distintas: true };

/** Registro de aficionados: nombre, correo y contraseña (o Google). */
@Component({
  selector: 'app-registro-aficionado',
  template: `
    <div class="cuenta-pagina">
      <div class="cuenta-card card" style="max-width:520px">
        <div class="card-body p-4 p-sm-5">
          <div *ngIf="mensaje" class="text-center py-2">
            <div class="avatar-lg mx-auto mb-3"><span class="avatar-title rounded-circle badge-soft-success fs-1"><i class="ri-mail-check-line"></i></span></div>
            <h5>Revise su correo</h5>
            <p class="text-muted">{{ mensaje }}</p>
            <a routerLink="/cuenta/ingresar" class="btn btn-primary">Ir a ingresar</a>
          </div>

          <ng-container *ngIf="!mensaje">
            <h4 class="mb-1">Crear cuenta</h4>
            <p class="text-muted mb-4">Gratis. Elija qué partidos, campeonatos o equipos quiere seguir.</p>
            <div *ngIf="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
            <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
              <div class="row g-3">
                <div class="col-sm-6"><label class="form-label" for="a-nombre">Nombre *</label>
                  <input id="a-nombre" class="form-control" formControlName="first_name" autocomplete="given-name" [class.is-invalid]="malo('first_name') || errorCampo('first_name')">
                  <div class="invalid-feedback">{{ errorCampo('first_name') || 'Obligatorio.' }}</div></div>
                <div class="col-sm-6"><label class="form-label" for="a-apellido">Apellido</label>
                  <input id="a-apellido" class="form-control" formControlName="last_name" autocomplete="family-name" [class.is-invalid]="errorCampo('last_name')">
                  <div class="invalid-feedback">{{ errorCampo('last_name') }}</div></div>
                <div class="col-12"><label class="form-label" for="a-correo">Correo *</label>
                  <input id="a-correo" type="email" class="form-control" formControlName="email" autocomplete="email" [class.is-invalid]="malo('email') || errorCampo('email')">
                  <div class="invalid-feedback">{{ errorCampo('email') || 'Ingrese un correo válido.' }}</div></div>
                <div class="col-sm-6"><label class="form-label" for="a-clave">Contraseña *</label>
                  <input id="a-clave" type="password" class="form-control" formControlName="password" autocomplete="new-password" [class.is-invalid]="malo('password') || errorCampo('password')">
                  <div class="invalid-feedback">{{ errorCampo('password') || 'Mínimo 8 caracteres.' }}</div></div>
                <div class="col-sm-6"><label class="form-label" for="a-confirmar">Repetir contraseña *</label>
                  <input id="a-confirmar" type="password" class="form-control" formControlName="confirmar" autocomplete="new-password"
                         [class.is-invalid]="form.touched && form.hasError('distintas')">
                  <div class="invalid-feedback">Las contraseñas no coinciden.</div></div>
              </div>
              <button class="btn btn-primary w-100 mt-4" type="submit" [disabled]="cargando">
                <span *ngIf="cargando" class="spinner-border spinner-border-sm me-2"></span>Crear cuenta
              </button>
            </form>
            <app-boton-google (sesion)="irA()" (fallo)="error = $event"></app-boton-google>
            <div class="text-center mt-4 small">¿Ya tiene cuenta? <a routerLink="/cuenta/ingresar" [queryParams]="volver ? { volver: volver } : {}">Ingresar</a></div>
          </ng-container>
        </div>
      </div>
    </div>`,
})
export class RegistroAficionadoComponent {
  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmar: ['', Validators.required],
  }, { validators: iguales });
  cargando = false;
  /** Texto del servidor cuando hay que confirmar el correo. */
  mensaje = '';
  error = '';
  volver = rutaInternaSegura(this.route.snapshot.queryParamMap.get('volver'));
  private servidor: Record<string, string> = {};

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  malo(c: string) {
    const x = this.form.get(c)!;
    return x.invalid && (x.dirty || x.touched);
  }

  errorCampo(c: string) { return this.servidor[c] ?? ''; }

  irA() { this.router.navigateByUrl(this.volver ?? '/perfil'); }

  enviar() {
    this.form.markAllAsTouched();
    this.servidor = {};
    this.error = '';
    if (this.form.invalid) { return; }
    this.cargando = true;
    const { confirmar, ...datos } = this.form.getRawValue();
    this.auth.registrarAficionado(datos).subscribe({
      next: r => {
        if (r.requiere_verificacion) {
          this.cargando = false;
          this.mensaje = r.detail;
          return;
        }
        // cuenta activa de inmediato: se inicia sesión y se entra al perfil
        this.auth.login(datos.email.trim().toLowerCase(), datos.password).subscribe({
          next: () => this.irA(),
          error: () => { this.cargando = false; this.mensaje = `${r.detail} Ya puede ingresar con su correo y contraseña.`; },
        });
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        if (e.status === 429) { this.error = 'Demasiados intentos. Vuelva a intentarlo más tarde.'; return; }
        if (e.status === 400 && e.error && typeof e.error === 'object' && !e.error.detail) {
          for (const [campo, msgs] of Object.entries(e.error as Record<string, unknown>)) {
            this.servidor[campo] = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
          }
          this.error = 'Revise los campos marcados.';
          return;
        }
        this.error = e.error?.detail ?? mensajeError(e);   // p. ej. 503 si no se pudo enviar el correo de verificación
      },
    });
  }
}
