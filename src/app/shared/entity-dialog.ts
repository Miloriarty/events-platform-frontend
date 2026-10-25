import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';

export interface EntityField {
  key: string;
  label: string;
  type?: 'text' | 'number';
  required?: boolean;
  min?: number;
  hint?: string;
}

export interface EntityDialogData {
  title: string;
  fields: EntityField[];
  value?: Record<string, unknown>;
}

// Форма для простых справочников: категории, локации, типы билетов
@Component({
  selector: 'app-entity-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        @for (f of data.fields; track f.key) {
          <mat-form-field class="full-width">
            <mat-label>{{ f.label }}</mat-label>
            <input
              matInput
              [type]="f.type ?? 'text'"
              [formControlName]="f.key"
              [attr.min]="f.min ?? null"
              [attr.step]="f.type === 'number' ? 'any' : null"
            />
            @if (f.hint) {
              <mat-hint>{{ f.hint }}</mat-hint>
            }
            <mat-error>
              @if (form.controls[f.key].hasError('min')) {
                Значение должно быть не меньше {{ f.min }}
              } @else {
                Обязательное поле
              }
            </mat-error>
          </mat-form-field>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Отмена</button>
        <button matButton="filled" type="submit">Сохранить</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      padding-top: 8px !important;
    }
  `,
})
export class EntityDialog {
  protected readonly data = inject<EntityDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<EntityDialog>);

  protected readonly form = new FormGroup(
    Object.fromEntries(
      this.data.fields.map((f) => {
        const validators: ValidatorFn[] = [];
        if (f.required) validators.push(Validators.required);
        if (f.min !== undefined) validators.push(Validators.min(f.min));
        return [f.key, new FormControl(this.data.value?.[f.key] ?? null, validators)];
      }),
    ),
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue() as Record<string, unknown>;
    for (const f of this.data.fields) {
      if (f.type !== 'number' && typeof value[f.key] === 'string') {
        value[f.key] = (value[f.key] as string).trim();
      }
    }
    this.ref.close(value);
  }
}

export function openEntityDialog<T>(
  dialog: MatDialog,
  data: EntityDialogData,
): Observable<T | undefined> {
  return dialog.open(EntityDialog, { data, width: '460px' }).afterClosed();
}
