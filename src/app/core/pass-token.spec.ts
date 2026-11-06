import { extractPassToken } from './pass-token';

describe('extractPassToken', () => {
  it('returns a bare token unchanged', () => {
    expect(extractPassToken('  aaa.bbb.ccc ')).toBe('aaa.bbb.ccc');
  });

  it('takes the token from a check-in link', () => {
    expect(extractPassToken('http://localhost:4200/check-in?token=aaa.bbb.ccc')).toBe(
      'aaa.bbb.ccc',
    );
  });

  it('keeps the text of a link without a token', () => {
    expect(extractPassToken('http://localhost:4200/check-in')).toBe(
      'http://localhost:4200/check-in',
    );
  });
});
