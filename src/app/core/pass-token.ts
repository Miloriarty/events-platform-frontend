// В поле проверки попадает либо токен, либо вся ссылка из QR-кода (ее вводит сканер или вставляют руками)
export function extractPassToken(value: string): string {
  const text = value.trim();
  try {
    return new URL(text).searchParams.get('token') ?? text;
  } catch {
    return text;
  }
}
