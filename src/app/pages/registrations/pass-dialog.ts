import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PassesApi } from '../../core/api';
import { Pass, Registration } from '../../core/models';
import { errorMessage, Notify } from '../../core/notify';

@Component({
  selector: 'app-pass-dialog',
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Билет на «{{ registration.eventTitle }}»</h2>
    <mat-dialog-content>
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (pass(); as p) {
        <img class="qr" [src]="p.qrCode" alt="QR-код билета" />
        <p class="hint">Покажите QR-код на входе. Билет действует один раз.</p>
        <dl>
          <dt>Дата</dt>
          <dd>
            {{ p.startDate | date: 'd MMMM y' }}
            @if (p.endDate !== p.startDate) {
              — {{ p.endDate | date: 'd MMMM y' }}
            }
          </dd>
          <dt>Место</dt>
          <dd>{{ p.locationName }}, {{ p.locationAddress }}</dd>
          <dt>Тип билета</dt>
          <dd>{{ p.ticketType }}</dd>
          <dt>Номер</dt>
          <dd>№{{ p.registrationId }}</dd>
        </dl>
      }
      @if (error(); as message) {
        <p class="error">{{ message }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Закрыть</button>
      @if (pass(); as p) {
        <button matButton (click)="copyLink(p)">
          <mat-icon>link</mat-icon>
          Ссылка
        </button>
        <button matButton="filled" [disabled]="downloading()" (click)="download(p)">
          <mat-icon>download</mat-icon>
          PDF
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .qr {
      display: block;
      width: 240px;
      height: 240px;
      margin: 0 auto;
    }
    .hint {
      margin: 8px 0 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 16px;
      margin: 0;
    }
    dt {
      color: var(--mat-sys-on-surface-variant);
    }
    dd {
      margin: 0;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class PassDialog implements OnInit {
  protected readonly registration = inject<Registration>(MAT_DIALOG_DATA);
  private readonly api = inject(PassesApi);
  private readonly clipboard = inject(Clipboard);
  private readonly notify = inject(Notify);

  protected readonly pass = signal<Pass | null>(null);
  protected readonly loading = signal(true);
  protected readonly downloading = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.get(this.registration.id).subscribe({
      next: (pass) => {
        this.pass.set(pass);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  protected copyLink(pass: Pass): void {
    if (this.clipboard.copy(pass.checkInUrl)) this.notify.success('Ссылка на проверку скопирована');
  }

  // Запрос с токеном авторизации, поэтому обычная ссылка не подойдет: файл приходит как Blob
  protected download(pass: Pass): void {
    this.downloading.set(true);
    this.api.pdf(pass.registrationId).subscribe({
      next: (file) => {
        this.downloading.set(false);
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket-${pass.registrationId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.downloading.set(false);
        this.notify.error(err);
      },
    });
  }
}
