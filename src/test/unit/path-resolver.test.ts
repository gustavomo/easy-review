import { describe, it } from 'vitest';

describe('resolveClaudePath', () => {
  it.todo('returns configured path when easyReview.claudePath is set and file exists');
  it.todo('skips configured path when file does not exist at configured path');
  it.todo('falls back to shell detection when no configured path');
  it.todo('falls back to common paths when shell detection fails');
  it.todo('returns undefined when claude is not found anywhere');
  it.todo('priority order: settings > shell-detection > common-paths');
});
