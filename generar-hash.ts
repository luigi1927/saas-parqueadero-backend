import bcrypt from 'bcryptjs';

const pin = '1234';
const hash = await bcrypt.hash(pin, 10);

console.log('\n========================================');
console.log('📌 TU HASH REAL DE BCRYPT ES:');
console.log(hash);
console.log('========================================\n');