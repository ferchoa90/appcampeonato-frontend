import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { InicioGuard, RoleGuard } from '../core/guards/role.guard';
import { AdminLayoutComponent } from '../layouts/admin-layout.component';
import { FooterComponent, SidebarComponent, TopbarComponent } from '../layouts/layout-partes';
import { SharedModule } from '../shared/shared.module';

const SOLO_ADMIN = { roles: ['Administrador', 'Organizador'] };   // el Organizador gestiona lo suyo (el servidor filtra)
const GESTORES = { roles: ['Administrador', 'Organizador', 'Operador'] };

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivateChild: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [InicioGuard], children: [] },
      {
        path: 'dashboard', canActivate: [RoleGuard], data: SOLO_ADMIN, title: 'Dashboard · GoalScore',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
      },
      {
        path: 'equipos', canActivate: [RoleGuard], data: SOLO_ADMIN, title: 'Equipos · GoalScore',
        loadChildren: () => import('./equipos/equipos.module').then(m => m.EquiposModule),
      },
      {
        path: 'jugadores', canActivate: [RoleGuard], data: SOLO_ADMIN, title: 'Jugadores · GoalScore',
        loadChildren: () => import('./jugadores/jugadores.module').then(m => m.JugadoresModule),
      },
      {
        path: 'campeonatos', canActivate: [RoleGuard], data: SOLO_ADMIN, title: 'Campeonatos · GoalScore',
        loadChildren: () => import('./campeonatos/campeonatos.module').then(m => m.CampeonatosModule),
      },
      {
        path: 'partidos', canActivate: [RoleGuard], data: GESTORES, title: 'Partidos · GoalScore',
        loadChildren: () => import('./partidos/partidos.module').then(m => m.PartidosModule),
      },
      {
        path: 'feriados', canActivate: [RoleGuard], data: SOLO_ADMIN, title: 'Feriados · GoalScore',
        loadChildren: () => import('./feriados/feriados.module').then(m => m.FeriadosModule),
      },
      {
        path: 'notificaciones', canActivate: [RoleGuard], data: SOLO_ADMIN, title: 'Notificaciones · GoalScore',
        loadChildren: () => import('./notificaciones/notificaciones.module').then(m => m.NotificacionesModule),
      },
      {
        path: 'configuracion', canActivate: [RoleGuard], data: { roles: ['Administrador'] }, title: 'Configuración · GoalScore',
        loadChildren: () => import('./configuracion/configuracion.module').then(m => m.ConfiguracionModule),
      },
      {
        path: 'usuarios', canActivate: [RoleGuard], data: SOLO_ADMIN, title: 'Usuarios · GoalScore',
        loadChildren: () => import('./usuarios/usuarios.module').then(m => m.UsuariosModule),
      },
    ],
  },
];

@NgModule({
  declarations: [AdminLayoutComponent, TopbarComponent, SidebarComponent, FooterComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
