// workingDays.test.js
// We mock the DB pool so tests run without a real database connection

jest.mock('./src/db/pool', () => ({
  query: jest.fn().mockResolvedValue([[
    { d: '2026-01-01' }, // New Year's Day
    { d: '2026-04-03' }, // Good Friday
    { d: '2026-04-06' }, // Easter Monday
    { d: '2026-06-01' }, // Madaraka Day
  ]])
}));

const { calcWorkingDays } = require('./src/utils/workingDays');

describe('calcWorkingDays', () => {

  test('single weekday — no holiday', async () => {
    // Tuesday 7 April 2026
    const result = await calcWorkingDays('2026-04-07', '2026-04-07');
    expect(result).toBe(1);
  });

  test('Saturday counts as 0', async () => {
    const result = await calcWorkingDays('2026-04-04', '2026-04-04');
    expect(result).toBe(0);
  });

  test('Sunday counts as 0', async () => {
    const result = await calcWorkingDays('2026-04-05', '2026-04-05');
    expect(result).toBe(0);
  });

  test('full week Mon-Fri = 5 days', async () => {
    // Mon 13 Apr - Fri 17 Apr 2026
    const result = await calcWorkingDays('2026-04-13', '2026-04-17');
    expect(result).toBe(5);
  });

  test('week including weekend = still 5 days', async () => {
    // Mon 13 Apr - Sun 19 Apr 2026
    const result = await calcWorkingDays('2026-04-13', '2026-04-19');
    expect(result).toBe(5);
  });

  test('Good Friday and Easter Monday excluded', async () => {
    // Fri 3 Apr - Mon 6 Apr 2026 (Good Friday + weekend + Easter Monday)
    const result = await calcWorkingDays('2026-04-03', '2026-04-06');
    expect(result).toBe(0);
  });

  test('New Year holiday excluded', async () => {
    // Thu 1 Jan - Fri 2 Jan 2026
    const result = await calcWorkingDays('2026-01-01', '2026-01-02');
    expect(result).toBe(1); // only 2 Jan counts
  });

  test('Madaraka Day (Mon 1 Jun) excluded', async () => {
    // Mon 1 Jun - Fri 5 Jun 2026
    const result = await calcWorkingDays('2026-06-01', '2026-06-05');
    expect(result).toBe(4); // Tue-Fri only
  });

  test('same start and end on holiday = 0', async () => {
    const result = await calcWorkingDays('2026-01-01', '2026-01-01');
    expect(result).toBe(0);
  });

});