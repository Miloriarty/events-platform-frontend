import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth';
import { Notify } from '../../core/notify';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  template: `
    <mat-card appearance="outlined">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <mat-card-header>
        <mat-card-title>Регистрация</mat-card-title>
        <mat-card-subtitle>Новый аккаунт получает роль «Пользователь»</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field>
            <mat-label>Логин</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
            <mat-error>Введите логин</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Пароль</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
            <mat-hint>Минимум 6 символов</mat-hint>
            <mat-error>Минимум 6 символов</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Полное имя</mat-label>
            <input matInput formControlName="fullName" autocomplete="name" />
            <mat-error>Введите имя</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-error>Введите корректный email</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Телефон</mat-label>
            <input
              matInput
              type="tel"
              formControlName="phone"
              autocomplete="tel"
              placeholder="+79990000000"
            />
            <mat-error>Введите телефон</mat-error>
          </mat-form-field>
          <div class="actions">
            <a matButton routerLink="/login">Уже есть аккаунт?</a>
            <button matButton="filled" type="submit" [disabled]="loading()">
              Зарегистрироваться
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);

  protected readonly loading = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.auth
      .register(value)
      .pipe(
        switchMap(() => this.auth.login({ username: value.username, password: value.password })),
      )
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.notify.success('Аккаунт создан');
          this.router.navigate(['/events']);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err);
        },
      });
  }
}
