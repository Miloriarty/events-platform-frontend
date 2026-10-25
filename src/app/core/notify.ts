import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProblemDetail } from './models';

// Сервисы отвечают ProblemDetail; при ошибке валидации в errors лежат сообщения по полям
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Сервер недоступен. Запущен ли api-gateway на :8080?';
    const body = err.error as ProblemDetail | null;
    if (body && typeof body === 'object') {
      if (body.errors && Object.keys(body.errors).length) {
        return Object.values(body.errors).join('; ');
      }
      if (body.detail) return body.detail;
      if (body.title) return body.title;
    }
    if (err.status === 403) return 'Недостаточно прав';
    if (err.status === 503) return 'Сервис временно недоступен';
    return `Ошибка ${err.status}`;
  }
  return 'Неизвестная ошибка';
}

@Injectable({ providedIn: 'root' })
export class Notify {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000 });
  }

  error(err: unknown): void {
    this.snackBar.open(errorMessage(err), 'Закрыть', {
      duration: 6000,
      panelClass: 'snack-error',
    });
  }
}
