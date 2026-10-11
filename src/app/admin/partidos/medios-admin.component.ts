import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigPublica, Medio } from '../../core/models';
import { mensajeError } from '../../core/services/api-utils';
import { CuentaService, MedioService } from '../../core/services/cuenta.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';

interface Subida {
  archivo: File;
  tipo: 'IMAGEN' | 'VIDEO';
  estado: 'subiendo' | 'ok' | 'error';
  progreso: number;
  error: string;
}

const ACEPTA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';

/** Fotos y videos de un partido (sólo Administrador y Organizador): subida múltiple con progreso, título y borrado. */
@Component({
  selector: 'app-medios-admin',
  template: `
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 class="card-title mb-0">Fotos y videos</h5>
        <div class="small text-muted" *ngIf="limites">
          <span id="cont-imagenes" class="badge" [ngClass]="llenoImagenes ? 'badge-soft-danger' : 'badge-soft-secondary'">{{ numImagenes }}/{{ limites.max_imagenes_partido }} imágenes</span>
          <span id="cont-videos" class="badge ms-1" [ngClass]="llenoVideos ? 'badge-soft-danger' : 'badge-soft-secondary'">{{ numVideos }}/{{ limites.max_videos_partido }} videos</span>
        </div>
      </div>
      <div class="card-body">
        <label class="zona-subida" [class.arrastrando]="arrastrando" (dragover)="sobre($event)" (dragleave)="arrastrando = false" (drop)="soltar($event)">
          <i class="ri-upload-cloud-2-line fs-1"></i>
          <span class="fw-medium">Arrastre archivos aquí o haga clic para elegirlos</span>
          <span class="small text-muted" *ngIf="limites">Imágenes JPG, PNG, WebP o GIF (máx. {{ limites.max_mb_imagen }} MB) · Videos MP4, MOV o WebM (máx. {{ limites.max_mb_video }} MB)</span>
          <input type="file" multiple [accept]="acepta" (change)="elegir($event)" class="d-none" id="medios-input">
        </label>

        <ul class="list-group list-group-flush mt-3" *ngIf="subidas.length">
          <li class="list-group-item px-0" *ngFor="let s of subidas">
            <div class="d-flex align-items-center gap-2">
              <i [class]="s.tipo === 'VIDEO' ? 'ri-video-line' : 'ri-image-line'" class="fs-5 text-muted"></i>
              <span class="flex-grow-1 text-truncate">{{ s.archivo.name }} <span class="text-muted small">({{ mb(s.archivo.size) }} MB)</span></span>
              <span *ngIf="s.estado === 'ok'" class="badge badge-soft-success">Subido</span>
              <span *ngIf="s.estado === 'error'" class="badge badge-soft-danger">Error</span>
              <span *ngIf="s.estado === 'subiendo'" class="small">{{ s.progreso }}%</span>
            </div>
            <div class="progress mt-1" style="height:6px" *ngIf="s.estado === 'subiendo'"><div class="progress-bar" [style.width.%]="s.progreso"></div></div>
            <div class="text-danger small mt-1 error-subida" *ngIf="s.estado === 'error'">{{ s.error }}</div>
          </li>
        </ul>
        <button type="button" class="btn btn-sm btn-light mt-2" *ngIf="hayTerminadas" (click)="limpiarLista()">Limpiar lista</button>

        <h6 class="mt-4">Archivos del partido</h6>
        <app-estado-lista [vacio]="!medios.length" mensaje="Aún no hay fotos ni videos."></app-estado-lista>
        <div class="row g-3" *ngIf="medios.length">
          <div class="col-sm-6 col-md-4" *ngFor="let m of medios">
            <div class="medio-admin">
              <div class="medio-vista">
                <img *ngIf="m.tipo === 'IMAGEN'; else vid" [src]="m.archivo" [alt]="m.titulo || m.nombre_archivo" loading="lazy">
                <ng-template #vid><i class="ri-movie-line"></i></ng-template>
              </div>
              <div class="p-2">
                <input class="form-control form-control-sm" [value]="m.titulo" placeholder="Título (opcional)" maxlength="150"
                       (change)="guardarTitulo(m, $any($event.target).value)" (keyup.enter)="$any($event.target).blur()">
                <div class="d-flex justify-content-between align-items-center mt-1">
                  <span class="small text-muted text-truncate">{{ m.tipo === 'VIDEO' ? 'Video' : 'Imagen' }} · {{ mb(m.tamano) }} MB</span>
                  <button type="button" class="btn btn-sm btn-soft-danger" (click)="eliminar(m)" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`,
})
export class MediosAdminComponent implements OnInit {
  @Input() partidoId!: number;
  @Input() medios: Medio[] = [];
  /** Se emite cuando hay que volver a cargar el partido (subida, título o borrado). */
  @Output() cambio = new EventEmitter<void>();
  limites: ConfigPublica['limites'] | null = null;
  subidas: Subida[] = [];
  arrastrando = false;
  acepta = ACEPTA;

  constructor(private api: MedioService, private cuenta: CuentaService, private dialogo: DialogService, private toast: ToastService) {}

  get numImagenes() { return this.medios.filter(m => m.tipo === 'IMAGEN').length; }
  get numVideos() { return this.medios.filter(m => m.tipo === 'VIDEO').length; }
  get llenoImagenes() { return !!this.limites && this.numImagenes >= this.limites.max_imagenes_partido; }
  get llenoVideos() { return !!this.limites && this.numVideos >= this.limites.max_videos_partido; }
  get hayTerminadas() { return this.subidas.some(s => s.estado !== 'subiendo'); }

  ngOnInit() { this.cuenta.configPublica(true).subscribe(c => (this.limites = c.limites)); }

  mb(bytes: number) { return (bytes / 1048576).toFixed(bytes >= 10485760 ? 0 : 1); }

  sobre(e: DragEvent) { e.preventDefault(); this.arrastrando = true; }

  soltar(e: DragEvent) {
    e.preventDefault();
    this.arrastrando = false;
    this.procesar(Array.from(e.dataTransfer?.files ?? []));
  }

  elegir(e: Event) {
    const input = e.target as HTMLInputElement;
    this.procesar(Array.from(input.files ?? []));
    input.value = '';
  }

  limpiarLista() { this.subidas = this.subidas.filter(s => s.estado === 'subiendo'); }

  /** Valida cantidad, tipo y peso en el cliente (el servidor vuelve a validar) y sube en orden, uno a uno. */
  private async procesar(archivos: File[]) {
    if (!archivos.length) { return; }
    const lim = this.limites ?? (await firstValueFrom(this.cuenta.configPublica(true))).limites;
    this.limites = lim;
    let imgs = this.numImagenes;
    let vids = this.numVideos;
    const aSubir: Subida[] = [];
    for (const f of archivos) {
      const tipo = f.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(f.name) ? 'VIDEO'
        : f.type.startsWith('image/') ? 'IMAGEN' : null;
      const s: Subida = { archivo: f, tipo: tipo ?? 'IMAGEN', estado: 'error', progreso: 0, error: '' };
      if (!tipo) { s.error = 'Tipo de archivo no admitido. Use imágenes (JPG, PNG, WebP, GIF) o videos (MP4, MOV, WebM).'; }
      else if (f.size > (tipo === 'VIDEO' ? lim.max_mb_video : lim.max_mb_imagen) * 1048576) {
        s.error = `El archivo pesa ${this.mb(f.size)} MB y el máximo para ${tipo === 'VIDEO' ? 'videos' : 'imágenes'} es ${tipo === 'VIDEO' ? lim.max_mb_video : lim.max_mb_imagen} MB.`;
      } else if (tipo === 'IMAGEN' && imgs >= lim.max_imagenes_partido) { s.error = `Se alcanzó el máximo de ${lim.max_imagenes_partido} imágenes por partido.`; }
      else if (tipo === 'VIDEO' && vids >= lim.max_videos_partido) { s.error = `Se alcanzó el máximo de ${lim.max_videos_partido} videos por partido.`; }
      else {
        s.estado = 'subiendo';
        tipo === 'VIDEO' ? vids++ : imgs++;
        aSubir.push(s);
      }
      this.subidas = [...this.subidas, s];
    }
    let algunoOk = false;
    for (const s of aSubir) { algunoOk = (await this.subir(s)) || algunoOk; }
    if (algunoOk) { this.toast.ok('Archivos subidos.'); this.cambio.emit(); }
  }

  private subir(s: Subida): Promise<boolean> {
    return new Promise(ok => {
      this.api.subir(this.partidoId, s.archivo).subscribe({
        next: ev => {
          if (ev.type === HttpEventType.UploadProgress && ev.total) { s.progreso = Math.round((100 * ev.loaded) / ev.total); }
          if (ev.type === HttpEventType.Response) { s.estado = 'ok'; s.progreso = 100; ok(true); }
        },
        error: (e: HttpErrorResponse) => {
          s.estado = 'error';
          const motivo = e.error?.archivo;
          s.error = Array.isArray(motivo) ? motivo.join(' ') : (typeof motivo === 'string' ? motivo : (e.error?.detail ?? mensajeError(e)));
          ok(false);
        },
      });
    });
  }

  guardarTitulo(m: Medio, titulo: string) {
    const t = titulo.trim();
    if (t === m.titulo) { return; }
    this.api.titulo(m.id, t).subscribe(r => { m.titulo = r.titulo; this.toast.ok('Título guardado.'); });
  }

  async eliminar(m: Medio) {
    if (!(await this.dialogo.confirmar('¿Eliminar este archivo?', 'Se borrará también el archivo del servidor.', 'Eliminar', true))) { return; }
    this.api.eliminar(m.id).subscribe(() => { this.toast.ok('Archivo eliminado.'); this.cambio.emit(); });
  }
}
