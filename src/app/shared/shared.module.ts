import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { VISTAS_CAMPEONATO } from './campeonato-vistas';
import {
  AvisoPostergacionComponent, EscudoComponent, EstadoListaComponent, EstadoPartidoComponent, GaleriaMediosComponent,
  ImagenInputComponent, PageTitleComponent, PartidoCardComponent, TarjetasMiniComponent,
} from './componentes';

const COMPONENTES = [
  EscudoComponent, EstadoPartidoComponent, PartidoCardComponent, ImagenInputComponent, PageTitleComponent,
  EstadoListaComponent, TarjetasMiniComponent, AvisoPostergacionComponent, GaleriaMediosComponent, ...VISTAS_CAMPEONATO,
];

@NgModule({
  declarations: COMPONENTES,
  imports: [CommonModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, ...COMPONENTES],
})
export class SharedModule {}
