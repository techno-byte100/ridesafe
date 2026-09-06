const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Tests ---');

  // 1. Health check
  const health = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET'
  });
  console.log('1. Health Check:', health.statusCode, health.body);

  // 2. Unauthenticated billing/generate (B006)
  const billingGen = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/billing/generate',
    method: 'POST'
  });
  console.log('2. Billing Generate Unauth (B006):', billingGen.statusCode, billingGen.body);

  // 3. Unauthenticated billing/[parentId] (B007)
  const billingParent = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/billing/some-fake-parent-id',
    method: 'GET'
  });
  console.log('3. Billing Parent Unauth (B007):', billingParent.statusCode, billingParent.body);

  // 4. Login as parent
  const parentLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'parent1@ridesafe.com', password: 'password123' });
  console.log('4. Parent Login:', parentLogin.statusCode, parentLogin.body);

  // 5. Login as driver
  const driverLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'driver@ridesafe.com', password: 'password123' });
  console.log('5. Driver Login:', driverLogin.statusCode, driverLogin.body);

  // 6. Active trip test for parent
  const parentCookie = parentLogin.headers['set-cookie'] ? parentLogin.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
  const activeTrip = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/trips/active',
    method: 'GET',
    headers: { Cookie: parentCookie }
  });
  console.log('6. Active Trips (Parent):', activeTrip.statusCode, activeTrip.body);

  // 7. Test Location fallback (B009)
  const locationRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/location?busId=fake-bus-id',
    method: 'GET',
    headers: { Cookie: parentCookie }
  });
  console.log('7. Location Fallback (B009):', locationRes.statusCode, locationRes.body);

  // 8. Driver reports delay on active trip
  const driverCookie = driverLogin.headers['set-cookie'] ? driverLogin.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
  const parsedTrip = JSON.parse(activeTrip.body).trip;
  if (parsedTrip) {
    const delayRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/trips/${parsedTrip.id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: driverCookie
      }
    }, {
      delayMinutes: 15,
      delayReason: 'Heavy rain and road construction'
    });
    console.log('8. Driver Report Delay:', delayRes.statusCode, delayRes.body);

    // 9. Parent checks active trip for delay
    const parentTripCheck = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/trips/active',
      method: 'GET',
      headers: { Cookie: parentCookie }
    });
    console.log('9. Parent Active Trip (with Delay):', parentTripCheck.statusCode, parentTripCheck.body);

    // 10. Parent confirms student boarded (Two-Way Confirmation)
    // First get student id
    const studentsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/students',
      method: 'GET',
      headers: { Cookie: parentCookie }
    });
    console.log('10a. Parent Students:', studentsRes.statusCode, studentsRes.body);
    const students = JSON.parse(studentsRes.body).students || JSON.parse(studentsRes.body);
    const student = Array.isArray(students) ? students[0] : (students.students ? students.students[0] : null);

    if (student) {
      const confirmRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/attendance',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: parentCookie
        }
      }, {
        studentId: student.id,
        tripId: parsedTrip.id,
        action: 'PARENT_PICKUP_CONFIRMED'
      });
      console.log('10b. Parent Confirms Boarded:', confirmRes.statusCode, confirmRes.body);

      // 12. Check driver received notification about parent confirmation
      const driverNotifs = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/notifications',
        method: 'GET',
        headers: { Cookie: driverCookie }
      });
      console.log('12. Driver Notifications:', driverNotifs.statusCode, driverNotifs.body);

      // 13. Check parent received notification about delay
      const parentNotifs = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/notifications',
        method: 'GET',
        headers: { Cookie: parentCookie }
      });
      console.log('13. Parent Notifications:', parentNotifs.statusCode, parentNotifs.body);
    }
  }

  console.log('--- Finished API Tests ---');
}

runTests().catch(err => console.error('Test error:', err));
