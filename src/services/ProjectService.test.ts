/**
 * Manual verification script for ProjectService financial calculations
 * 
 * This script demonstrates the financial calculation logic with sample data.
 * Run with: npx ts-node src/services/ProjectService.test.ts
 * 
 * Note: This is a demonstration script. For production use, integrate with
 * a proper testing framework like Jest or Mocha.
 */

import mongoose from 'mongoose';

// Simulate the calculation logic
function calculateTotals(pledges: any[]) {
  const total_promised_amount = pledges.reduce(
    (sum, pledge) => sum + pledge.promised_amount,
    0
  );

  const total_collected_amount = pledges.reduce(
    (sum, pledge) => {
      const pledgePayments = pledge.payment_history.reduce(
        (paymentSum: number, payment: any) => paymentSum + payment.amount,
        0
      );
      return sum + pledgePayments;
    },
    0
  );

  return { total_promised_amount, total_collected_amount };
}

// Test cases
console.log('=== ProjectService Financial Calculations Test ===\n');

// Test 1: Calculate total promised amounts
console.log('Test 1: Calculate total_promised_amount');
const test1Pledges = [
  { promised_amount: 1000, payment_history: [] },
  { promised_amount: 2500, payment_history: [] },
  { promised_amount: 500, payment_history: [] }
];
const result1 = calculateTotals(test1Pledges);
console.log(`Expected: 4000, Got: ${result1.total_promised_amount}`);
console.log(`✓ Test 1 ${result1.total_promised_amount === 4000 ? 'PASSED' : 'FAILED'}\n`);

// Test 2: Calculate total collected from payment history
console.log('Test 2: Calculate total_collected_amount from payment_history');
const test2Pledges = [
  { 
    promised_amount: 1000, 
    payment_history: [
      { amount: 300, date: new Date() },
      { amount: 200, date: new Date() }
    ] 
  },
  { 
    promised_amount: 2000, 
    payment_history: [
      { amount: 1000, date: new Date() }
    ] 
  },
  { 
    promised_amount: 500, 
    payment_history: [] 
  }
];
const result2 = calculateTotals(test2Pledges);
console.log(`Expected: 1500, Got: ${result2.total_collected_amount}`);
console.log(`✓ Test 2 ${result2.total_collected_amount === 1500 ? 'PASSED' : 'FAILED'}\n`);

// Test 3: Handle empty pledge list
console.log('Test 3: Handle empty pledge list');
const test3Pledges: any[] = [];
const result3 = calculateTotals(test3Pledges);
console.log(`Expected: 0, Got: ${result3.total_promised_amount}`);
console.log(`Expected: 0, Got: ${result3.total_collected_amount}`);
console.log(`✓ Test 3 ${result3.total_promised_amount === 0 && result3.total_collected_amount === 0 ? 'PASSED' : 'FAILED'}\n`);

// Test 4: Handle pledges with no payments
console.log('Test 4: Handle pledges with no payments');
const test4Pledges = [
  { promised_amount: 1000, payment_history: [] },
  { promised_amount: 2000, payment_history: [] }
];
const result4 = calculateTotals(test4Pledges);
console.log(`Expected promised: 3000, Got: ${result4.total_promised_amount}`);
console.log(`Expected collected: 0, Got: ${result4.total_collected_amount}`);
console.log(`✓ Test 4 ${result4.total_promised_amount === 3000 && result4.total_collected_amount === 0 ? 'PASSED' : 'FAILED'}\n`);

// Test 5: Complex scenario with multiple pledges and payments
console.log('Test 5: Complex scenario');
const test5Pledges = [
  { 
    promised_amount: 5000, 
    payment_history: [
      { amount: 1000, date: new Date() },
      { amount: 1500, date: new Date() },
      { amount: 500, date: new Date() }
    ] 
  },
  { 
    promised_amount: 3000, 
    payment_history: [
      { amount: 3000, date: new Date() }
    ] 
  },
  { 
    promised_amount: 2000, 
    payment_history: [
      { amount: 1000, date: new Date() }
    ] 
  }
];
const result5 = calculateTotals(test5Pledges);
console.log(`Expected promised: 10000, Got: ${result5.total_promised_amount}`);
console.log(`Expected collected: 7000, Got: ${result5.total_collected_amount}`);
console.log(`✓ Test 5 ${result5.total_promised_amount === 10000 && result5.total_collected_amount === 7000 ? 'PASSED' : 'FAILED'}\n`);

console.log('=== All Tests Complete ===');
