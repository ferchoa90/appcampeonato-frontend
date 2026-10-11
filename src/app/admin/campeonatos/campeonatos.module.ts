import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CampeonatoDetalleComponent } from './campeonato-detalle.component';
import { CampeonatoFormComponent } from './campeonato-form.component';
import { CampeonatosComponent } from './campeonatos.component';
import { HorariosFijosModalComponent } from './horarios-fijos-modal.component';
import { ProgramarRondaModalComponent } from './programar-ronda-modal.component';

const routes: Routes = [
  { path: '', component: CampeonatosComponent },
  { path: 'nuevo', component: CampeonatoFormComponent },
  { path: ':id', component: CampeonatoDetalleComponent },
  { path: ':id/editar', component: CampeonatoFormComponent },
];

@NgModule({
  declarations: [CampeonatosComponent, CampeonatoFormComponent, CampeonatoDetalleComponent, ProgramarRondaModalComponent,
    HorariosFijosModalComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CampeonatosModule {}
