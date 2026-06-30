require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const pool   = require('../../src/db/pool');

async function seed() {
  const hash = await bcrypt.hash('Password123!', 10);

  await pool.query(
    `INSERT IGNORE INTO users (full_name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    ['Grace Achieng', 'grace@mobipesa.co.ke', '+254700000003', hash, 'HR_ADMIN']
  );

  await pool.query(
    `INSERT IGNORE INTO users (full_name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    ['Samuel Otieno', 'samuel@mobipesa.co.ke', '+254700000001', hash, 'MANAGER']
  );

  const [[manager]] = await pool.query(
    `SELECT id FROM users WHERE email = ?`, ['samuel@mobipesa.co.ke']
  );

  const employees = [
    ['Jane Wanjiru', 'jane@mobipesa.co.ke',  '+254700000002'],
    ['Peter Kamau',  'peter@mobipesa.co.ke', '+254700000004'],
  ];

  for (const [name, email, phone] of employees) {
    await pool.query(
      `INSERT IGNORE INTO users (full_name, email, phone, password_hash, role, manager_id)
       VALUES (?, ?, ?, ?, 'EMPLOYEE', ?)`,
      [name, email, phone, hash, manager.id]
    );
  }

  const [[{ year }]] = await pool.query(`SELECT YEAR(NOW()) AS year`);
  const [users]      = await pool.query(`SELECT id FROM users`);
  const [types]      = await pool.query(`SELECT id, default_days_per_year FROM leave_types WHERE is_active = 1`);

  for (const user of users) {
    for (const type of types) {
      await pool.query(
        `INSERT IGNORE INTO leave_balances (user_id, leave_type_id, year, allocated_days)
         VALUES (?, ?, ?, ?)`,
        [user.id, type.id, year, type.default_days_per_year ?? 0]
      );
    }
  }

  console.log('Seed complete. All users password: Password123!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });