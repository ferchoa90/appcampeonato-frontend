import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, expand, map, reduce, EMPTY } from 'rxjs';
import { Page } from '../models';

/** Peticiones con este contexto no muestran toast de error (las gestiona el llamador). */
export const SILENT = new HttpContextToken<boolean>(() => false);
export const silentContext = () => new HttpContext().set(SILENT, true);

/** Convierte un objeto a FormData descartando null/undefined. */
export function toFormData(datos: Record<string, any>): FormData {
  const fd = new FormData();
  Object.entries(datos).forEach(([k, v]) => {
    if (v === null || v === undefined) { return; }
    if (v instanceof File) { fd.append(k, v); }
    else if (typeof v === 'boolean') { fd.append(k, v ? 'true' : 'false'); }
    else if (typeof v === 'object') { fd.append(k, JSON.stringify(v)); }
    else { fd.append(k, String(v)); }
  });
  return fd;
}

/** Quita los campos de imagen que no son un archivo nuevo (URL existente o vacíos). */
export function sinImagenesNoModificadas(datos: Record<string, any>, campos: string[]): Record<string, any> {
  const copia: Record<string, any> = { ...datos };
  campos.forEach(c => { if (!(copia[c] instanceof File)) { delete copia[c]; } });
  return copia;
}

export function armarParams(filtros: Record<string, any> = {}): HttpParams {
  let p = new HttpParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') { p = p.set(k, String(v)); }
  });
  return p;
}

/** Recorre todas las páginas de un listado paginado de DRF. */
export function todasLasPaginas<T>(http: HttpClient, url: string, filtros: Record<string, any> = {}): Observable<T[]> {
  const pedir = (pagina: number) => http.get<Page<T>>(url, { params: armarParams({ ...filtros, page: pagina }) });
  let n = 1;
  return pedir(1).pipe(
    expand(r => (r.next ? pedir(++n) : EMPTY)),
    map(r => r.results),
    reduce((acc, r) => acc.concat(r), [] as T[]),
  );
}

/** Descarga un Blob como archivo (URL temporal + <a download>), revocando la URL después. */
export function descargarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nombre de archivo seguro a partir de un texto libre. */
export function nombreArchivo(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'campeonato';
}

/** Extrae un mensaje legible de un error de DRF. */
export function mensajeError(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) { return 'Ocurrió un error inesperado.'; }
  if (err.status === 0) { return 'No hay conexión con el servidor.'; }
  if (err.status >= 500) { return 'Error del servidor. Intente más tarde.'; }
  if (err.status === 403) { return 'No tiene permisos para esta acción.'; }
  const e = err.error;
  if (typeof e === 'string' && e.length < 300 && !e.startsWith('<')) { return e; }
  if (e && typeof e === 'object') {
    if (typeof e.detail === 'string') { return e.detail; }
    const partes: string[] = [];
    Object.entries(e).forEach(([campo, msg]) => {
      const texto = Array.isArray(msg) ? msg.join(' ') : String(msg);
      partes.push(campo === 'non_field_errors' ? texto : `${campo}: ${texto}`);
    });
    if (partes.length) { return partes.join(' | '); }
  }
  return 'No se pudo completar la operación.';
}
