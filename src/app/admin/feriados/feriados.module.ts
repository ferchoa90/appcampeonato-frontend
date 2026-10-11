import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { FeriadoFormComponent } from './feriado-form.component';
import { FeriadosComponent } from './feriados.component';

@NgModule({
  declarations: [FeriadosComponent, FeriadoFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: FeriadosComponent }])],
})
export class FeriadosModule {}
