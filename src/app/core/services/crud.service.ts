import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models';
import { armarParams, todasLasPaginas } from './api-utils';

/** Base REST tipada para los recursos de la API. */
export abstract class CrudService<T extends { id: number }> {
  protected readonly url: string;

  constructor(protected http: HttpClient, recurso: string) {
    this.url = `${environment.apiUrl}${recurso}/`;
  }

  listar(filtros: Record<string, any> = {}): Observable<Page<T>> {
    return this.http.get<Page<T>>(this.url, { params: armarParams(filtros) });
  }

  todos(filtros: Record<string, any> = {}): Observable<T[]> {
    return todasLasPaginas<T>(this.http, this.url, filtros);
  }

  obtener(id: number): Observable<T> {
    return this.http.get<T>(`${this.url}${id}/`);
  }

  crear(datos: Partial<T> | FormData): Observable<T> {
    return this.http.post<T>(this.url, datos);
  }

  actualizar(id: number, datos: Partial<T> | FormData): Observable<T> {
    return this.http.patch<T>(`${this.url}${id}/`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`);
  }
}
