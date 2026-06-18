const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Utility to print step results nicely
const logStep = (name, passed, details = '') => {
  const status = passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`[${status}] Step: ${name} ${details ? `(${details})` : ''}`);
};

async function runTests() {
  console.log('Starting Auth Microservice End-To-End Tests...\n');
  const uniqueEmail = `user_${Date.now()}@example.com`;
  const password = 'Password@1234';
  const name = 'Test User';

  let accessToken = '';
  let refreshToken = '';
  let newAccessToken = '';
  let newRefreshToken = '';

  // 1. Health Check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === 'ok') {
      logStep('Health Check', true);
    } else {
      logStep('Health Check', false, `Status: ${res.status}`);
      process.exit(1);
    }
  } catch (err) {
    logStep('Health Check', false, `Server not reachable at ${BASE_URL}. Is it running? Error: ${err.message}`);
    process.exit(1);
  }

  // 2. User Registration
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: uniqueEmail, password }),
    });
    const data = await res.json();
    if (res.status === 201 && data.user && data.user.email === uniqueEmail.toLowerCase()) {
      logStep('Register User', true);
    } else {
      logStep('Register User', false, `Status: ${res.status}, Error: ${data.error}`);
    }
  } catch (err) {
    logStep('Register User', false, err.message);
  }

  // 3. User Login
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password }),
    });
    const data = await res.json();
    if (res.status === 200 && data.accessToken && data.refreshToken) {
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      logStep('Login User', true);
    } else {
      logStep('Login User', false, `Status: ${res.status}, Error: ${data.error}`);
    }
  } catch (err) {
    logStep('Login User', false, err.message);
  }

  // 4. Fetch own profile (Me) - Should pass
  try {
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.user && data.user.email === uniqueEmail.toLowerCase()) {
      logStep('Fetch Own Profile (Valid Access Token)', true);
    } else {
      logStep('Fetch Own Profile (Valid Access Token)', false, `Status: ${res.status}, Error: ${data.error}`);
    }
  } catch (err) {
    logStep('Fetch Own Profile (Valid Access Token)', false, err.message);
  }

  // 5. Fetch Admin route - Should fail (403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/users/admin/users`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (res.status === 403) {
      logStep('Admin Only Access Check (RBAC Denied)', true, 'Returned 403 Forbidden as expected');
    } else {
      logStep('Admin Only Access Check (RBAC Denied)', false, `Expected 403, got status: ${res.status}`);
    }
  } catch (err) {
    logStep('Admin Only Access Check (RBAC Denied)', false, err.message);
  }

  // 6. Token Refresh (Rotation) - Should succeed
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (res.status === 200 && data.accessToken && data.refreshToken) {
      newAccessToken = data.accessToken;
      newRefreshToken = data.refreshToken;
      logStep('Token Refresh Rotation', true);
    } else {
      logStep('Token Refresh Rotation', false, `Status: ${res.status}, Error: ${data.error}`);
    }
  } catch (err) {
    logStep('Token Refresh Rotation', false, err.message);
  }

  // 7. Verify Old Refresh Token is Invalid (Rotated/Deleted) - Should fail (401)
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (res.status === 401) {
      logStep('Rotated Token Reuse Prevention', true, 'Returned 401 Unauthorized as expected');
    } else {
      logStep('Rotated Token Reuse Prevention', false, `Expected 401, got status: ${res.status}`);
    }
  } catch (err) {
    logStep('Rotated Token Reuse Prevention', false, err.message);
  }

  // 8. Logout - Should succeed
  try {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newAccessToken}`,
      },
      body: JSON.stringify({ refreshToken: newRefreshToken }),
    });
    const data = await res.json();
    if (res.status === 200 && data.message === 'Logged out successfully') {
      logStep('Logout User', true);
    } else {
      logStep('Logout User', false, `Status: ${res.status}, Error: ${data.error}`);
    }
  } catch (err) {
    logStep('Logout User', false, err.message);
  }

  // 9. Verify Access Token Blacklisting - Should fail (401)
  try {
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${newAccessToken}` },
    });
    const data = await res.json();
    if (res.status === 401 && data.error === 'Token has been revoked. Please login again.') {
      logStep('Access Token Blacklist Check', true, 'Returned 401 Revoked as expected');
    } else {
      logStep('Access Token Blacklist Check', false, `Expected 401 Revoked, got status: ${res.status}, Error: ${data.error}`);
    }
  } catch (err) {
    logStep('Access Token Blacklist Check', false, err.message);
  }

  console.log('\nTests execution completed.');
}

runTests();
