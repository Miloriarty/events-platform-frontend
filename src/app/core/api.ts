import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  Category,
  EventItem,
  EventRequest,
  Location,
  Order,
  OrderRequest,
  Page,
  Registration,
  Ticket,
  User,
} from './models';

// Большинство эндпоинтов отдают PagedModel ({content, page}), а /api/users — сырой Page
// ({content, totalElements, number, ...}); приводим оба к одному виду
function toPage<T>(raw: any): Page<T> {
  if (raw?.page) return raw as Page<T>;
  return {
    content: raw?.content ?? [],
    page: {
      size: raw?.size ?? 0,
      number: raw?.number ?? 0,
      totalElements: raw?.totalElements ?? 0,
      totalPages: raw?.totalPages ?? 0,
    },
  };
}

function pageParams(page: number, size: number): HttpParams {
  return new HttpParams().set('page', page).set('size', size);
}

// Общий CRUD для простых справочников
abstract class Resource<T, R = Partial<T>> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly url: string;

  page(page = 0, size = 10): Observable<Page<T>> {
    return this.http
      .get<unknown>(this.url, { params: pageParams(page, size) })
      .pipe(map(toPage<T>));
  }

  get(id: number): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  create(body: R): Observable<T> {
    return this.http.post<T>(this.url, body);
  }

  update(id: number, body: R): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class EventsApi extends Resource<EventItem, EventRequest> {
  protected readonly url = '/api/events';

  search(title: string): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(`${this.url}/search`, { params: { title } });
  }

  my(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(`${this.url}/my`);
  }
}

@Injectable({ providedIn: 'root' })
export class CategoriesApi extends Resource<Category> {
  protected readonly url = '/api/categories';
}

@Injectable({ providedIn: 'root' })
export class LocationsApi extends Resource<Location> {
  protected readonly url = '/api/locations';
}

@Injectable({ providedIn: 'root' })
export class TicketsApi extends Resource<Ticket> {
  protected readonly url = '/api/tickets';
}

@Injectable({ providedIn: 'root' })
export class UsersApi extends Resource<User> {
  protected readonly url = '/api/users';
}

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/orders';

  page(page = 0, size = 10): Observable<Page<Order>> {
    return this.http
      .get<unknown>(this.url, { params: pageParams(page, size) })
      .pipe(map(toPage<Order>));
  }

  create(body: OrderRequest): Observable<Order> {
    return this.http.post<Order>(this.url, body);
  }

  cancel(id: number): Observable<Order> {
    return this.http.post<Order>(`${this.url}/${id}/cancel`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class RegistrationsApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/registrations';

  page(page = 0, size = 10): Observable<Page<Registration>> {
    return this.http
      .get<unknown>(this.url, { params: pageParams(page, size) })
      .pipe(map(toPage<Registration>));
  }

  byEvent(eventId: number): Observable<Registration[]> {
    return this.http.get<Registration[]>(`${this.url}/event/${eventId}`);
  }

  create(eventId: number, orderItemId: number): Observable<Registration> {
    return this.http.post<Registration>(this.url, { eventId, orderItemId });
  }

  cancel(id: number): Observable<Registration> {
    return this.http.post<Registration>(`${this.url}/${id}/cancel`, {});
  }
}
