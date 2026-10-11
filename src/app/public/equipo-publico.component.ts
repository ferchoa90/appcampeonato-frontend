import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Equipo, Jugador, POSICIONES, Partido } from '../core/models';
import { EquipoService, JugadorService, PartidoService } from '../core/services/recursos.service';

@Component({
  selector: 'app-equipo-publico',
  template: `
    <div class="pub-contenedor pub-cuerpo">
      <app-estado-lista [cargando]="!equipo && !noExiste" [vacio]="noExiste" mensaje="El equipo no existe."></app-estado-lista>
      <ng-container *ngIf="equipo">
        <a routerLink="/" class="text-muted small"><i class="ri-arrow-left-line"></i> Inicio</a>
        <div class="cabecera-campeonato">
          <app-escudo [equipo]="equipo" [tam]="88"></app-escudo>
          <div class="flex-grow-1">
            <h2 class="mb-1">{{ equipo.nombre }}</h2>
            <div class="text-muted">
              <span *ngIf="equipo.ciudad"><i class="ri-map-pin-line"></i> {{ equipo.ciudad }} </span>
              <span *ngIf="equipo.estadio" class="ms-2"><i class="ri-building-line"></i> {{ equipo.estadio }} </span>
              <span *ngIf="equipo.entrenador" class="ms-2"><i class="ri-user-star-line"></i> DT: {{ equipo.entrenador }}</span>
            </div>
          </div>
          <app-seguir-boton tipo="equipo" [id]="equipo.id" [nombre]="equipo.nombre"></app-seguir-boton>
        </div>

        <div class="row g-4 mt-1">
          <div class="col-lg-6">
            <h5 class="titulo-seccion">Plantel</h5>
            <app-estado-lista [vacio]="!jugadores.length" mensaje="Aún no hay jugadores registrados."></app-estado-lista>
            <div *ngFor="let g of porPosicion" class="mb-3">
              <div class="text-muted small text-uppercase fw-semibold mb-1">{{ g.titulo }}</div>
              <div class="jugador-fila" *ngFor="let j of g.jugadores">
                <span class="dorsal">{{ j.numero ?? '–' }}</span>
                <img *ngIf="j.foto; else ini" [src]="j.foto" class="rounded-circle" width="34" height="34" style="object-fit:cover" alt="">
                <ng-template #ini><span class="avatar-xs"><span class="avatar-title rounded-circle badge-soft-primary">{{ j.nombres.charAt(0) }}</span></span></ng-template>
                <span>{{ j.nombre_completo }}</span>
              </div>
            </div>
          </div>
          <div class="col-lg-6">
            <h5 class="titulo-seccion">Partidos</h5>
            <app-estado-lista [vacio]="!partidos.length" mensaje="No hay partidos registrados."></app-estado-lista>
            <app-partido-card *ngFor="let p of partidos" [partido]="p"></app-partido-card>
          </div>
        </div>
      </ng-container>
    </div>`,
})
export class EquipoPublicoComponent implements OnInit {
  equipo: Equipo | null = null;
  noExiste = false;
  jugadores: Jugador[] = [];
  partidos: Partido[] = [];
  porPosicion: { titulo: string; jugadores: Jugador[] }[] = [];

  constructor(private route: ActivatedRoute, private equipos: EquipoService, private jugs: JugadorService, private parts: PartidoService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(p => {
      const id = Number(p.get('id'));
      this.equipo = null;
      this.noExiste = false;
      this.equipos.obtener(id).subscribe({ next: e => (this.equipo = e), error: () => (this.noExiste = true) });
      this.jugs.todos({ equipo: id, activo: true }).subscribe(js => {
        this.jugadores = js;
        this.porPosicion = POSICIONES
          .map(pos => ({ titulo: pos.plural, jugadores: js.filter(j => j.posicion === pos.valor) }))
          .filter(g => g.jugadores.length);
      });
      this.parts.todos({ equipo: id }).subscribe(ps => (this.partidos = ps));
    });
  }
}
