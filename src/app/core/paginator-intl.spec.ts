import { RuPaginatorIntl } from './paginator-intl';

describe('RuPaginatorIntl', () => {
  const intl = new RuPaginatorIntl();

  it('shows the range in Russian', () => {
    expect(intl.getRangeLabel(0, 10, 12)).toBe('1 – 10 из 12');
  });

  it('stops the last page at the total', () => {
    expect(intl.getRangeLabel(1, 10, 12)).toBe('11 – 12 из 12');
  });

  it('handles an empty list', () => {
    expect(intl.getRangeLabel(0, 10, 0)).toBe('0 из 0');
  });
});
