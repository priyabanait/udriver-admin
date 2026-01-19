export function computeFdMaturity({ principal, ratePercent, fdType, termMonths, termYears }) {
  const P = Number(principal) || 0;
  const r = Number(ratePercent) / 100 || 0;
  let interest = 0;
  let maturityAmount = 0;

  if (fdType === 'monthly') {
    const months = Number(termMonths) || 0;
    const t = months; // time in months
    interest = P * r * t; // simple interest
    maturityAmount = P + interest;
  } else {
    const years = Number(termYears) || 0;
    maturityAmount = P * Math.pow(1 + r, years); // yearly compounding
    interest = maturityAmount - P;
  }

  // round small floating issues to 2 decimals
  interest = Math.round((interest + Number.EPSILON) * 100) / 100;
  maturityAmount = Math.round((maturityAmount + Number.EPSILON) * 100) / 100;

  return { interest, maturityAmount };
}

export default computeFdMaturity;