/**
 * ZWITCH Payment Gateway Integration
 * Documentation: https://docs.zwitch.io/
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Process a bank payout via ZWITCH
 * @param {Object} paymentData - Payment details
 * @param {number} paymentData.driverId - Driver ID
 * @param {number} paymentData.amount - Amount to transfer
 * @param {string} paymentData.accountNumber - Bank account number
 * @param {string} paymentData.ifsc - Bank IFSC code
 * @param {string} paymentData.accountHolderName - Account holder name
 * @param {string} paymentData.purpose - Payment purpose/description
 * @returns {Promise<Object>} Payment response
 */
export async function processZwitchPayout(paymentData) {
  try {
    const token = localStorage.getItem('udriver_token') || 'mock';
    
    const response = await fetch(`${API_BASE}/api/payments/zwitch/payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        driverId: paymentData.driverId,
        amount: paymentData.amount,
        accountNumber: paymentData.accountNumber,
        ifsc: paymentData.ifsc,
        accountHolderName: paymentData.accountHolderName,
        purpose: paymentData.purpose || 'Driver Payment',
        paymentId: paymentData.paymentId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment processing failed');
    }

    return await response.json();
  } catch (error) {
    console.error('ZWITCH payout error:', error);
    throw error;
  }
}

/**
 * Check payout status via ZWITCH
 * @param {string} referenceId - ZWITCH transaction reference ID
 * @returns {Promise<Object>} Status response
 */
export async function checkPayoutStatus(referenceId) {
  try {
    const token = localStorage.getItem('udriver_token') || 'mock';
    
    const response = await fetch(`${API_BASE}/api/payments/zwitch/payout-status/${referenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment status');
    }

    return await response.json();
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
}

/**
 * Verify bank account via ZWITCH
 * @param {Object} bankDetails - Bank account details
 * @returns {Promise<Object>} Verification response
 */
export async function verifyBankAccount(bankDetails) {
  try {
    const token = localStorage.getItem('udriver_token') || 'mock';
    
    const response = await fetch(`${API_BASE}/api/payments/zwitch/verify-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bankDetails)
    });

    if (!response.ok) {
      throw new Error('Bank verification failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Bank verification error:', error);
    throw error;
  }
}
