import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CRITERIOS, Campeonato, CriterioDesempate, ESTADOS_CAMPEONATO, EstadoCampeonato, FORMATOS, FormatoCampeonato, Usuario,
} from '../../core/models';
import { toFormData } from '../../core/services/api-utils';
import { AuthService } from '../../core/services/auth.service';
import { CampeonatoService } from '../../core/services/campeonato.service';
import { UsuarioService } from '../../core/services/recursos.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-campeonato-form',
  template: `
    <app-page-title [titulo]="camp ? 'Editar campeonato' : 'Nuevo campeonato'">
      <a routerLink="/admin/campeonatos" class="btn btn-light"><i class="ri-arrow-left-line align-middle"></i> Volver</a>
    </app-page-title>
    <app-estado-lista [cargando]="cargando"></app-estado-lista>
    <form [formGroup]="form" (ngSubmit)="guardar()" *ngIf="!cargando">
      <div class="row">
        <div class="col-xl-8">
          <div class="card">
            <div class="card-header"><h5 class="card-title mb-0">Datos generales</h5></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-8"><label class="form-label">Nombre *</label>
                  <input class="form-control" formControlName="nombre" [class.is-invalid]="form.controls.nombre.touched && form.controls.nombre.invalid"><div class="invalid-feedback">Obligatorio.</div></div>
                <div class="col-md-4"><label class="form-label">Temporada</label><input class="form-control" formControlName="temporada" placeholder="2026"></div>
                <div class="col-12"><label class="form-label">Descripción</label><textarea rows="2" class="form-control" formControlName="descripcion"></textarea></div>
                <div class="col-md-6"><label class="form-label">Fecha de inicio</label><input type="date" class="form-control" formControlName="fecha_inicio"></div>
                <div class="col-md-6"><label class="form-label">Fecha de fin</label><input type="date" class="form-control" formControlName="fecha_fin"></div>
                <div class="col-12"><label class="form-label">Logo</label><app-imagen-input [url]="camp?.logo" (archivoChange)="logo = $event"></app-imagen-input></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h5 class="card-title mb-0">Formato y reglas</h5></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Formato *</label>
                  <select class="form-select" formControlName="formato"><option *ngFor="let f of formatos" [value]="f.valor">{{ f.etiqueta }}</option></select></div>
                <div class="col-md-6 d-flex align-items-end">
                  <div class="text-muted small mb-2"><i class="ri-information-line me-1"></i>Solo ida, ida y vuelta o relámpago se elige al hacer el sorteo.</div></div>
                <ng-container *ngIf="esGrupos">
                  <div class="col-md-6"><label class="form-label">Número de grupos *</label>
                    <input type="number" min="2" class="form-control" formControlName="num_grupos" [class.is-invalid]="form.controls.num_grupos.invalid"><div class="invalid-feedback">Mínimo 2 grupos.</div></div>
                  <div class="col-md-6"><label class="form-label">Clasificados por grupo</label>
                    <input type="number" min="1" class="form-control" formControlName="clasificados_por_grupo"></div>
                </ng-container>
                <div class="col-4"><label class="form-label">Puntos victoria</label><input type="number" min="0" class="form-control" formControlName="puntos_victoria"></div>
                <div class="col-4"><label class="form-label">Puntos empate</label><input type="number" min="0" class="form-control" formControlName="puntos_empate"></div>
                <div class="col-4"><label class="form-label">Puntos derrota</label><input type="number" min="0" class="form-control" formControlName="puntos_derrota"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="card">
            <div class="card-header"><h5 class="card-title mb-0">Publicación</h5></div>
            <div class="card-body">
              <div class="mb-3" *ngIf="auth.esAdmin"><label class="form-label">Propietario</label>
                <select class="form-select" formControlName="propietario">
                  <option [ngValue]="null">Del sistema (sin propietario)</option>
                  <option *ngFor="let o of organizadores" [ngValue]="o.id">{{ o.username }}</option>
                </select>
                <div class="form-text">Quien lo ve y administra. Los equipos de un campeonato deben ser de su mismo propietario.</div></div>
              <div class="mb-3"><label class="form-label">Estado</label>
                <select class="form-select" formControlName="estado"><option *ngFor="let e of estados" [value]="e.valor">{{ e.etiqueta }}</option></select></div>
              <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="c-pub" formControlName="publicado"><label class="form-check-label" for="c-pub">Publicado (visible en el portal y la app)</label></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h5 class="card-title mb-0">Criterios de desempate</h5></div>
            <div class="card-body">
              <p class="text-muted small">Se aplican en este orden cuando hay igualdad de puntos.</p>
              <ol class="list-group list-group-numbered mb-3 lista-ordenable">
                <li class="list-group-item" *ngFor="let c of criterios; let i = index">
                  <span class="flex-grow-1">{{ etiquetaCriterio(c) }}</span>
                  <button type="button" class="btn btn-sm btn-light" (click)="mover(i, -1)" [disabled]="i === 0" aria-label="Subir"><i class="ri-arrow-up-line"></i></button>
                  <button type="button" class="btn btn-sm btn-light" (click)="mover(i, 1)" [disabled]="i === criterios.length - 1" aria-label="Bajar"><i class="ri-arrow-down-line"></i></button>
                  <button type="button" class="btn btn-sm btn-soft-danger" (click)="quitar(i)" aria-label="Quitar"><i class="ri-close-line"></i></button>
                </li>
              </ol>
              <div *ngIf="disponibles.length" class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-soft-primary" *ngFor="let c of disponibles" (click)="criterios.push(c.valor)"><i class="ri-add-line"></i> {{ c.etiqueta }}</button>
              </div>
            </div>
          </div>
          <div class="text-end mb-4">
            <a routerLink="/admin/campeonatos" class="btn btn-light me-2">Cancelar</a>
            <button type="submit" class="btn btn-primary" [disabled]="guardando"><span *ngIf="guardando" class="spinner-border spinner-border-sm me-1"></span>Guardar</button>
          </div>
        </div>
      </div>
    </form>`,
})
export class CampeonatoFormComponent implements OnInit {
  formatos = FORMATOS;
  estados = ESTADOS_CAMPEONATO;
  camp: Campeonato | null = null;
  criterios: CriterioDesempate[] = ['dif_gol', 'goles_favor', 'h2h', 'fair_play'];
  logo: File | null = null;
  cargando = false;
  guardando = false;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    temporada: [''],
    descripcion: [''],
    fecha_inicio: [null as string | null],
    fecha_fin: [null as string | null],
    formato: ['LIGA' as FormatoCampeonato],
    ida_vuelta: [false],
    num_grupos: [2, [Validators.min(2)]],
    clasificados_por_grupo: [2, [Validators.min(1)]],
    puntos_victoria: [3],
    puntos_empate: [1],
    puntos_derrota: [0],
    estado: ['BORRADOR' as EstadoCampeonato],
    publicado: [false],
    propietario: [null as number | null],
  });
  organizadores: Usuario[] = [];

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router,
              private api: CampeonatoService, private toast: ToastService, public auth: AuthService,
              private usuarios: UsuarioService) {}

  get esGrupos() { return this.form.controls.formato.value === 'GRUPOS'; }
  get disponibles() { return CRITERIOS.filter(c => !this.criterios.includes(c.valor)); }
  etiquetaCriterio(v: CriterioDesempate) { return CRITERIOS.find(c => c.valor === v)?.etiqueta ?? v; }

  /** Los campos de grupos sólo aplican (y validan) con formato GRUPOS; ocultos no deben bloquear el guardado. */
  private ajustarGrupos() {
    const c = this.form.controls;
    for (const ctl of [c.num_grupos, c.clasificados_por_grupo]) {
      this.esGrupos ? ctl.enable({ emitEvent: false }) : ctl.disable({ emitEvent: false });
    }
  }

  ngOnInit() {
    this.form.controls.formato.valueChanges.subscribe(() => this.ajustarGrupos());
    this.ajustarGrupos();
    if (this.auth.esAdmin) { this.usuarios.organizadores().subscribe(o => (this.organizadores = o)); }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { return; }
    this.cargando = true;
    this.api.obtener(id).subscribe({
      next: c => {
        this.camp = c;
        this.form.patchValue(c);
        this.ajustarGrupos();
        this.criterios = [...c.criterios_desempate];
        this.cargando = false;
      },
      error: () => this.router.navigate(['/admin/campeonatos']),
    });
  }

  mover(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= this.criterios.length) { return; }
    [this.criterios[i], this.criterios[j]] = [this.criterios[j], this.criterios[i]];
  }

  quitar(i: number) { this.criterios.splice(i, 1); }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.aviso('Revise los campos obligatorios del formulario.'); return; }
    const v = this.form.getRawValue();
    const datos: Record<string, any> = {
      ...v,
      fecha_inicio: v.fecha_inicio || null,
      fecha_fin: v.fecha_fin || null,
      num_grupos: v.formato === 'LIGA' ? 1 : v.num_grupos,
      criterios_desempate: this.criterios,
    };
    if (!this.auth.esAdmin) { delete datos['propietario']; }                       // el servidor lo asigna al organizador
    else if (this.logo && datos['propietario'] == null) { datos['propietario'] = ''; }  // multipart: vacío = sin propietario
    if (this.logo) { datos['logo'] = this.logo; }
    const cuerpo = this.logo ? toFormData(datos) : datos;
    this.guardando = true;
    const req = this.camp ? this.api.actualizar(this.camp.id, cuerpo) : this.api.crear(cuerpo);
    req.subscribe({
      next: c => { this.toast.ok('Campeonato guardado.'); this.router.navigate(['/admin/campeonatos', c.id]); },
      error: () => (this.guardando = false),
    });
  }
}
