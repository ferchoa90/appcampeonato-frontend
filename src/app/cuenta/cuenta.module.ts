import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { BotonGoogleComponent } from './boton-google.component';
import { IngresarComponent } from './ingresar.component';
import { OlvideClaveComponent, RestablecerClaveComponent, VerificarCorreoComponent } from './recuperar.component';
import { RegistroAficionadoComponent } from './registro-aficionado.component';

const routes: Routes = [
  { path: 'ingresar', component: IngresarComponent, title: 'Ingresar · GoalScore' },
  { path: 'registro', component: RegistroAficionadoComponent, title: 'Crear cuenta · GoalScore' },
  { path: 'verificar', component: VerificarCorreoComponent, title: 'Confirmar correo · GoalScore' },
  { path: 'olvide', component: OlvideClaveComponent, title: 'Recuperar contraseña · GoalScore' },
  { path: 'restablecer', component: RestablecerClaveComponent, title: 'Nueva contraseña · GoalScore' },
  { path: '', redirectTo: 'ingresar', pathMatch: 'full' },
];

@NgModule({
  declarations: [
    BotonGoogleComponent, IngresarComponent, RegistroAficionadoComponent, VerificarCorreoComponent, OlvideClaveComponent,
    RestablecerClaveComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CuentaModule {}
