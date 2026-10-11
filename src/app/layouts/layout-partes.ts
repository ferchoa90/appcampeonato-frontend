import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  template: `
    <header id="page-topbar">
      <div class="layout-width">
        <div class="navbar-header">
          <div class="d-flex align-items-center">
            <button type="button" class="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger"
                    id="topnav-hamburger-icon" (click)="alternarMenu.emit()" aria-label="Menú">
              <span class="hamburger-icon"><span></span><span></span><span></span></span>
            </button>
          </div>
          <div class="d-flex align-items-center">
            <a routerLink="/" target="_blank" class="btn btn-ghost-secondary btn-sm me-2 d-none d-sm-inline-flex" title="Ver portal público">
              <i class="ri-external-link-line align-middle"></i> Portal público
            </a>
            <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" (click)="tema.alternar()"
                    [attr.aria-label]="tema.modo === 'dark' ? 'Modo claro' : 'Modo oscuro'">
              <i [class]="tema.modo === 'dark' ? 'bx bx-sun fs-22' : 'bx bx-moon fs-22'"></i>
            </button>
            <div ngbDropdown placement="bottom-end" class="ms-sm-3 header-item topbar-user">
              <button type="button" class="btn shadow-none arrow-none" ngbDropdownToggle id="user-menu">
                <span class="d-flex align-items-center">
                  <span class="avatar-xs"><span class="avatar-title rounded-circle bg-primary">{{ inicial }}</span></span>
                  <span class="text-start ms-xl-2">
                    <span class="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{{ auth.usuario?.username }}</span>
                    <span class="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">{{ auth.usuario?.roles?.join(', ') }}</span>
                  </span>
                </span>
              </button>
              <div ngbDropdownMenu class="dropdown-menu-end">
                <h6 class="dropdown-header">Hola, {{ auth.usuario?.username }}</h6>
                <a class="dropdown-item" routerLink="/" target="_blank"><i class="ri-earth-line text-muted fs-16 align-middle me-1"></i> Portal público</a>
                <div class="dropdown-divider"></div>
                <button type="button" class="dropdown-item" (click)="auth.logout()"><i class="ri-logout-box-r-line text-muted fs-16 align-middle me-1"></i> Cerrar sesión</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>`,
})
export class TopbarComponent {
  @Output() alternarMenu = new EventEmitter<void>();
  constructor(public auth: AuthService, public tema: ThemeService) {}
  get inicial() { return (this.auth.usuario?.username ?? '?').charAt(0).toUpperCase(); }
}

@Component({
  selector: 'app-sidebar',
  template: `
    <div class="app-menu navbar-menu">
      <div class="navbar-brand-box">
        <a routerLink="/admin" class="logo logo-dark logo-marca-lateral" aria-label="GoalScore">
          <span class="logo-sm"><img src="assets/images/logo-goalscore-icono-blanco.png" alt="GoalScore" height="24"></span>
          <span class="logo-lg"><img src="assets/images/logo-goalscore-blanco.png" alt="GoalScore" height="30"></span>
        </a>
        <a routerLink="/admin" class="logo logo-light logo-marca-lateral" aria-label="GoalScore">
          <span class="logo-sm"><img src="assets/images/logo-goalscore-icono-blanco.png" alt="GoalScore" height="24"></span>
          <span class="logo-lg"><img src="assets/images/logo-goalscore-blanco.png" alt="GoalScore" height="30"></span>
        </a>
      </div>
      <div id="scrollbar" style="overflow-y:auto;height:calc(100vh - 70px)">
        <div class="container-fluid">
          <ul class="navbar-nav" id="navbar-nav">
            <li class="menu-title"><span>Menú</span></li>
            <li class="nav-item" *ngFor="let i of items">
              <a class="nav-link menu-link" [routerLink]="i.ruta" routerLinkActive="active">
                <i [class]="i.icono"></i> <span>{{ i.etiqueta }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div class="sidebar-background"></div>
    </div>`,
  styles: [`
    .logo-marca-lateral { line-height: 70px; text-decoration: none; }
    .logo-marca-lateral img { width: auto; vertical-align: middle; }
  `],
})
export class SidebarComponent {
  @Input() items: { etiqueta: string; icono: string; ruta: string }[] = [];
}

@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <div class="container-fluid">
        <div class="row">
          <div class="col-sm-8">© {{ anio }} GoalScore · AcepSistemas todos los derechos reservados.</div>
          <div class="col-sm-4"><div class="text-sm-end d-none d-sm-block">Control de campeonatos y ligas</div></div>
        </div>
      </div>
    </footer>`,
})
export class FooterComponent {
  anio = new Date().getFullYear();
}

