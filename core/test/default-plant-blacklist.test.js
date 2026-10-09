const test = require('node:test');
const assert = require('node:assert/strict');

const store = require('../src/models/store');

test('默认偷菜黑名单包含胡萝卜 Lv2，且不再包含旧 ID 26739', () => {
  const blacklist = store.getDefaultAccountConfig().plantBlacklist;

  assert.equal(blacklist.includes(20003), true);
  assert.equal(blacklist.includes(26739), false);
});
