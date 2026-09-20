const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual service with its Firebase and HTTP boundary mocked.
const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../lib/services/auth.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;
class ApiError extends Error {
  constructor(status) { super(`HTTP ${status}`); this.status = status; }
}
function service(apiFetch) {
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === '@/lib/utils/api-client') return { apiFetch, ApiError };
      if (name === '@/lib/firebase/client') return { setChampionRoleCookie() {} };
      if (name === 'firebase/auth') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}
for (const [completed, route] of [[true, '/dashboard'], [false, '/onboarding']]) {
  test(`confirmed onboarding status ${completed} routes to ${route}`, async () => {
    const auth = service(async () => ({ onboarding_completed: completed }));
    assert.equal((await auth.getPostLoginRedirect('user')).redirectTo, route);
  });
}
test('missing profile routes to onboarding', async () => {
  const auth = service(async () => { throw new ApiError(404); });
  assert.equal((await auth.getPostLoginRedirect('user')).redirectTo, '/onboarding');
});
for (const error of [new ApiError(401), new ApiError(403), new ApiError(500), new TypeError('Failed to fetch')]) {
  test(`lookup failure ${error.message} shows an error without redirecting`, async () => {
    const auth = service(async () => { throw error; });
    const result = await auth.getPostLoginRedirect('user');
    assert.equal(result.redirectTo, null);
    assert.equal(result.error, auth.STUDENT_ACCESS_UNVERIFIED_MESSAGE);
    await assert.rejects(auth.hasCompletedOnboarding({ uid: 'user' }));
  });
}
test('malformed profile does not imply incomplete onboarding', async () => {
  const auth = service(async () => ({}));
  assert.equal((await auth.getPostLoginRedirect('user')).redirectTo, null);
});
test('authorized champion still goes to champion dashboard', async () => {
  const auth = service(async () => ({ authorized: true }));
  assert.equal((await auth.getPostLoginRedirect('user', 'champion')).redirectTo, '/champion/dashboard');
});
test('denied champion gets no student shortcut if profile lookup fails', async () => {
  const auth = service(async (path) => {
    if (path === '/api/auth/champion-access') return { authorized: false };
    throw new ApiError(500);
  });
  const result = await auth.getPostLoginRedirect('user', 'champion');
  assert.equal(result.redirectTo, null);
  assert.equal(result.studentRoute, undefined);
  assert.ok(result.error.includes(auth.STUDENT_ACCESS_UNVERIFIED_MESSAGE));
});
