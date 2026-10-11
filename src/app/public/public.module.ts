import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SesionGuard } from '../core/guards/auth.guard';
import { SharedModule } from '../shared/shared.module';
import { CampeonatoPublicoComponent } from './campeonato-publico.component';
import { EquipoPublicoComponent } from './equipo-publico.component';
import { HomeComponent } from './home.component';
import { PartidoPublicoComponent } from './partido-publico.component';
import { PublicLayoutComponent } from './public-layout.component';
import { SeguirBotonComponent } from './seguir-boton.component';

const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent, title: 'GoalScore' },
      { path: 'campeonato/:id', component: CampeonatoPublicoComponent },
      { path: 'equipo/:id', component: EquipoPublicoComponent },
      { path: 'partido/:id', component: PartidoPublicoComponent },
      { path: 'cuenta', loadChildren: () => import('../cuenta/cuenta.module').then(m => m.CuentaModule) },
      { path: 'perfil', canActivate: [SesionGuard], loadChildren: () => import('../perfil/perfil.module').then(m => m.PerfilModule) },
    ],
  },
];

@NgModule({
  declarations: [
    PublicLayoutComponent, HomeComponent, CampeonatoPublicoComponent, EquipoPublicoComponent, PartidoPublicoComponent,
    SeguirBotonComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class PublicModule {}
