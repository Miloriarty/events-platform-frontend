import { parseSseBlock, readSse, SseMessage } from './notifications';

function stream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

describe('parseSseBlock', () => {
  it('reads event name and data', () => {
    expect(parseSseBlock('event:notification\ndata:{"id":1}')).toEqual({
      event: 'notification',
      data: '{"id":1}',
    });
  });

  it('ignores comments', () => {
    expect(parseSseBlock(':ping')).toBeNull();
  });
});

describe('readSse', () => {
  it('assembles events split across chunks and skips pings', async () => {
    const received: SseMessage[] = [];
    await readSse(
      stream(':connected\n\nevent:notifi', 'cation\ndata:{"id":1}\n', '\n:ping\n\n'),
      (message) => received.push(message),
    );
    expect(received).toEqual([{ event: 'notification', data: '{"id":1}' }]);
  });

  it('decodes a multi-byte character split between chunks', async () => {
    const bytes = new TextEncoder().encode('data:Заказ\n\n');
    const received: SseMessage[] = [];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 6));
        controller.enqueue(bytes.slice(6));
        controller.close();
      },
    });
    await readSse(body, (message) => received.push(message));
    expect(received[0].data).toBe('Заказ');
  });
});
