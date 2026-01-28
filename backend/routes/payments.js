import express from 'express';
import axios from 'axios';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import PaymentGatewayConfig from '../models/paymentGatewayConfig.js';
import Transaction from '../models/transaction.js';
import DriverPlanSelection from '../models/driverPlanSelection.js';
import Driver from '../models/driver.js';

const router = express.Router();

// Cache for gateway config (refreshed on each request for real-time updates)
let configCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 2000; // 2 seconds cache (reduced for faster real-time updates)

/**
 * Get payment gateway configuration (with caching for performance)
 * Priority: Environment variables > Database config
 * Cache is automatically invalidated when config is updated via PUT /config
 */
async function getGatewayConfig(forceRefresh = false) {
  const now = Date.now();
  
  // Force refresh if requested or cache expired
  if (forceRefresh || !configCache || (now - cacheTimestamp) >= CACHE_TTL) {
    // eslint-disable-next-line no-undef
    const env = typeof process !== 'undefined' ? process.env : {};
    
    // Get config from database
    const envConfig = {
      ZWITCH_API_URL: env.ZWITCH_API_URL,
      ZWITCH_API_KEY: env.ZWITCH_API_KEY,
      ZWITCH_API_SECRET: env.ZWITCH_API_SECRET
    };


    console.log('envConfig', envConfig);
    
    const dbConfig = await PaymentGatewayConfig.getConfig(envConfig);
    
    // Priority: Environment variables override database config
    // If env vars are set, use them; otherwise use database config
    // Remove trailing slashes from apiUrl
    let apiUrl = env.ZWITCH_API_URL || dbConfig.zwitch?.apiUrl || 'https://api.zwitch.io';
    // Remove trailing slashes and any /v1 path that might be in the base URL
    apiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
    
    const config = {
      ...dbConfig.toObject ? dbConfig.toObject() : dbConfig,
      zwitch: {
        apiUrl: apiUrl,
        apiKey: env.ZWITCH_API_KEY || dbConfig.zwitch?.apiKey || '',
        apiSecret: env.ZWITCH_API_SECRET || dbConfig.zwitch?.apiSecret || '',
        enabled: dbConfig.zwitch?.enabled !== false // Default to true if not explicitly disabled
      },
      settings: dbConfig.settings || {
        minAmount: 1,
        maxAmount: 1000000,
        autoRetry: true,
        retryAttempts: 3
      }
    };
    
    // Validate credentials are present
    if (config.zwitch.apiKey && config.zwitch.apiSecret) {
      console.log('🔑 ZWITCH Credentials loaded:', {
        apiUrl: config.zwitch.apiUrl,
        apiKeyLength: config.zwitch.apiKey.length,
        apiSecretLength: config.zwitch.apiSecret.length,
        apiKeyPreview: config.zwitch.apiKey.substring(0, 10) + '...'
      });
    } else {
      console.warn('⚠️ ZWITCH credentials incomplete:', {
        hasApiKey: !!config.zwitch.apiKey,
        hasApiSecret: !!config.zwitch.apiSecret
      });
    }
    
    // Log which source is being used (for debugging)
    if (env.ZWITCH_API_KEY) {
      console.log('✅ Using ZWITCH credentials from .env file');
    } else if (dbConfig.zwitch?.apiKey) {
      console.log('✅ Using ZWITCH credentials from database');
    } else {
      console.warn('⚠️ ZWITCH credentials not found in .env or database');
    }
    
    configCache = config;
    cacheTimestamp = now;
    return config;
  }
  
  return configCache;
}

/**
 * Clear config cache (for real-time updates)
 */
function clearConfigCache() {
  configCache = null;
  cacheTimestamp = 0;
}

/**
 * Build ZWITCH API URL properly (handles trailing slashes)
 */
function buildZwitchUrl(baseUrl, endpoint) {
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  return `${cleanBaseUrl}/${cleanEndpoint}`;
}

/**
 * Create payment token for payment collection using ZWITCH PG API
 * This is used to collect payments FROM drivers (not send payouts TO drivers)
 */
async function createPaymentToken(paymentData, config) {
  const { apiUrl, apiKey, apiSecret } = config.zwitch;

  console.log('ZWITCH PG Config:', { apiUrl, apiKeyLength: apiKey?.length, apiSecretLength: apiSecret?.length });
  
  if (!apiKey || !apiSecret) {
    throw new Error('ZWITCH PG API credentials not configured');
  }

  // ZWITCH PG API expects amount in rupees (not paise)
  const amount = parseFloat(paymentData.amount);
  
  // Generate unique merchant order ID (alphanumeric)
  const merchantOrderId = `ORDER${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

  // ZWITCH Payment Gateway API payload structure
  // Using the exact field names that work in Postman
  const payload = {
    amount: amount,
    contact_number: paymentData.phone || paymentData.mobile,
    email_id: paymentData.email || 'driver@udrive.com',
    currency: 'INR',
    mtx: merchantOrderId
  };

  console.log('ZWITCH PG Payload:', JSON.stringify(payload, null, 2));

  // ZWITCH Payment Gateway Token Creation endpoint
  // Correct endpoint path
  const tokenUrl = `${apiUrl}/v1/pg/payment_token`;
  console.log(`🔄 Creating ZWITCH Payment Token: ${tokenUrl}`);
  
  try {
    // Authorization format: Bearer <Access_Key>:<Secret_Key>
    const bearerToken = `${apiKey}:${apiSecret}`;
    
    const response = await axios.post(
      tokenUrl,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log(`✅ ZWITCH Payment Token Created:`, response.data);
    
    const responseData = response.data;
    
    // Log the exact structure to debug
    console.log('📋 Response data structure:', {
      hasId: !!responseData.id,
      hasMtx: !!responseData.mtx,
      hasEntity: !!responseData.entity,
      hasPaymentUrl: !!responseData.payment_url,
      hasUrl: !!responseData.url,
      keys: Object.keys(responseData),
      fullResponse: JSON.stringify(responseData, null, 2)
    });
    
    // ZWITCH returns: { id: "pt_...", mtx: "...", entity: "payment_token", payment_url: "..." }
    const paymentToken = responseData.id;
    const returnedMtx = responseData.mtx || merchantOrderId;
    
    if (!paymentToken) {
      console.error('❌ No payment token found in response:', responseData);
      throw new Error('ZWITCH API did not return a payment token. Response: ' + JSON.stringify(responseData));
    }
    
    console.log('✅ Payment token extracted:', paymentToken);
    console.log('✅ MTX:', returnedMtx);
    
    // Zwitch may return the payment URL in different fields
    // Check all possible field names and construct fallback URL
    const paymentUrl = responseData.payment_url || 
                      responseData.url || 
                      responseData.checkout_url ||
                      responseData.redirect_url ||
                      // Fallback: construct URL using common patterns
                      `https://pay.zwitch.io/${paymentToken}` ||
                      `https://zwitch.io/pay/${paymentToken}`;
    
    console.log('🔗 Payment URL:', paymentUrl);
    console.log('🔗 Full response for debugging:', JSON.stringify(responseData, null, 2));
    
    return {
      success: true,
      data: {
        paymentToken: paymentToken,
        paymentUrl: paymentUrl,
        merchantOrderId: returnedMtx,
        amount: amount,
        gateway: 'zwitch',
        rawResponse: responseData
      },
      message: 'Payment token created successfully'
    };
  } catch (error) {
    console.error('❌ ZWITCH Payment Token Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      fullError: JSON.stringify(error.response?.data, null, 2)
    });
    
    // Handle specific error cases with better error messages
    if (error.response?.status === 401) {
      throw new Error('ZWITCH authentication failed. Please verify your PG API credentials are correct.');
    } else if (error.response?.status === 422) {
      const errorData = error.response?.data;
      const errorMsg = errorData?.error?.message || errorData?.message || JSON.stringify(errorData);
      throw new Error(`ZWITCH validation error: ${errorMsg}`);
    } else if (error.response?.data) {
      const errorData = error.response.data;
      const errorMsg = errorData.error?.message || errorData.message || errorData.error || JSON.stringify(errorData);
      throw new Error(`ZWITCH error: ${errorMsg}`);
    } else if (error.message) {
      throw new Error(`Payment token creation failed: ${error.message}`);
    }
    
    throw new Error(`Payment token creation failed: ${error.toString()}`);
  }
}

/**
 * POST /api/payments/zwitch/create-token
 * Create payment token to collect payment FROM driver
 */
router.post('/zwitch/create-token', async (req, res) => {
  try {
    const {
      driverMobile,
      amount,
      driverName,
      driverEmail,
      planSelectionId,
      paymentType // 'rent', 'deposit', 'penalty', etc.
    } = req.body;

    // Validation
    if (!driverMobile || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: driverMobile, amount'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Get gateway config (real-time)
    let config;
    try {
      config = await getGatewayConfig();
    } catch (configError) {
      console.error('Failed to load gateway config:', configError);
      return res.status(500).json({
        success: false,
        message: 'Failed to load payment gateway configuration'
      });
    }

    // Check if ZWITCH is enabled
    if (!config.zwitch || !config.zwitch.enabled) {
      return res.status(400).json({
        success: false,
        message: 'ZWITCH payment gateway is currently disabled'
      });
    }

    // Check amount limits. Business rule: absolute minimum is ₹1,
    // regardless of what is stored in config/settings.
    const minAmount = 1;
    const maxAmount = config.settings?.maxAmount ?? 1000000;
    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₹${minAmount} and ₹${maxAmount}`
      });
    }

    // Find driver by mobile number (check both Driver and DriverSignup collections)
    let driver = await Driver.findOne({ 
      $or: [
        { mobile: driverMobile },
        { phone: driverMobile }
      ]
    }).lean();
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: `Driver not found with mobile number: ${driverMobile}`
      });
    }

    // Prepare payment data
    const paymentData = {
      amount,
      phone: driverMobile,
      mobile: driverMobile,
      name: driverName || driver.name || 'Driver',
      email: driverEmail || driver.email || `driver${driverMobile}@udrive.com`,
      driverId: driver._id?.toString() || driver.id,
      planSelectionId,
      paymentType: paymentType || 'rent'
    };

    console.log('Creating payment token for driver:', paymentData);

    // Create payment token using ZWITCH PG API
    const result = await createPaymentToken(paymentData, config);

    // Create transaction record
    const transaction = new Transaction({
      type: 'collection', // 'collection' for receiving payments (vs 'payout' for sending)
      gateway: 'zwitch',
      amount: amount,
      status: 'pending',
      driver: driver._id,
      investorId: 'system', // Default for payment collection (not tied to specific investor)
      driverPlanSelection: planSelectionId,
      gatewayTransactionId: result.data.merchantOrderId,
      metadata: {
        paymentToken: result.data.paymentToken,
        paymentType: paymentType,
        merchantOrderId: result.data.merchantOrderId,
        rawResponse: result.data.rawResponse
      }
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Payment token created successfully',
      data: {
        paymentToken: result.data.paymentToken,
        paymentUrl: result.data.paymentUrl,
        merchantOrderId: result.data.merchantOrderId,
        amount: amount,
        transactionId: transaction._id,
        driverName: paymentData.name,
        driverPhone: paymentData.phone
      }
    });

  } catch (error) {
    console.error('Payment token creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment token',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/payments/zwitch/create-token-investor
 * Create payment token to collect payment FROM investor
 */
router.post('/zwitch/create-token-investor', async (req, res) => {
  try {
    const {
      investorPhone,
      amount,
      investorName,
      investorEmail,
      investmentId,
      paymentType // 'investment', 'deposit', etc.
    } = req.body;

    // Validation
    if (!investorPhone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: investorPhone, amount'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Get gateway config (real-time)
    let config;
    try {
      config = await getGatewayConfig();
    } catch (configError) {
      console.error('Failed to load gateway config:', configError);
      return res.status(500).json({
        success: false,
        message: 'Failed to load payment gateway configuration'
      });
    }

    // Check if ZWITCH is enabled
    if (!config.zwitch || !config.zwitch.enabled) {
      return res.status(400).json({
        success: false,
        message: 'ZWITCH payment gateway is currently disabled'
      });
    }

    // Check amount limits for investor collections. Absolute minimum is ₹1.
    const minAmount = 1;
    const maxAmount = config.settings?.maxAmount ?? 1000000;
    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₹${minAmount} and ₹${maxAmount}`
      });
    }

    // Find investor by phone number
    const Investor = (await import('../models/investor.js')).default;
    let investor = await Investor.findOne({ phone: investorPhone }).lean();
    
    if (!investor) {
      // Try InvestorSignup collection
      const InvestorSignup = (await import('../models/investorSignup.js')).default;
      const investorSignup = await InvestorSignup.findOne({ phone: investorPhone }).lean();
      if (!investorSignup) {
        return res.status(404).json({
          success: false,
          message: `Investor not found with phone number: ${investorPhone}`
        });
      }
      // Use investorSignup data
      investor = {
        _id: investorSignup._id,
        id: investorSignup._id?.toString(),
        phone: investorSignup.phone,
        investorName: investorSignup.investorName,
        email: investorSignup.email
      };
    }

    // Prepare payment data
    const paymentData = {
      amount,
      phone: investorPhone,
      mobile: investorPhone,
      name: investorName || investor.investorName || 'Investor',
      email: investorEmail || investor.email || `investor${investorPhone}@udrive.com`,
      investorId: investor._id?.toString() || investor.id,
      investmentId,
      paymentType: paymentType || 'investment'
    };

    console.log('Creating payment token for investor:', paymentData);

    // Create payment token using ZWITCH PG API
    const result = await createPaymentToken(paymentData, config);

    // Create transaction record
    const transaction = new Transaction({
      type: 'collection',
      gateway: 'zwitch',
      amount: amount,
      status: 'pending',
      investorId: investor._id,
      gatewayTransactionId: result.data.merchantOrderId,
      metadata: {
        paymentToken: result.data.paymentToken,
        paymentType: paymentType,
        merchantOrderId: result.data.merchantOrderId,
        investmentId,
        rawResponse: result.data.rawResponse
      }
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Payment token created successfully',
      data: {
        paymentToken: result.data.paymentToken,
        paymentUrl: result.data.paymentUrl,
        merchantOrderId: result.data.merchantOrderId,
        amount: amount,
        transactionId: transaction._id,
        investorName: paymentData.name,
        investorPhone: paymentData.phone
      }
    });

  } catch (error) {
    console.error('Investor payment token creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment token',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/payments/zwitch/callback
 * Handle payment callback from ZWITCH after payment completion
 */
router.post('/zwitch/callback', async (req, res) => {
  try {
    console.log('📥 ZWITCH Payment Webhook Received:', req.body);
    console.log('📥 Headers:', req.headers);

    // Verify webhook signature for security
    const webhookSecret = process.env.ZWITCH_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-zwitch-signature'] || req.headers['zwitch-signature'];
      
      if (signature) {
        const computedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');
        
        if (signature !== computedSignature) {
          console.error('⚠️ Invalid webhook signature');
          return res.status(401).json({
            success: false,
            message: 'Invalid signature'
          });
        }
        console.log('✅ Webhook signature verified');
      } else {
        console.warn('⚠️ No signature header found in webhook');
      }
    }

    const {
      merchant_order_id,
      payment_token,
      status, // 'captured', 'failed', 'cancelled'
      payment_id,
      amount,
      udf1: driverId,
      udf2: planSelectionId,
      udf3: paymentType
    } = req.body;

    // Find transaction by merchant_order_id
    const transaction = await Transaction.findOne({
      'metadata.merchantOrderId': merchant_order_id
    });

    if (!transaction) {
      console.error('Transaction not found for merchant_order_id:', merchant_order_id);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if this is an investor or driver payment
    const isInvestorPayment = transaction.metadata?.investmentId || transaction.metadata?.carInvestmentId;

    // Update transaction based on payment status
    if (status === 'captured') {
      transaction.status = 'completed';
      transaction.gatewayTransactionId = payment_id;
      transaction.metadata = {
        ...transaction.metadata,
        paymentId: payment_id,
        capturedAt: new Date(),
        callbackData: req.body
      };

      // Handle investor payment
      if (isInvestorPayment && transaction.investorId) {
        try {
          const Investor = (await import('../models/investor.js')).default;
          const investor = await Investor.findById(transaction.investorId);
          
          if (investor) {
            const InvestorWallet = (await import('../models/investorWallet.js')).default;
            let wallet = await InvestorWallet.findOne({ phone: investor.phone });
            
            if (!wallet) {
              wallet = new InvestorWallet({ phone: investor.phone, balance: 0, onlinePayments: [] });
            }

            // Initialize onlinePayments array if it doesn't exist
            if (!wallet.onlinePayments) {
              wallet.onlinePayments = [];
            }

            const paymentAmount = parseFloat(amount);

            // Add to wallet balance (credit)
            wallet.balance = (wallet.balance || 0) + paymentAmount;

            // Add to transactions array
            wallet.transactions.push({
              amount: paymentAmount,
              description: `Online payment via ZWITCH - ${transaction.metadata?.paymentType || 'investment'}`,
              type: 'credit',
              date: new Date()
            });

            // Add payment record to onlinePayments array
            wallet.onlinePayments.push({
              date: new Date(),
              amount: paymentAmount,
              mode: 'online',
              type: transaction.metadata?.paymentType || 'investment',
              transactionId: payment_id,
              merchantOrderId: merchant_order_id,
              paymentToken: payment_token,
              gateway: 'ZWITCH',
              status: status,
              investmentId: transaction.metadata?.investmentId
            });

            await wallet.save();
            console.log('✅ Investor wallet updated with online payment:', {
              investorId: transaction.investorId,
              amount: paymentAmount,
              newBalance: wallet.balance,
              paymentType: transaction.metadata?.paymentType
            });

            // Update InvestmentFD record with payment details
            if (transaction.metadata?.investmentId) {
              try {
                const InvestmentFD = (await import('../models/investmentFD.js')).default;
                const investment = await InvestmentFD.findById(transaction.metadata.investmentId);
                
                if (investment) {
                  investment.paymentStatus = 'paid';
                  investment.paymentMode = 'Online';
                  investment.paymentDate = new Date();
                  
                  await investment.save();
                  console.log('✅ InvestmentFD record updated with online payment:', {
                    investmentId: transaction.metadata.investmentId,
                    paymentStatus: 'paid',
                    paymentMode: 'Online',
                    paymentDate: new Date()
                  });

                  // Notify the investor app about completed payment (only if a registered investor exists)
                  try {
                    const { createAndEmitNotification } = await import('../lib/notify.js');
                    // Prefer the investment.investorId if it's a real registered investor id
                    let targetInvestorId = investment.investorId;
                    if (!targetInvestorId) {
                      // try find by phone
                      const InvestorModel = (await import('../models/investor.js')).default;
                      const found = await InvestorModel.findOne({ phone: investment.phone }).lean();
                      if (found && found._id) targetInvestorId = String(found._id);
                    }

                    if (targetInvestorId) {
                      await createAndEmitNotification({
                        type: 'investment_payment_received',
                        title: `Payment received: ₹${investment.investmentAmount}`,
                        message: `Your payment of ₹${investment.investmentAmount} for FD has been received.`,
                        data: { id: investment._id, investmentId: String(investment._id) },
                        recipientType: 'investor',
                        recipientId: String(targetInvestorId)
                      });
                    } else {
                      console.log('[PAYMENTS] No registered investor found for investment - skipping per-user FCM');
                    }
                  } catch (notifErr) {
                    console.warn('Notify (investment payment) failed:', notifErr.message);
                  }
                } else {
                  console.warn('⚠️ InvestmentFD not found:', transaction.metadata.investmentId);
                }
              } catch (fdError) {
                console.error('❌ Error updating InvestmentFD record:', fdError);
              }
            }
          } else {
            console.warn('⚠️ Investor not found:', transaction.investorId);
          }
        } catch (investorError) {
          console.error('❌ Error updating investor wallet:', investorError);
          // Don't fail the webhook if wallet update fails
        }
      }

      // Update driver plan selection if applicable
      if (planSelectionId) {
        try {
          const planSelection = await DriverPlanSelection.findById(planSelectionId);
          if (planSelection) {
            // Initialize driverPayments array if it doesn't exist
            if (!planSelection.driverPayments) {
              planSelection.driverPayments = [];
            }

            // Update payment details
            planSelection.paymentMode = 'online';
            planSelection.paymentMethod = 'ZWITCH';
            planSelection.paymentStatus = 'completed';
            planSelection.paymentDate = new Date();
            planSelection.paymentType = paymentType || 'rent';

            // Add to cumulative paid amount
            const previousAmount = planSelection.paidAmount || 0;
            const newPayment = parseFloat(amount);
            planSelection.paidAmount = previousAmount + newPayment;

            // Add payment record to array
            planSelection.driverPayments.push({
              date: new Date(),
              amount: newPayment,
              mode: 'online',
              type: paymentType || 'rent',
              transactionId: payment_id,
              merchantOrderId: merchant_order_id,
              paymentToken: payment_token,
              gateway: 'ZWITCH',
              status: status
            });

            await planSelection.save();
            console.log('✅ Driver plan selection updated with online payment:', {
              planSelectionId,
              amount: newPayment,
              totalPaid: planSelection.paidAmount,
              paymentType: paymentType
            });

            // Emit notification for driver payment
            try {
              const { createAndEmitNotification } = await import('../lib/notify.js');
              await createAndEmitNotification({
                type: 'driver_payment',
                title: `Driver payment received: ₹${newPayment.toLocaleString('en-IN')}`,
                message: `Payment of ₹${newPayment.toLocaleString('en-IN')} received from driver ${planSelection.driverUsername || planSelection.driverMobile || 'N/A'} via ZWITCH`,
                data: { 
                  selectionId: planSelection._id, 
                  driverId: planSelection.driverId,
                  amount: newPayment,
                  paymentType: paymentType || 'rent',
                  paymentMode: 'online',
                  transactionId: payment_id
                },
                recipientType: 'driver',
                recipientId: planSelection.driverId
              });
            } catch (err) {
              console.warn('Notify failed:', err.message);
            }
          } else {
            console.warn('⚠️ Plan selection not found:', planSelectionId);
          }
        } catch (planError) {
          console.error('❌ Error updating plan selection:', planError);
          // Don't fail the webhook if plan update fails
        }
      }
    } else if (status === 'failed') {
      transaction.status = 'failed';
      transaction.metadata = {
        ...transaction.metadata,
        failureReason: req.body.failure_reason || 'Payment failed',
        callbackData: req.body
      };
    } else if (status === 'cancelled') {
      transaction.status = 'cancelled';
      transaction.metadata = {
        ...transaction.metadata,
        cancelledAt: new Date(),
        callbackData: req.body
      };
    }

    await transaction.save();

    console.log(`Payment ${status} for transaction:`, transaction._id);

    res.json({
      success: true,
      message: `Payment ${status}`,
      transactionId: transaction._id
    });

  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment callback',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/payments/zwitch/status/:merchantOrderId
 * Check payment status by merchant order ID
 */
router.get('/zwitch/status/:merchantOrderId', async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    
    // Find transaction by merchant_order_id
    const transaction = await Transaction.findOne({
      'metadata.merchantOrderId': merchantOrderId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: {
        merchantOrderId: merchantOrderId,
        status: transaction.status,
        amount: transaction.amount,
        gateway: transaction.gateway,
        transactionId: transaction._id,
        paymentToken: transaction.metadata?.paymentToken,
        paymentId: transaction.metadata?.paymentId,
        createdAt: transaction.createdAt,
        metadata: transaction.metadata
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/payments/zwitch/status/:referenceId  
 * Check payout status using ZWITCH API directly (LEGACY - for old payout functionality)
 */
router.get('/zwitch/status/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    const config = await getGatewayConfig();

    if (!config.zwitch.enabled || !config.zwitch.apiKey || !config.zwitch.apiSecret) {
      return res.status(400).json({
        success: false,
        message: 'ZWITCH payment gateway is not configured'
      });
    }

    // ZWITCH API authentication - Official format: Bearer <Access_Key>:<Secret_Key>
    const bearerToken = `${config.zwitch.apiKey}:${config.zwitch.apiSecret}`;
    
    // Try multiple endpoint paths for status check
    const statusEndpoints = [
      `/transfers/${referenceId}`,
      `/transfer/${referenceId}`,
      `/payouts/${referenceId}`,
      `/payout/${referenceId}`,
      `/transfers/payout/${referenceId}`
    ];
    
    let statusResponse = null;
    let lastStatusError = null;
    
    for (const endpointPath of statusEndpoints) {
      try {
        const statusUrl = buildZwitchUrl(config.zwitch.apiUrl, endpointPath);
        console.log(`🔄 Trying status endpoint: ${statusUrl}`);
        
        const response = await axios.get(
          statusUrl,
          {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 15000
          }
        );
        
        console.log(`✅ Status check success with endpoint: ${endpointPath}`);
        statusResponse = response;
        break;
      } catch (endpointError) {
        lastStatusError = endpointError;
        if (endpointError.response?.status !== 404) {
          throw endpointError; // If it's not 404, re-throw to handle auth/data errors
        }
      }
    }
    
    if (!statusResponse) {
      throw lastStatusError || new Error('Status endpoint not found');
    }
    
    const response = statusResponse;

    const responseData = response.data;
    const payoutData = responseData.data || responseData;

    res.json({
      success: true,
      data: {
        referenceId: referenceId,
        status: payoutData.status || responseData.status,
        amount: payoutData.amount ? payoutData.amount / 100 : null, // Convert from paise to rupees
        transactionId: payoutData.transaction_id || payoutData.id || responseData.transaction_id,
        gateway: 'zwitch',
        details: responseData
      }
    });
  } catch (error) {
    console.error('Status check error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to fetch payment status';
    
    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage
    });
  }
});

/**
 * POST /api/payments/zwitch/verify-account
 * Verify bank account details using ZWITCH API directly
 */
router.post('/zwitch/verify-account', async (req, res) => {
  const { accountNumber, ifsc } = req.body;

  if (!accountNumber || !ifsc) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: accountNumber, ifsc'
    });
  }

  let config;
  let verifyUrl;
  try {
    config = await getGatewayConfig();

    if (!config.zwitch.enabled || !config.zwitch.apiKey || !config.zwitch.apiSecret) {
      return res.status(400).json({
        success: false,
        message: 'ZWITCH payment gateway is not configured'
      });
    }

    // ZWITCH API authentication - Try different formats
    // Format 1: Separate headers (most common for payment gateways)
    verifyUrl = buildZwitchUrl(config.zwitch.apiUrl, '/accounts/verify');
    
    console.log('Attempting ZWITCH API call with:', {
      url: verifyUrl,
      apiUrl: config.zwitch.apiUrl,
      apiKey: config.zwitch.apiKey ? `${config.zwitch.apiKey.substring(0, 10)}...` : 'missing',
      apiKeyLength: config.zwitch.apiKey?.length || 0,
      hasSecret: !!config.zwitch.apiSecret,
      apiSecretLength: config.zwitch.apiSecret?.length || 0
    });

    let response;
    let authMethod = '';

    // Try Method 1: Bearer Token (Official ZWITCH format: Bearer <Access_Key>:<Secret_Key>)
    try {
      authMethod = 'Bearer Token (Official)';
      const bearerToken = `${config.zwitch.apiKey}:${config.zwitch.apiSecret}`;
      response = await axios.post(
        verifyUrl,
        {
          account_number: accountNumber,
          ifsc: ifsc.toUpperCase()
        },
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );
      console.log('✅ Authentication successful with:', authMethod);
    } catch (error1) {
      if (error1.response?.status === 401) {
        console.log('Method 1 (Bearer) failed, trying Method 2 (Separate Headers)...');
        // Try Method 2: Separate API Key and Secret headers
        try {
          authMethod = 'Separate Headers';
          response = await axios.post(
            verifyUrl,
            {
              account_number: accountNumber,
              ifsc: ifsc.toUpperCase()
            },
            {
              headers: {
                'X-API-Key': config.zwitch.apiKey,
                'X-API-Secret': config.zwitch.apiSecret,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              timeout: 15000
            }
          );
          console.log('✅ Authentication successful with:', authMethod);
        } catch (error2) {
          if (error2.response?.status === 401) {
            console.log('Method 2 failed, trying Method 3 (Basic Auth)...');
            // Try Method 3: Basic Auth
            authMethod = 'Basic Auth';
            const basicAuth = Buffer.from(`${config.zwitch.apiKey}:${config.zwitch.apiSecret}`).toString('base64');
            response = await axios.post(
              verifyUrl,
              {
                account_number: accountNumber,
                ifsc: ifsc.toUpperCase()
              },
              {
                headers: {
                  'Authorization': `Basic ${basicAuth}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                timeout: 15000
              }
            );
            console.log('✅ Authentication successful with:', authMethod);
          } else {
            throw error2;
          }
        }
      } else {
        throw error1;
      }
    }

    const responseData = response.data;
    const accountData = responseData.data || responseData;

    res.json({
      success: true,
      data: {
        verified: accountData.verified !== undefined ? accountData.verified : (responseData.verified || true),
        accountHolderName: accountData.account_holder_name || 
                          accountData.beneficiary_name || 
                          responseData.account_holder_name || 
                          responseData.beneficiary_name || 
                          '',
        bankName: accountData.bank_name || responseData.bank_name || '',
        ifsc: ifsc.toUpperCase(),
        accountNumber: accountNumber,
        details: responseData
      }
    });
  } catch (error) {
    // Get config if not already fetched
    if (!config) {
      try {
        config = await getGatewayConfig();
      } catch (configError) {
        console.error('Failed to get config:', configError);
      }
    }

    console.error('Account verification error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      apiKey: config?.zwitch?.apiKey ? `${config.zwitch.apiKey.substring(0, 8)}...` : 'missing',
      apiKeyLength: config?.zwitch?.apiKey?.length || 0,
      apiUrl: config?.zwitch?.apiUrl || 'unknown',
      url: verifyUrl || (config?.zwitch?.apiUrl ? buildZwitchUrl(config.zwitch.apiUrl, '/accounts/verify') : 'unknown')
    });
    
    // If Basic Auth fails, try Bearer token
    if (error.response?.status === 401 && config?.zwitch?.apiKey && config?.zwitch?.apiSecret) {
      console.log('Retrying account verification with Bearer token...');
      try {
        const bearerToken = `${config.zwitch.apiKey}:${config.zwitch.apiSecret}`;
        const retryUrl = buildZwitchUrl(config.zwitch.apiUrl, '/accounts/verify');
        const retryResponse = await axios.post(
          retryUrl,
          {
            account_number: accountNumber,
            ifsc: ifsc.toUpperCase()
          },
          {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 15000
          }
        );
        
        const responseData = retryResponse.data;
        const accountData = responseData.data || responseData;
        
        return res.json({
          success: true,
          data: {
            verified: accountData.verified !== undefined ? accountData.verified : (responseData.verified || true),
            accountHolderName: accountData.account_holder_name || 
                              accountData.beneficiary_name || 
                              responseData.account_holder_name || 
                              responseData.beneficiary_name || 
                              '',
            bankName: accountData.bank_name || responseData.bank_name || '',
            ifsc: ifsc.toUpperCase(),
            accountNumber: accountNumber,
            details: responseData
          }
        });
      } catch (retryError) {
        console.error('Bearer token retry also failed:', retryError.response?.data);
      }
    }
    
    const errorData = error.response?.data;
    let errorMessage = 'Account verification failed';
    
    if (errorData) {
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : JSON.stringify(errorData.error);
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage,
      details: error.response?.data || undefined
    });
  }
});

/**
 * POST /api/payments/zwitch/webhook
 * Webhook endpoint for ZWITCH callbacks
 */
router.post('/zwitch/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookData = JSON.parse(req.body);
    const { event, data } = webhookData;

    console.log('ZWITCH Webhook received:', event, data);

    // Update transaction status based on webhook
    if (data.reference_id || data.transaction_id) {
      const transaction = await Transaction.findOne({
        'metadata.referenceId': data.reference_id || data.transaction_id
      });

      if (transaction) {
        if (event === 'payout.success' || event === 'payout.completed') {
          transaction.status = 'completed';
        } else if (event === 'payout.failed' || event === 'payout.rejected') {
          transaction.status = 'failed';
        } else if (event === 'payout.processing') {
          transaction.status = 'pending';
        }
        await transaction.save();
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/**
 * GET /api/payments/config
 * Get current payment gateway configuration (admin only)
 */
router.get('/config', async (req, res) => {
  try {
    const config = await getGatewayConfig();
    
    // Return config without sensitive data
    res.json({
      success: true,
      data: {
        activeGateway: config.activeGateway,
        zwitch: {
          enabled: config.zwitch.enabled,
          apiUrl: config.zwitch.apiUrl,
          apiKeyConfigured: !!config.zwitch.apiKey
        },
        razorpay: {
          enabled: config.razorpay.enabled,
          keyIdConfigured: !!config.razorpay.keyId
        },
        paytm: {
          enabled: config.paytm.enabled,
          merchantIdConfigured: !!config.paytm.merchantId
        },
        cashfree: {
          enabled: config.cashfree.enabled,
          appIdConfigured: !!config.cashfree.appId
        },
        settings: config.settings,
        lastUpdated: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment gateway configuration'
    });
  }
});

/**
 * PUT /api/payments/config
 * Update payment gateway configuration (admin only)
 * This allows real-time switching of payment gateways
 */
router.put('/config', async (req, res) => {
  try {
    const {
      activeGateway,
      zwitch,
      razorpay,
      paytm,
      cashfree,
      settings
    } = req.body;

    let config = await PaymentGatewayConfig.findOne();
    
    if (!config) {
      config = new PaymentGatewayConfig();
    }

    // Update active gateway
    if (activeGateway && ['zwitch', 'razorpay', 'paytm', 'cashfree', 'manual'].includes(activeGateway)) {
      config.activeGateway = activeGateway;
    }

    // Update ZWITCH config
    if (zwitch) {
      if (zwitch.apiUrl !== undefined) {
        // Remove trailing slashes from apiUrl
        config.zwitch.apiUrl = zwitch.apiUrl.replace(/\/+$/, '');
      }
      if (zwitch.apiKey !== undefined) config.zwitch.apiKey = zwitch.apiKey;
      if (zwitch.apiSecret !== undefined) config.zwitch.apiSecret = zwitch.apiSecret;
      if (zwitch.enabled !== undefined) config.zwitch.enabled = zwitch.enabled;
    }

    // Update Razorpay config
    if (razorpay) {
      if (razorpay.keyId !== undefined) config.razorpay.keyId = razorpay.keyId;
      if (razorpay.keySecret !== undefined) config.razorpay.keySecret = razorpay.keySecret;
      if (razorpay.enabled !== undefined) config.razorpay.enabled = razorpay.enabled;
    }

    // Update Paytm config
    if (paytm) {
      if (paytm.merchantId !== undefined) config.paytm.merchantId = paytm.merchantId;
      if (paytm.merchantKey !== undefined) config.paytm.merchantKey = paytm.merchantKey;
      if (paytm.enabled !== undefined) config.paytm.enabled = paytm.enabled;
    }

    // Update Cashfree config
    if (cashfree) {
      if (cashfree.appId !== undefined) config.cashfree.appId = cashfree.appId;
      if (cashfree.secretKey !== undefined) config.cashfree.secretKey = cashfree.secretKey;
      if (cashfree.enabled !== undefined) config.cashfree.enabled = cashfree.enabled;
    }

    // Update settings
    if (settings) {
      if (settings.minAmount !== undefined) config.settings.minAmount = settings.minAmount;
      if (settings.maxAmount !== undefined) config.settings.maxAmount = settings.maxAmount;
      if (settings.autoRetry !== undefined) config.settings.autoRetry = settings.autoRetry;
      if (settings.retryAttempts !== undefined) config.settings.retryAttempts = settings.retryAttempts;
    }

    config.lastUpdatedBy = req.user?.email || req.user?.id || 'system';
    await config.save();

    // Clear cache immediately for real-time updates
    clearConfigCache();

    res.json({
      success: true,
      message: 'Payment gateway configuration updated successfully',
      data: {
        activeGateway: config.activeGateway,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update payment gateway configuration'
    });
  }
});

export default router;

