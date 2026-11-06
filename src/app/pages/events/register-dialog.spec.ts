import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { RegistrationsApi } from '../../core/api';
import { AvailableOrderItem } from '../../core/models';
import { RegisterDialog } from './register-dialog';

const ITEM: AvailableOrderItem = {
  orderItemId: 10,
  orderId: 7,
  orderDate: '2026-10-26T10:00:00',
  ticketType: 'Standard',
  unitPrice: 1000,
  quantity: 2,
  remaining: 1,
};

async function render(items: AvailableOrderItem[], minTicketPrice = 0): Promise<HTMLElement> {
  const availableItems = vi.fn(() => of(items));
  TestBed.configureTestingModule({
    imports: [RegisterDialog],
    providers: [
      provideRouter([]),
      { provide: RegistrationsApi, useValue: { availableItems } },
      { provide: MAT_DIALOG_DATA, useValue: { id: 1, title: 'Meetup', minTicketPrice } },
      { provide: MatDialogRef, useValue: { close: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(RegisterDialog);
  await fixture.whenStable();
  expect(availableItems).toHaveBeenCalledWith(1);
  return fixture.nativeElement;
}

describe('RegisterDialog', () => {
  it('lists only what the server allows, with the remaining count', async () => {
    const element = await render([ITEM]);

    expect(element.querySelectorAll('mat-radio-button').length).toBe(1);
    expect(element.textContent).toContain('осталось 1 из 2');
    expect(element.textContent).toContain('заказ #7');
  });

  it('names the minimum price of the event', async () => {
    const element = await render([], 1000);

    expect(element.textContent).toContain('Нет свободных билетов от');
    expect(element.textContent).toContain('1,000');
  });

  it('suggests buying a ticket when nothing is available', async () => {
    const element = await render([]);

    expect(element.querySelector('mat-radio-button')).toBeNull();
    expect(element.textContent).toContain('нет свободных билетов');
  });
});
