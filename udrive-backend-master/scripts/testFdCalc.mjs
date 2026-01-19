import { computeFdMaturity } from '../lib/fdCalc.js';

console.log('1 month, 8.5% p.a. on 100000');
console.log(computeFdMaturity({ principal: 100000, ratePercent: 8.5, fdType: 'monthly', termMonths: 1 }));

console.log('6 months, 8.5% p.a. on 100000');
console.log(computeFdMaturity({ principal: 100000, ratePercent: 8.5, fdType: 'monthly', termMonths: 6 }));

console.log('2 years, 8.5% p.a. compound on 100000');
console.log(computeFdMaturity({ principal: 100000, ratePercent: 8.5, fdType: 'yearly', termYears: 2 }));
