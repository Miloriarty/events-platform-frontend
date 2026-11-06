import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PassesApi } from '../../core/api';
import { Pass } from '../../core/models';
import { PassDialog } from './pass-dialog';

const PASS: Pass = {
  registrationId: 5,
  eventId: 42,
  eventTitle: 'Java Meetup',
  ticketType: 'VIP',
  startDate: '2026-11-07',
  endDate: '2026-11-07',
  locationName: 'Экспоцентр',
  locationAddress: 'Ленина, 1, Москва',
  token: 'aaa.bbb.ccc',
  checkInUrl: 'http://localhost:4200/check-in?token=aaa.bbb.ccc',
  qrCode: 'data:image/png;base64,AAAA',
};

async function render(get: ReturnType<typeof vi.fn>): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [PassDialog],
    providers: [
      { provide: PassesApi, useValue: { get } },
      { provide: MAT_DIALOG_DATA, useValue: { id: 5, eventTitle: 'Java Meetup' } },
      { provide: MatDialogRef, useValue: { close: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(PassDialog);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('PassDialog', () => {
  it('shows the QR code and ticket details', async () => {
    const element = await render(vi.fn(() => of(PASS)));

    expect(element.querySelector('img')?.getAttribute('src')).toBe(PASS.qrCode);
    expect(element.textContent).toContain('Экспоцентр, Ленина, 1, Москва');
    expect(element.textContent).toContain('VIP');
  });

  it('shows the server message when the pass is unavailable', async () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { status: 409, detail: 'Event has already finished' },
    });
    const element = await render(vi.fn(() => throwError(() => error)));

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('Event has already finished');
  });
});
