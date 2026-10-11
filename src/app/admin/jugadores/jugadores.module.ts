import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { JugadorFormComponent } from './jugador-form.component';
import { JugadoresComponent } from './jugadores.component';

@NgModule({
  declarations: [JugadoresComponent, JugadorFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: JugadoresComponent }])],
})
export class JugadoresModule {}
