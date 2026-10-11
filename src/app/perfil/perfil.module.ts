import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { PerfilComponent } from './perfil.component';

@NgModule({
  declarations: [PerfilComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: PerfilComponent, title: 'Mi perfil · GoalScore' }])],
})
export class PerfilModule {}
