// Test the categorization logic
const { categorize, getCategoryIcon } = require('./src/categorize');

const testCases = [
  { input: 'https://github.com/openclaw/openclaw', expected: 'url' },
  { input: 'test@example.com', expected: 'email' },
  { input: '+1-555-123-4567', expected: 'phone' },
  { input: '192.168.1.1', expected: 'ip' },
  { input: '#FF5733', expected: 'color' },
  { input: 'const x = 42;', expected: 'code' },
  { input: 'function hello() {\n  return "world";\n}', expected: 'code' },
  { input: '123 Main Street, Springfield, IL 62701', expected: 'address' },
  { input: 'Just some regular text here', expected: 'text' },
];

console.log('Testing categorization:\n');
let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = categorize(input);
  const icon = getCategoryIcon(result);
  const status = result === expected ? '✅' : '❌';
  
  if (result === expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} ${icon} "${input.slice(0, 40)}${input.length > 40 ? '...' : ''}"`);
  console.log(`   Expected: ${expected}, Got: ${result}`);
  console.log();
});

console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
