// This service acts as a thin wrapper around the consolidated authentication
// functions defined in `auth.js`.  Historically there were two separate
// authentication services (`auth.js` and `authService.js`) which contained
// duplicate logic for login, registration and token refresh.  To reduce
// duplication and ensure a single source of truth, the functions from
// `auth.js` are re‑exported here.  This preserves backward compatibility
// with modules that import from `authService.js` while centralising the
// implementation.

import { login, register, refreshToken, logout } from './auth';

export { login, register, refreshToken, logout };