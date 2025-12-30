import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Compute FD maturity (shared frontend helper)
export function computeFdMaturity({ principal, ratePercent, fdType, termMonths, termYears }) {
  const P = Number(principal) || 0;
  const r = Number(ratePercent) / 100 || 0;
  let interest = 0;
  let maturityAmount = 0;

  if (fdType === 'monthly') {
    const months = Number(termMonths) || 0;
    const t = months ; // time in years
    interest = P * r * t; // simple interest
    maturityAmount = P + interest;
  } else {
    const years = Number(termYears) || 0;
    maturityAmount = P * Math.pow(1 + r, years); // yearly compounding
    interest = maturityAmount - P;
  }

  // rounding
  interest = Math.round((interest + Number.EPSILON) * 100) / 100;
  maturityAmount = Math.round((maturityAmount + Number.EPSILON) * 100) / 100;

  return { interest, maturityAmount };
}
