import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { EquipoFormComponent } from './equipo-form.component';
import { EquiposComponent } from './equipos.component';

@NgModule({
  declarations: [EquiposComponent, EquipoFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: EquiposComponent }])],
})
export class EquiposModule {}
