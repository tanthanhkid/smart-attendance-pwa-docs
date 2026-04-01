import { strict as assert } from 'node:assert';
import { cn, formatDuration } from '../src/lib/utils';

function main() {
  assert.equal(formatDuration(0), '0 phút');
  assert.equal(formatDuration(75), '1h 15m');
  assert.equal(cn('a', false, undefined, 'b', null, 'c'), 'a b c');

  console.log('utils.test.ts passed');
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
