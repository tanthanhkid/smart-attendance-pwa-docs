import { strict as assert } from 'node:assert';
import { buildBranchData, getSeedConfig, resolveSeedCount } from '../prisma/seed';

function main() {
  const defaultConfig = getSeedConfig({});
  assert.equal(defaultConfig.branchCount, 5);
  assert.equal(defaultConfig.employeeCount, 50);

  const config = getSeedConfig({
    SEED_BRANCH_COUNT: '8',
    SEED_EMPLOYEE_COUNT: '12',
  });

  assert.equal(config.branchCount, 8);
  assert.equal(config.employeeCount, 12);

  const branchData = buildBranchData(config.branchCount);
  assert.equal(branchData.length, 8);
  assert.equal(new Set(branchData.map((branch) => branch.code)).size, 8);
  assert.equal(branchData[5]?.code, 'HCM006');

  assert.equal(resolveSeedCount('invalid', 5, 1), 5);
  assert.equal(resolveSeedCount('0', 5, 1), 5);
  assert.equal(resolveSeedCount('0', 50, 0), 0);

  console.log('seed.test.ts passed');
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
