import mongoose from 'mongoose';

const PaymentGatewayConfigSchema = new mongoose.Schema({
  activeGateway: {
    type: String,
    enum: ['zwitch', 'razorpay', 'paytm', 'cashfree', 'manual'],
    default: 'zwitch',
    required: true
  },
  zwitch: {
    apiUrl: {
      type: String,
      default: 'https://api.zwitch.io/v1' // ZWITCH API base URL
    },
    apiKey: {
      type: String,
      default: ''
    },
    apiSecret: {
      type: String,
      default: ''
    },
    enabled: {
      type: Boolean,
      default: true
    }
  },
  razorpay: {
    keyId: {
      type: String,
      default: ''
    },
    keySecret: {
      type: String,
      default: ''
    },
    enabled: {
      type: Boolean,
      default: false
    }
  },
  paytm: {
    merchantId: {
      type: String,
      default: ''
    },
    merchantKey: {
      type: String,
      default: ''
    },
    enabled: {
      type: Boolean,
      default: false
    }
  },
  cashfree: {
    appId: {
      type: String,
      default: ''
    },
    secretKey: {
      type: String,
      default: ''
    },
    enabled: {
      type: Boolean,
      default: false
    }
  },
  // Settings that apply to all gateways
  settings: {
    minAmount: {
      type: Number,
      default: 1 // Minimum amount in rupees
    },
    maxAmount: {
      type: Number,
      default: 1000000 // Maximum amount in rupees
    },
    autoRetry: {
      type: Boolean,
      default: true
    },
    retryAttempts: {
      type: Number,
      default: 3
    }
  },
  // Metadata
  lastUpdatedBy: {
    type: String,
    default: 'system'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure only one config document exists
PaymentGatewayConfigSchema.statics.getConfig = async function(envConfig = {}) {
  let config = await this.findOne();
  if (!config) {
    // Create default config if none exists
    // envConfig should be passed from route handler with process.env values
    const zwitchApiUrl = envConfig.ZWITCH_API_URL || 'https://api.zwitch.io/v1';
    const zwitchApiKey = envConfig.ZWITCH_API_KEY || '';
    const zwitchApiSecret = envConfig.ZWITCH_API_SECRET || '';
    
    config = await this.create({
      activeGateway: 'zwitch',
      zwitch: {
        apiUrl: zwitchApiUrl,
        apiKey: zwitchApiKey,
        apiSecret: zwitchApiSecret,
        enabled: true
      }
    });
  }
  return config;
};

export default mongoose.models.PaymentGatewayConfig || mongoose.model('PaymentGatewayConfig', PaymentGatewayConfigSchema);

