import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { LoginComponent } from './login.component';
import { RegistroComponent } from './registro.component';

@NgModule({
  declarations: [LoginComponent, RegistroComponent],
  imports: [SharedModule, RouterModule.forChild([
    { path: 'login', component: LoginComponent },
    { path: 'registro', component: RegistroComponent },
    { path: '', redirectTo: 'login', pathMatch: 'full' },
  ])],
})
export class AuthModule {}
