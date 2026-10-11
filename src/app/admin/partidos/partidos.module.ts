import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { GestionarPartidoComponent } from './gestionar-partido.component';
import { PartidoEditarComponent } from './partido-editar.component';
import { MediosAdminComponent } from './medios-admin.component';
import { PartidosComponent } from './partidos.component';
import { PostergarModalComponent } from './postergar-modal.component';

const routes: Routes = [
  { path: '', component: PartidosComponent },
  { path: ':id', component: GestionarPartidoComponent },
];

@NgModule({
  declarations: [PartidosComponent, PartidoEditarComponent, GestionarPartidoComponent, PostergarModalComponent, MediosAdminComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class PartidosModule {}
