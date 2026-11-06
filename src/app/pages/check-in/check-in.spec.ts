import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PassesApi } from '../../core/api';
import { CheckInResult } from '../../core/models';
import { CheckIn } from './check-in';

const RESULT: CheckInResult = {
  registrationId: 5,
  userId: 7,
  eventId: 42,
  eventTitle: 'Java Meetup',
  ticketType: 'VIP',
  checkedInAt: '2026-11-07T10:00:00',
};

describe('CheckIn', () => {
  const checkIn = vi.fn();
  let fixture: ComponentFixture<CheckIn>;

  beforeEach(() => {
    checkIn.mockReset();
    TestBed.configureTestingModule({
      imports: [CheckIn],
      providers: [provideRouter([]), { provide: PassesApi, useValue: { checkIn } }],
    });
    fixture = TestBed.createComponent(CheckIn);
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('checks the token from the QR link once and removes it from the URL', async () => {
    checkIn.mockReturnValue(of(RESULT));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    fixture.componentRef.setInput('token', 'aaa.bbb.ccc');
    await fixture.whenStable();

    expect(checkIn).toHaveBeenCalledTimes(1);
    expect(checkIn).toHaveBeenCalledWith('aaa.bbb.ccc');
    expect(navigate).toHaveBeenCalledWith([], { queryParams: {}, replaceUrl: true });
    expect(text()).toContain('Проход разрешён');
    expect(text()).toContain('Java Meetup');
  });

  it('does nothing without a token', async () => {
    await fixture.whenStable();
    expect(checkIn).not.toHaveBeenCalled();
  });

  it('shows the reason of a refusal', async () => {
    checkIn.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { status: 409, detail: 'Ticket has already been used' },
          }),
      ),
    );

    fixture.componentRef.setInput('token', 'aaa.bbb.ccc');
    await fixture.whenStable();

    expect(text()).toContain('Проход запрещён');
    expect(text()).toContain('Ticket has already been used');
  });

  it('accepts a pasted link', async () => {
    checkIn.mockReturnValue(new Subject());
    await fixture.whenStable();
    const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
    const input = form.querySelector('input')!;
    input.value = 'http://localhost:4200/check-in?token=aaa.bbb.ccc';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));

    expect(checkIn).toHaveBeenCalledWith('aaa.bbb.ccc');
  });
});
