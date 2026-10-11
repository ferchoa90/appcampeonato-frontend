import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';

interface ItemMenu {
  etiqueta: string;
  icono: string;
  ruta: string;
  roles: ('Administrador' | 'Organizador' | 'Operador')[];
  /** Etiqueta alternativa para el Organizador. */
  etiquetaOrganizador?: string;
}

const ATRIBUTOS: Record<string, string> = {
  'data-layout': 'vertical',
  'data-topbar': 'light',
  'data-sidebar': 'dark',
  'data-layout-style': 'default',
  'data-layout-width': 'fluid',
  'data-layout-position': 'fixed',
  'data-sidebar-image': 'none',
  'data-preloader': 'disable',
};

/** Layout Velzon vertical: topbar + sidebar + contenido + footer. */
@Component({
  selector: 'app-admin-layout',
  template: `
    <div id="layout-wrapper">
      <app-topbar (alternarMenu)="alternarMenu()"></app-topbar>
      <app-sidebar [items]="items"></app-sidebar>
      <div class="vertical-overlay" (click)="cerrarMenuMovil()"></div>
      <div class="main-content">
        <div class="page-content">
          <div class="container-fluid"><router-outlet></router-outlet></div>
        </div>
        <app-footer></app-footer>
      </div>
    </div>`,
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  items: ItemMenu[] = [];
  private sub?: Subscription;

  constructor(private auth: AuthService, private router: Router, private _tema: ThemeService) {}

  ngOnInit() {
    const root = document.documentElement;
    Object.entries(ATRIBUTOS).forEach(([k, v]) => root.setAttribute(k, v));
    this.ajustarTamano();
    this.items = MENU.filter(i => this.auth.tieneRol(...i.roles)).map(i => ({
      ...i, etiqueta: this.auth.esOrganizador && !this.auth.esAdmin && i.etiquetaOrganizador ? i.etiquetaOrganizador : i.etiqueta,
    }));
    this.sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.cerrarMenuMovil());
  }

  ngOnDestroy() {
    Object.keys(ATRIBUTOS).forEach(k => document.documentElement.removeAttribute(k));
    document.documentElement.removeAttribute('data-sidebar-size');
    document.body.classList.remove('vertical-sidebar-enable');
    this.sub?.unsubscribe();
  }

  @HostListener('window:resize')
  ajustarTamano() {
    const w = document.documentElement.clientWidth;
    document.documentElement.setAttribute('data-sidebar-size', w <= 767 ? 'lg' : w <= 1024 ? 'sm' : 'lg');
  }

  alternarMenu() {
    const root = document.documentElement;
    if (root.clientWidth > 767) {
      root.setAttribute('data-sidebar-size', root.getAttribute('data-sidebar-size') === 'sm' ? 'lg' : 'sm');
    } else {
      document.body.classList.toggle('vertical-sidebar-enable');
    }
  }

  cerrarMenuMovil() { document.body.classList.remove('vertical-sidebar-enable'); }
}

const MENU: ItemMenu[] = [
  { etiqueta: 'Dashboard', icono: 'ri-dashboard-2-line', ruta: '/admin/dashboard', roles: ['Administrador', 'Organizador'] },
  { etiqueta: 'Campeonatos', icono: 'ri-trophy-line', ruta: '/admin/campeonatos', roles: ['Administrador', 'Organizador'], etiquetaOrganizador: 'Mis campeonatos' },
  { etiqueta: 'Equipos', icono: 'ri-shield-star-line', ruta: '/admin/equipos', roles: ['Administrador', 'Organizador'], etiquetaOrganizador: 'Mis equipos' },
  { etiqueta: 'Jugadores', icono: 'ri-run-line', ruta: '/admin/jugadores', roles: ['Administrador', 'Organizador'] },
  { etiqueta: 'Partidos', icono: 'ri-football-line', ruta: '/admin/partidos', roles: ['Administrador', 'Organizador', 'Operador'] },
  { etiqueta: 'Feriados', icono: 'ri-calendar-event-line', ruta: '/admin/feriados', roles: ['Administrador', 'Organizador'] },
  { etiqueta: 'Notificaciones', icono: 'ri-notification-3-line', ruta: '/admin/notificaciones', roles: ['Administrador', 'Organizador'] },
  { etiqueta: 'Configuración', icono: 'ri-settings-3-line', ruta: '/admin/configuracion', roles: ['Administrador'] },
  { etiqueta: 'Usuarios', icono: 'ri-user-settings-line', ruta: '/admin/usuarios', roles: ['Administrador', 'Organizador'], etiquetaOrganizador: 'Mis operadores' },
];
