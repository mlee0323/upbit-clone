// Test timezone parsing
const dateStr = '2025-12-30T01:10:00';
const dateNoZ = new Date(dateStr);
const dateWithZ = new Date(dateStr + 'Z');

console.log(`Original string: ${dateStr}`);
console.log(`Parsed without Z: ${dateNoZ.toISOString()} (Local interpretation)`);
console.log(`Parsed with Z:    ${dateWithZ.toISOString()} (UTC interpretation)`);

if (dateWithZ.toISOString() === '2025-12-30T01:10:00.000Z') {
  console.log('\n✅ Success: Adding "Z" correctly parses the string as UTC.');
} else {
  console.log('\n❌ Failure: Parsing logic is still incorrect.');
}
