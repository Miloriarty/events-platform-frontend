# Events Platform — frontend

Клиент на Angular 22 + Angular Material для бэкенда [events-platform](../../IdeaProjects/events-platform)
(Spring Cloud, вход через `api-gateway` на `:8080`).

## Запуск

```bash
npm install
npm start          # http://localhost:4200
```

Dev-сервер проксирует `/api/**` на `http://localhost:8080` (`proxy.conf.json`), поэтому CORS на gateway
не нужен. Сначала поднимите бэкенд (config-server → discovery → сервисы → api-gateway).
Вход по умолчанию: `admin` / `admin123`.

## Что есть

| Раздел | Кому | API |
|---|---|---|
| Мероприятия: список, поиск, карточка | всем | `GET /api/events`, `/search`, `/{id}` |
| Создание / изменение / удаление мероприятия | MANAGER (свои), ADMIN | `POST/PUT/DELETE /api/events` |
| Участники мероприятия | организатор, ADMIN | `GET /api/registrations/event/{id}` |
| Мои мероприятия | MANAGER, ADMIN | `GET /api/events/my` |
| Билеты: покупка через корзину | авторизованные | `GET /api/tickets`, `POST /api/orders` |
| Типы билетов (CRUD) | MANAGER, ADMIN | `/api/tickets` |
| Заказы, отмена | авторизованные (ADMIN видит все) | `/api/orders` |
| Регистрация на мероприятие по позиции заказа, отмена | авторизованные | `/api/registrations` |
| Справочники: категории, локации | MANAGER, ADMIN | `/api/categories`, `/api/locations` |
| Пользователи | ADMIN | `/api/users` |

JWT хранится в `localStorage`; роль и id берутся из claims токена (`sub`, `role`, `username`).
На `401` клиент разлогинивает и отправляет на страницу входа.

## Структура

- `src/app/core` — модели DTO, `AuthService`, интерцептор, гарды, API-сервисы, уведомления об ошибках (`ProblemDetail`)
- `src/app/shared` — диалоги подтверждения и формы справочников
- `src/app/pages` — страницы (lazy-маршруты в `app.routes.ts`)

```bash
npm run build
npm test
```
