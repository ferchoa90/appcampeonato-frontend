import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConteoTarjetas, EquipoMini, Medio, Partido, claseEstadoPartido, etiquetaEstadoPartido } from '../core/models';

/** Escudo del equipo: imagen o círculo de color con la abreviatura. */
@Component({
  selector: 'app-escudo',
  template: `
    <img *ngIf="equipo?.escudo; else sinEscudo" [src]="equipo!.escudo!" [alt]="equipo!.nombre" class="escudo"
         [style.width.px]="tam" [style.height.px]="tam">
    <ng-template #sinEscudo>
      <span class="escudo escudo-inicial" [style.background]="equipo?.color_principal || '#405189'"
            [style.width.px]="tam" [style.height.px]="tam" [style.font-size.px]="tam * 0.36">
        {{ (equipo?.abreviatura || equipo?.nombre || '?') | slice:0:3 }}
      </span>
    </ng-template>`,
})
export class EscudoComponent {
  @Input() equipo: EquipoMini | null | undefined;
  @Input() tam = 32;
}

@Component({
  selector: 'app-estado-partido',
  template: `<span class="badge" [ngClass]="'badge-soft-' + clase">
      <span *ngIf="estado === 'INICIADO' || estado === 'SEGUNDO_TIEMPO'" class="punto-vivo"></span>{{ etiqueta }}</span>`,
})
export class EstadoPartidoComponent {
  @Input() estado = 'PENDIENTE';
  get clase() { return claseEstadoPartido(this.estado); }
  get etiqueta() { return etiquetaEstadoPartido(this.estado); }
}

/** Contadores de tarjetas amarillas/rojas (sólo los mayores que 0). */
@Component({
  selector: 'app-tarjetas-mini',
  template: `
    <span class="tarjetas-mini" *ngIf="t && (t.amarillas > 0 || t.rojas > 0)">
      <span *ngIf="t.amarillas > 0" class="tj-conteo" title="Amarillas"><i class="tj tj-amarilla"></i>{{ t.amarillas }}</span>
      <span *ngIf="t.rojas > 0" class="tj-conteo" title="Rojas"><i class="tj tj-roja"></i>{{ t.rojas }}</span>
    </span>`,
})
export class TarjetasMiniComponent {
  @Input() t: ConteoTarjetas | null | undefined;
}

/** Datos de postergación / reprogramación de un partido. */
@Component({
  selector: 'app-aviso-postergacion',
  template: `
    <div class="aviso-posterga" *ngIf="partido.estado === 'POSTERGADO'">
      <div><i class="ri-time-line"></i> <b>Postergado</b><ng-container *ngIf="partido.motivo_postergacion">: {{ partido.motivo_postergacion }}</ng-container></div>
      <div *ngIf="partido.fecha_hora; else porDefinir">Nueva fecha: {{ partido.fecha_hora | date:'EEE d MMM, HH:mm' }}</div>
      <ng-template #porDefinir><div>Nueva fecha por definir</div></ng-template>
      <div class="text-muted" *ngIf="partido.fecha_original">Fecha original: {{ partido.fecha_original | date:'EEE d MMM, HH:mm' }}</div>
    </div>
    <div class="aviso-reprogramado" *ngIf="partido.estado !== 'POSTERGADO' && partido.fecha_original">
      <i class="ri-calendar-event-line"></i> Reprogramado (antes: {{ partido.fecha_original | date:'EEE d MMM, HH:mm' }})
    </div>`,
})
export class AvisoPostergacionComponent {
  @Input() partido!: Partido;
}

/** Tarjeta de partido para el portal público. */
@Component({
  selector: 'app-partido-card',
  template: `
    <a class="partido-card" [routerLink]="['/partido', partido.id]">
      <div class="partido-meta">
        <span>{{ partido.fecha_nombre }}<ng-container *ngIf="partido.grupo_nombre"> · {{ partido.grupo_nombre }}</ng-container></span>
        <app-estado-partido [estado]="partido.estado"></app-estado-partido>
      </div>
      <div class="partido-fila">
        <div class="partido-equipo"><app-escudo [equipo]="partido.local_detalle" [tam]="34"></app-escudo><span>{{ partido.local_detalle.nombre }}</span><app-tarjetas-mini [t]="partido.tarjetas?.local"></app-tarjetas-mini></div>
        <div class="partido-marcador" [class.pendiente]="sinJugar">
          <ng-container *ngIf="!sinJugar; else vs">{{ partido.goles_local }} - {{ partido.goles_visitante }}</ng-container>
          <ng-template #vs>vs</ng-template>
        </div>
        <div class="partido-equipo derecha"><app-tarjetas-mini [t]="partido.tarjetas?.visitante"></app-tarjetas-mini><span>{{ partido.visitante_detalle.nombre }}</span><app-escudo [equipo]="partido.visitante_detalle" [tam]="34"></app-escudo></div>
      </div>
      <app-aviso-postergacion [partido]="partido"></app-aviso-postergacion>
      <div class="partido-pie" *ngIf="(partido.fecha_hora && partido.estado !== 'POSTERGADO') || partido.estadio">
        <span *ngIf="partido.fecha_hora && partido.estado !== 'POSTERGADO'"><i class="ri-calendar-line"></i> {{ partido.fecha_hora | date:'EEE d MMM, HH:mm' }}</span>
        <span *ngIf="partido.estadio"><i class="ri-map-pin-line"></i> {{ partido.estadio }}</span>
      </div>
      <div class="partido-pie" *ngIf="partido.penales_local !== null && partido.penales_visitante !== null">
        Penales: {{ partido.penales_local }} - {{ partido.penales_visitante }}
      </div>
      <div class="partido-pie" *ngIf="(partido.num_imagenes || 0) > 0 || (partido.num_videos || 0) > 0">
        <span *ngIf="partido.num_imagenes" title="Fotos"><i class="ri-camera-line"></i> {{ partido.num_imagenes }}</span>
        <span *ngIf="partido.num_videos" title="Videos"><i class="ri-video-line"></i> {{ partido.num_videos }}</span>
      </div>
    </a>`,
})
export class PartidoCardComponent {
  @Input() partido!: Partido;
  get sinJugar() { return this.partido.estado === 'PENDIENTE' || this.partido.estado === 'POSTERGADO'; }
}

/** Galería de fotos (con visor ampliado: flechas y ESC) y videos de un partido. */
@Component({
  selector: 'app-galeria-medios',
  template: `
    <app-estado-lista [vacio]="!imagenes.length && !videos.length" mensaje="Todavía no hay fotos ni videos de este partido."></app-estado-lista>
    <div class="galeria" *ngIf="imagenes.length">
      <button type="button" class="galeria-item" *ngFor="let m of imagenes; let i = index" (click)="abrir(i)" [attr.aria-label]="'Ampliar ' + (m.titulo || 'foto ' + (i + 1))">
        <img [src]="m.archivo" [alt]="m.titulo || 'Foto del partido'" loading="lazy">
        <span class="galeria-titulo" *ngIf="m.titulo">{{ m.titulo }}</span>
      </button>
    </div>
    <div class="row g-3 mt-1" *ngIf="videos.length">
      <div class="col-md-6" *ngFor="let v of videos">
        <video class="galeria-video" controls preload="metadata" [src]="v.archivo"></video>
        <div class="small text-muted mt-1" *ngIf="v.titulo">{{ v.titulo }}</div>
      </div>
    </div>

    <div class="visor" *ngIf="imagenActual as img" (click)="cerrar()" role="dialog" aria-modal="true">
      <button type="button" class="visor-cerrar" (click)="cerrar()" aria-label="Cerrar"><i class="ri-close-line"></i></button>
      <button type="button" class="visor-flecha izq" *ngIf="imagenes.length > 1" (click)="mover(-1); $event.stopPropagation()" aria-label="Anterior"><i class="ri-arrow-left-s-line"></i></button>
      <figure (click)="$event.stopPropagation()">
        <img [src]="img.archivo" [alt]="img.titulo || 'Foto del partido'">
        <figcaption>{{ img.titulo }} <span class="text-white-50">{{ (actual ?? 0) + 1 }} / {{ imagenes.length }}</span></figcaption>
      </figure>
      <button type="button" class="visor-flecha der" *ngIf="imagenes.length > 1" (click)="mover(1); $event.stopPropagation()" aria-label="Siguiente"><i class="ri-arrow-right-s-line"></i></button>
    </div>`,
  host: { '(document:keydown)': 'tecla($event)' },
})
export class GaleriaMediosComponent {
  @Input() set medios(v: Medio[] | null | undefined) {
    this._medios = v ?? [];
    this.imagenes = this._medios.filter(m => m.tipo === 'IMAGEN');
    this.videos = this._medios.filter(m => m.tipo === 'VIDEO');
    if (this.actual !== null && this.actual >= this.imagenes.length) { this.actual = null; }
  }
  get medios() { return this._medios; }
  get imagenActual(): Medio | null { return this.actual === null ? null : (this.imagenes[this.actual] ?? null); }
  imagenes: Medio[] = [];
  videos: Medio[] = [];
  actual: number | null = null;
  private _medios: Medio[] = [];

  abrir(i: number) { this.actual = i; }
  cerrar() { this.actual = null; }
  mover(d: number) {
    if (this.actual === null || !this.imagenes.length) { return; }
    this.actual = (this.actual + d + this.imagenes.length) % this.imagenes.length;
  }
  tecla(e: KeyboardEvent) {
    if (this.actual === null) { return; }
    if (e.key === 'Escape') { this.cerrar(); }
    else if (e.key === 'ArrowLeft') { this.mover(-1); }
    else if (e.key === 'ArrowRight') { this.mover(1); }
  }
}

/** Selector de imagen con vista previa. Emite el archivo elegido. */
@Component({
  selector: 'app-imagen-input',
  template: `
    <div class="d-flex align-items-center gap-3">
      <img *ngIf="vista" [src]="vista" alt="Vista previa" class="rounded border" style="width:64px;height:64px;object-fit:cover">
      <div *ngIf="!vista" class="rounded border d-flex align-items-center justify-content-center text-muted" style="width:64px;height:64px">
        <i class="ri-image-line fs-4"></i>
      </div>
      <input type="file" class="form-control" accept="image/*" (change)="elegir($event)">
    </div>`,
})
export class ImagenInputComponent {
  @Input() set url(v: string | null | undefined) { if (!this.archivo) { this.vista = v ?? null; } }
  @Output() archivoChange = new EventEmitter<File | null>();
  vista: string | null = null;
  private archivo: File | null = null;

  elegir(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivo = f;
    this.archivoChange.emit(f);
    if (f) {
      const lector = new FileReader();
      lector.onload = () => (this.vista = lector.result as string);
      lector.readAsDataURL(f);
    }
  }
}

@Component({
  selector: 'app-page-title',
  template: `
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0">{{ titulo }}</h4>
          <div class="page-title-right"><ng-content></ng-content></div>
        </div>
      </div>
    </div>`,
})
export class PageTitleComponent {
  @Input() titulo = '';
}

/** Indicador de carga / vacío. */
@Component({
  selector: 'app-estado-lista',
  template: `
    <div *ngIf="cargando" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>
    <div *ngIf="!cargando && vacio" class="text-center text-muted py-5"><i class="ri-inbox-line fs-1 d-block"></i>{{ mensaje }}</div>`,
})
export class EstadoListaComponent {
  @Input() cargando = false;
  @Input() vacio = false;
  @Input() mensaje = 'No hay información para mostrar.';
}
