import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth';
import { Notify } from '../../core/notify';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <mat-card appearance="outlined">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <mat-card-header>
        <mat-card-title>Вход</mat-card-title>
        <mat-card-subtitle>Войдите, чтобы покупать билеты и регистрироваться</mat-card-subtitle>
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
              [type]="hide() ? 'password' : 'text'"
              formControlName="password"
              autocomplete="current-password"
            />
            <button
              matIconButton
              matSuffix
              type="button"
              (click)="hide.set(!hide())"
              [attr.aria-label]="hide() ? 'Показать пароль' : 'Скрыть пароль'"
            >
              <mat-icon>{{ hide() ? 'visibility' : 'visibility_off' }}</mat-icon>
            </button>
            <mat-error>Введите пароль</mat-error>
          </mat-form-field>
          <div class="actions">
            <a matButton routerLink="/register">Нет аккаунта?</a>
            <button matButton="filled" type="submit" [disabled]="loading()">Войти</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);

  readonly returnUrl = input<string>();

  protected readonly loading = signal(false);
  protected readonly hide = signal(true);
  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success(`Добро пожаловать, ${this.auth.user()?.username}!`);
        this.router.navigateByUrl(this.returnUrl() || '/events');
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }
}
