import { AfterViewInit, Component, ElementRef, EventEmitter, NgZone, Output, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginResponse } from '../core/models';
import { mensajeError } from '../core/services/api-utils';
import { AuthService } from '../core/services/auth.service';
import { CuentaService } from '../core/services/cuenta.service';

const GSI_URL = 'https://accounts.google.com/gsi/client';

let cargaGsi: Promise<void> | null = null;

/** Carga (una vez) la librería de Google Identity Services. */
function cargarGsi(): Promise<void> {
  if (!cargaGsi) {
    cargaGsi = new Promise<void>((ok, ko) => {
      const s = document.createElement('script');
      s.src = GSI_URL;
      s.async = true;
      s.defer = true;
      s.onload = () => ok();
      s.onerror = () => { cargaGsi = null; ko(new Error('No se pudo cargar Google')); };
      document.head.appendChild(s);
    });
  }
  return cargaGsi;
}

/** Botón «Continuar con Google»: sólo aparece si el administrador configuró el client id. */
@Component({
  selector: 'app-boton-google',
  template: `
    <div *ngIf="visible" class="google-separador"><span>o</span></div>
    <div #contenedor class="d-flex justify-content-center" [hidden]="!visible"></div>`,
})
export class BotonGoogleComponent implements AfterViewInit {
  /** Se emite al iniciar sesión con Google (la sesión ya quedó guardada). */
  @Output() sesion = new EventEmitter<LoginResponse>();
  @Output() fallo = new EventEmitter<string>();
  @ViewChild('contenedor', { static: true }) contenedor!: ElementRef<HTMLElement>;
  visible = false;

  constructor(private cuenta: CuentaService, private auth: AuthService, private zona: NgZone) {}

  ngAfterViewInit() {
    this.cuenta.configPublica().subscribe({
      next: cfg => { if (cfg.google_client_id) { this.iniciar(cfg.google_client_id); } },
      error: () => undefined,   // sin configuración no hay botón (sin errores)
    });
  }

  private async iniciar(clientId: string) {
    try {
      await cargarGsi();
      const google = (window as any).google;
      if (!google?.accounts?.id) { return; }
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (r: { credential: string }) => this.zona.run(() => this.entrar(r.credential)),
      });
      this.zona.run(() => (this.visible = true));
      google.accounts.id.renderButton(this.contenedor.nativeElement, { theme: 'outline', size: 'large', width: 300, text: 'continue_with', locale: 'es' });
    } catch { /* Google no disponible (sin red o bloqueado): se oculta el botón */ }
  }

  private entrar(credential: string) {
    this.auth.google(credential).subscribe({
      next: r => this.sesion.emit(r),
      error: (e: HttpErrorResponse) => this.fallo.emit(e.error?.detail ?? mensajeError(e)),
    });
  }
}
