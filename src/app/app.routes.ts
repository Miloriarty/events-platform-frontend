import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'events' },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Вход',
    loadComponent: () => import('./pages/auth/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Регистрация',
    loadComponent: () => import('./pages/auth/register').then((m) => m.Register),
  },
  {
    path: 'events',
    title: 'Мероприятия',
    loadComponent: () => import('./pages/events/event-list').then((m) => m.EventList),
  },
  {
    path: 'events/new',
    canActivate: [roleGuard('MANAGER', 'ADMIN')],
    title: 'Новое мероприятие',
    loadComponent: () => import('./pages/events/event-form').then((m) => m.EventForm),
  },
  {
    path: 'events/:id/edit',
    canActivate: [roleGuard('MANAGER', 'ADMIN')],
    title: 'Редактирование мероприятия',
    loadComponent: () => import('./pages/events/event-form').then((m) => m.EventForm),
  },
  {
    path: 'events/:id',
    title: 'Мероприятие',
    loadComponent: () => import('./pages/events/event-detail').then((m) => m.EventDetail),
  },
  {
    path: 'my-events',
    canActivate: [authGuard],
    title: 'Мои мероприятия',
    loadComponent: () => import('./pages/events/my-events').then((m) => m.MyEvents),
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    title: 'Билеты',
    loadComponent: () => import('./pages/tickets/tickets').then((m) => m.Tickets),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    title: 'Заказы',
    loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders),
  },
  {
    path: 'registrations',
    canActivate: [authGuard],
    title: 'Регистрации',
    loadComponent: () => import('./pages/registrations/registrations').then((m) => m.Registrations),
  },
  {
    path: 'catalog',
    canActivate: [roleGuard('MANAGER', 'ADMIN')],
    title: 'Справочники',
    loadComponent: () => import('./pages/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'users',
    canActivate: [roleGuard('ADMIN')],
    title: 'Пользователи',
    loadComponent: () => import('./pages/users/users').then((m) => m.Users),
  },
  { path: '**', redirectTo: 'events' },
];
