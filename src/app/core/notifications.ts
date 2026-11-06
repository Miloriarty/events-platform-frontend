import { DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { NotificationsApi } from './api';
import { AuthService } from './auth';
import { AppNotification } from './models';

const STREAM_URL = '/api/notifications/stream';
const RECONNECT_MS = 5000;
const RECENT_LIMIT = 10;

export interface SseMessage {
  event: string;
  data: string;
}

// Блок SSE: строки event:/data:, разделитель блоков - пустая строка; строки с «:» - комментарии
export function parseSseBlock(block: string): SseMessage | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  return data.length ? { event, data: data.join('\n') } : null;
}

export async function readSse(
  body: ReadableStream<Uint8Array>,
  onMessage: (message: SseMessage) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? ''; // последний блок может быть еще не дописан
    for (const block of blocks) {
      const message = parseSseBlock(block);
      if (message) onMessage(message);
    }
  }
}

type BrowserPermission = NotificationPermission | 'unsupported';

function browserPermission(): BrowserPermission {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

// Состояние колокольчика и поток новых уведомлений. Поток читается через fetch, а не EventSource:
// EventSource не умеет передавать заголовок Authorization, а токен в URL попал бы в логи
@Injectable({ providedIn: 'root' })
export class NotificationCenter {
  private readonly api = inject(NotificationsApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private connection: AbortController | null = null;

  readonly recent = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly permission = signal(browserPermission());
  // растет при любом изменении: страница уведомлений по нему перечитывает список
  readonly revision = signal(0);

  constructor() {
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      untracked(() => (loggedIn ? this.connect() : this.disconnect()));
    });
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  markRead(notification: AppNotification): Observable<AppNotification> {
    return this.api.markRead(notification.id).pipe(
      tap((updated) => {
        if (!notification.read) this.unreadCount.update((n) => Math.max(0, n - 1));
        this.recent.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.revision.update((n) => n + 1);
      }),
    );
  }

  markAllRead(): Observable<void> {
    return this.api.markAllRead().pipe(
      tap(() => {
        this.unreadCount.set(0);
        this.recent.update((list) => list.map((x) => ({ ...x, read: true })));
        this.revision.update((n) => n + 1);
      }),
    );
  }

  // браузер показывает запрос разрешения только в ответ на действие пользователя
  async enableBrowserNotifications(): Promise<void> {
    if (this.permission() === 'unsupported') return;
    this.permission.set(await Notification.requestPermission());
  }

  private connect(): void {
    this.disconnect();
    this.connection = new AbortController();
    void this.listen(this.connection.signal);
  }

  private disconnect(): void {
    this.connection?.abort();
    this.connection = null;
    this.recent.set([]);
    this.unreadCount.set(0);
  }

  private async listen(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        const response = await fetch(STREAM_URL, {
          headers: { Authorization: `Bearer ${this.auth.token()}` },
          signal,
        });
        if (response.status === 401) {
          this.refresh(); // интерцептор HttpClient разлогинит и уведет на страницу входа
          return;
        }
        if (response.ok && response.body) {
          this.refresh(); // пока соединения не было, могли появиться новые
          await readSse(response.body, (message) => {
            if (message.event === 'notification') this.receive(JSON.parse(message.data));
          });
        }
      } catch {
        // сервис недоступен или соединение разорвано: подключимся снова
      }
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_MS));
    }
  }

  private refresh(): void {
    this.api.page(0, RECENT_LIMIT).subscribe({
      next: (page) => this.recent.set(page.content),
      error: () => undefined,
    });
    this.api.unreadCount().subscribe({
      next: (count) => this.unreadCount.set(count),
      error: () => undefined,
    });
    this.revision.update((n) => n + 1);
  }

  private receive(notification: AppNotification): void {
    // могло уже прийти вместе со списком в refresh() сразу после подключения
    if (this.recent().some((x) => x.id === notification.id)) return;
    this.recent.update((list) => [notification, ...list].slice(0, RECENT_LIMIT));
    this.unreadCount.update((n) => n + 1);
    this.revision.update((n) => n + 1);

    if (document.visibilityState === 'hidden' && this.permission() === 'granted') {
      this.showSystemNotification(notification);
    } else {
      this.snackBar.open(notification.title, 'OK', { duration: 5000 });
    }
  }

  // Поток открыт в каждой вкладке; одинаковый tag не дает показать уведомление несколько раз
  private showSystemNotification(notification: AppNotification): void {
    const popup = new Notification(notification.title, {
      body: notification.message,
      tag: `notification-${notification.id}`,
    });
    popup.onclick = () => {
      window.focus();
      this.router.navigateByUrl(notification.link);
      popup.close();
    };
  }
}
