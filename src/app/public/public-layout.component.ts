import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-public-layout',
  template: `
    <div class="pub">
      <header class="pub-header">
        <div class="pub-contenedor d-flex align-items-center justify-content-between">
          <a routerLink="/" class="logo-marca" aria-label="GoalScore">
            <img class="logo-goalscore sobre-claro" src="assets/images/logo-goalscore.png" alt="GoalScore" height="34">
            <img class="logo-goalscore sobre-oscuro" src="assets/images/logo-goalscore-blanco.png" alt="GoalScore" height="34">
          </a>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-icon btn-ghost-secondary" (click)="tema.alternar()"
                    [attr.aria-label]="tema.modo === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
              <i [class]="tema.modo === 'dark' ? 'ri-sun-line' : 'ri-moon-line'"></i>
            </button>

            <ng-container *ngIf="!auth.autenticado">
              <a routerLink="/cuenta/ingresar" [queryParams]="volver" class="btn btn-sm btn-outline-primary"><i class="ri-login-box-line"></i> Ingresar</a>
              <a routerLink="/cuenta/registro" [queryParams]="volver" class="btn btn-sm btn-primary d-none d-sm-inline-flex"><i class="ri-user-add-line"></i>&nbsp;Crear cuenta</a>
            </ng-container>

            <div *ngIf="auth.autenticado" ngbDropdown placement="bottom-end">
              <button type="button" class="btn btn-sm btn-soft-primary arrow-none" ngbDropdownToggle id="menu-cuenta">
                <i class="ri-user-3-line"></i> <span class="d-none d-sm-inline ms-1">{{ nombre }}</span>
              </button>
              <div ngbDropdownMenu class="dropdown-menu-end">
                <h6 class="dropdown-header text-truncate" style="max-width:220px">{{ auth.usuario?.email || auth.usuario?.username }}</h6>
                <a ngbDropdownItem routerLink="/perfil"><i class="ri-user-settings-line align-middle me-1"></i> Mi perfil</a>
                <a ngbDropdownItem *ngIf="auth.esPersonal" [routerLink]="auth.rutaInicio"><i class="ri-dashboard-line align-middle me-1"></i> Panel</a>
                <div class="dropdown-divider"></div>
                <button ngbDropdownItem type="button" (click)="auth.logout()"><i class="ri-logout-box-r-line align-middle me-1"></i> Salir</button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main class="pub-main"><router-outlet></router-outlet></main>
      <footer class="pub-footer">
        <div class="pub-contenedor">© {{ anio }} GoalScore · AcepSistemas todos los derechos reservados. · Resultados en vivo y tabla de posiciones
          <span class="d-block mt-1"><a routerLink="/privacidad" class="text-muted">Política de privacidad</a> ·
            <a routerLink="/eliminar-cuenta" class="text-muted">Eliminar mi cuenta</a> ·
            <a routerLink="/auth/login" class="text-muted">Acceso para organizadores y administradores</a></span></div>
      </footer>
    </div>`,
})
export class PublicLayoutComponent {
  anio = new Date().getFullYear();
  constructor(public tema: ThemeService, public auth: AuthService, private router: Router) {}

  get nombre() { return this.auth.usuario?.first_name || this.auth.usuario?.username || 'Mi cuenta'; }

  /** Para volver a la página actual tras ingresar (salvo que ya estemos en las pantallas de cuenta). */
  get volver(): { volver: string } | null {
    const url = this.router.url;
    if (this.memo?.url !== url) {
      this.memo = { url, valor: url === '/' || url.startsWith('/cuenta') ? null : { volver: url } };
    }
    return this.memo.valor;   // mismo objeto mientras la URL no cambie (evita recalcular el enlace en cada ciclo)
  }
  private memo?: { url: string; valor: { volver: string } | null };
}
