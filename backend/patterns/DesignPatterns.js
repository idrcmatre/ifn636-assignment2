// =============================================================================
// 1. FACTORY PATTERN - Creating Different Types of Violations
// =============================================================================

/**
 * Violation Factory
 * Problem: Need to create different violation types without coupling client code to specific classes
 * Solution: Factory pattern encapsulates object creation logic
 */
const { SpeedingViolation, ParkingViolation, HelmetViolation, RedLightViolation, MobileUsageViolation, GenericViolation, UserManager, ViolationManager } = require('./ClassHierarchy');
const User = require('../models/User');
const Challan = require('../models/Challan');
const { Payment } = require('../models/Payment');

class ViolationFactory {
    static createViolation(violationData) {
        const { violationType, ...data } = violationData;

        switch (violationType.toLowerCase()) {
            case 'speeding':
                return new SpeedingViolation(data);
            case 'wrong parking':
            case 'parking':
                return new ParkingViolation(data);
            case 'no helmet':
            case 'helmet':
                return new HelmetViolation(data);
            case 'red light':
            case 'red light violation':
                return new RedLightViolation(data);
            case 'mobile phone usage':
            case 'mobile usage':
                return new MobileUsageViolation(data);
            case 'other':  
                return new GenericViolation(data);
            default:
                throw new Error(`Unknown violation type: ${violationType}`);
        }
    }

    static getSupportedViolationTypes() {
        return ['speeding', 'wrong parking', 'no helmet', 'red light'];
    }

    static getViolationInfo(violationType) {
        const infoMap = {
            'speeding': { baseMinFine: 500, maxFine: 1000, description: 'Exceeding speed limit' },
            'wrong parking': { baseMinFine: 100, maxFine: 1500, description: 'Parking in restricted area' },
            'no helmet': { baseMinFine: 300, maxFine: 900, description: 'Riding without helmet' },
            'red light': { baseMinFine: 1000, maxFine: 1500, description: 'Running red light' }
        };

        return infoMap[violationType.toLowerCase()];
    }
}

// =============================================================================
// 2. STRATEGY PATTERN - Different Payment Processing Methods
// =============================================================================

/**
 * Payment Strategy Interface
 * Problem: Need to support multiple payment methods with different processing logic
 * Solution: Strategy pattern allows switching payment algorithms at runtime
 */

// Abstract Strategy
class PaymentStrategy {
    processPayment(amount, paymentDetails) {
        throw new Error("processPayment method must be implemented");
    }

    validatePaymentDetails(paymentDetails) {
        throw new Error("validatePaymentDetails method must be implemented");
    }

    getTransactionFee(amount) {
        throw new Error("getTransactionFee method must be implemented");
    }
}

// Concrete Strategies
class CreditCardPaymentStrategy extends PaymentStrategy {
    processPayment(amount, paymentDetails) {
        this.validatePaymentDetails(paymentDetails);

        const fee = this.getTransactionFee(amount);
        const totalAmount = amount + fee;

        // Simulate credit card processing
        const transactionId = 'CC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        return {
            success: true,
            transactionId,
            amount: totalAmount,
            fee,
            paymentMethod: 'credit_card',
            processedAt: new Date(),
            gateway: 'stripe'
        };
    }

    validatePaymentDetails(paymentDetails) {
        const { cardNumber, expiryDate, cvv, holderName } = paymentDetails;

        if (!cardNumber || cardNumber.length < 16) {
            throw new Error('Invalid card number');
        }
        if (!cvv || cvv.length < 3) {
            throw new Error('Invalid CVV');
        }
        if (!holderName) {
            throw new Error('Card holder name required');
        }
    }

    getTransactionFee(amount) {
        return Math.max(amount * 0.029, 10); // 2.9% or minimum $10
    }
}

class DebitCardPaymentStrategy extends PaymentStrategy {
    processPayment(amount, paymentDetails) {
        this.validatePaymentDetails(paymentDetails);

        const fee = this.getTransactionFee(amount);
        const totalAmount = amount + fee;

        const transactionId = 'DC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        return {
            success: true,
            transactionId,
            amount: totalAmount,
            fee,
            paymentMethod: 'debit_card',
            processedAt: new Date(),
            gateway: 'razorpay'
        };
    }

    validatePaymentDetails(paymentDetails) {
        const { cardNumber, pin, holderName } = paymentDetails;

        if (!cardNumber || cardNumber.length < 16) {
            throw new Error('Invalid card number');
        }
        if (!pin || pin.length !== 4) {
            throw new Error('Invalid PIN');
        }
    }

    getTransactionFee(amount) {
        return Math.min(amount * 0.015, 25); // 1.5% or maximum $25
    }
}

class UPIPaymentStrategy extends PaymentStrategy {
    processPayment(amount, paymentDetails) {
        this.validatePaymentDetails(paymentDetails);

        const fee = this.getTransactionFee(amount);
        const totalAmount = amount + fee;

        const transactionId = 'UPI_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        return {
            success: true,
            transactionId,
            amount: totalAmount,
            fee,
            paymentMethod: 'upi',
            processedAt: new Date(),
            gateway: 'payu'
        };
    }

    validatePaymentDetails(paymentDetails) {
        const { upiId, pin } = paymentDetails;

        if (!upiId || !upiId.includes('@')) {
            throw new Error('Invalid UPI ID');
        }
        if (!pin || pin.length !== 4) {
            throw new Error('Invalid UPI PIN');
        }
    }

    getTransactionFee(amount) {
        return 0; // UPI is typically free
    }
}

// Payment Context Class
class PaymentProcessor {
    constructor() {
        this.strategy = null;
    }

    setPaymentStrategy(strategy) {
        this.strategy = strategy;
    }

    processPayment(amount, paymentDetails, paymentMethod) {
        // Set strategy based on payment method
        switch (paymentMethod) {
            case 'credit_card':
                this.setPaymentStrategy(new CreditCardPaymentStrategy());
                break;
            case 'debit_card':
                this.setPaymentStrategy(new DebitCardPaymentStrategy());
                break;
            case 'upi':
                this.setPaymentStrategy(new UPIPaymentStrategy());
                break;
            default:
                throw new Error(`Unsupported payment method: ${paymentMethod}`);
        }

        return this.strategy.processPayment(amount, paymentDetails);
    }
}

// =============================================================================
// 3. OBSERVER PATTERN - Notification System
// =============================================================================

/**
 * Observer Pattern for Notifications
 * Problem: Need to notify multiple parties when challan status changes
 * Solution: Observer pattern decouples notification logic from business logic
 */

// Subject (Observable)
class ChallanNotificationSubject {
    constructor() {
        this.observers = [];
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    removeObserver(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            try {
                observer.update(event, data);
            } catch (error) {
                console.error('Observer notification error:', error.message);
            }
        });
    }
}

// Observer Interface
class NotificationObserver {
    update(event, data) {
        throw new Error("update method must be implemented");
    }
}

// Concrete Observers
class EmailNotificationObserver extends NotificationObserver {
    constructor(emailService) {
        super();
        this.emailService = emailService;
    }

    update(event, data) {
        try {
            switch (event) {
                case 'challan_created':
                    this.sendChallanCreatedEmail(data);
                    break;
                case 'payment_received':
                    this.sendPaymentConfirmationEmail(data);
                    break;
                case 'challan_disputed':
                    this.sendDisputeNotificationEmail(data);
                    break;
                default:
                    console.log(`Unhandled email event: ${event}`);
            }
        } catch (error) {
            console.error('Email notification error:', error.message);
        }
    }

    sendChallanCreatedEmail(data) {
        const emailContent = {
            to: data.citizenEmail,
            subject: 'New Traffic Violation - E-Challan Issued',
            template: 'challan_created',
            data: data
        };

        if (this.emailService && typeof this.emailService.sendEmail === 'function') {
            this.emailService.sendEmail(emailContent);
        } else {
            console.log('Mock Email (Challan Created):', emailContent);
        }
    }

    sendPaymentConfirmationEmail(data) {
        const emailContent = {
            to: data.citizenEmail,
            subject: 'Payment Confirmation - E-Challan',
            template: 'payment_confirmation',
            data: data
        };

        if (this.emailService && typeof this.emailService.sendEmail === 'function') {
            this.emailService.sendEmail(emailContent);
        } else {
            console.log('Mock Email (Payment Confirmation):', emailContent);
        }
    }

    sendDisputeNotificationEmail(data) {
        const emailContent = {
            to: data.officerEmail,
            subject: 'Challan Disputed - Review Required',
            template: 'challan_disputed',
            data: data
        };

        if (this.emailService && typeof this.emailService.sendEmail === 'function') {
            this.emailService.sendEmail(emailContent);
        } else {
            console.log('Mock Email (Dispute Notification):', emailContent);
        }
    }
}

class SMSNotificationObserver extends NotificationObserver {
    constructor(smsService) {
        super();
        this.smsService = smsService;
    }

    update(event, data) {
        try {
            switch (event) {
                case 'challan_created':
                    this.sendChallanCreatedSMS(data);
                    break;
                case 'payment_received':
                    this.sendPaymentConfirmationSMS(data);
                    break;
                default:
                    console.log(`Unhandled SMS event: ${event}`);
            }
        } catch (error) {
            console.error('SMS notification error:', error.message);
        }
    }

    sendChallanCreatedSMS(data) {
        const message = `New traffic violation issued. Challan: ${data.challanNumber}. Fine: ₹${data.fineAmount}. Pay online to avoid penalties.`;

        if (this.smsService && typeof this.smsService.sendSMS === 'function') {
            this.smsService.sendSMS(data.citizenPhone, message);
        } else {
            console.log('Mock SMS (Challan Created):', { to: data.citizenPhone, message });
        }
    }

    sendPaymentConfirmationSMS(data) {
        const message = `Payment confirmed for Challan ${data.challanNumber}. Amount: ₹${data.amount}. Thank you.`;

        if (this.smsService && typeof this.smsService.sendSMS === 'function') {
            this.smsService.sendSMS(data.citizenPhone, message);
        } else {
            console.log('Mock SMS (Payment Confirmation):', { to: data.citizenPhone, message });
        }
    }
}

class DatabaseLogObserver extends NotificationObserver {
    constructor(logService) {
        super();
        this.logService = logService;
    }

    update(event, data) {
        try {
            const logEntry = {
                timestamp: new Date(),
                event: event,
                challanId: data.challanId,
                userId: data.userId,
                details: data
            };

            if (this.logService && typeof this.logService.logActivity === 'function') {
                this.logService.logActivity(logEntry);
            } else {
                console.log('Mock Log Activity:', logEntry);
            }
        } catch (error) {
            console.error('Database log error:', error.message);
        }
    }
}

// =============================================================================
// 4. SINGLETON PATTERN - Database Connection & Configuration
// =============================================================================

/**
 * Singleton Pattern for Database and Configuration
 * Problem: Need single instance of database connection and app configuration
 * Solution: Singleton ensures only one instance exists throughout application
 */

class DatabaseConnection {
    constructor() {
        if (DatabaseConnection.instance) {
            return DatabaseConnection.instance;
        }

        this.connection = null;
        this.isConnected = false;
        DatabaseConnection.instance = this;
    }

    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    async connect(connectionString) {
        if (this.isConnected) {
            return this.connection;
        }

        try {
            const mongoose = require('mongoose');
            this.connection = await mongoose.connect(connectionString);
            this.isConnected = true;
            console.log('Database connected successfully');
            return this.connection;
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }

    getConnection() {
        if (!this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.connection;
    }

    async disconnect() {
        if (this.isConnected) {
            await this.connection.disconnect();
            this.isConnected = false;
            this.connection = null;
        }
    }
}

class ConfigurationManager {
    constructor() {
        if (ConfigurationManager.instance) {
            return ConfigurationManager.instance;
        }

        this.config = {};
        this.loadConfiguration();
        ConfigurationManager.instance = this;
    }

    static getInstance() {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    loadConfiguration() {
        this.config = {
            database: {
                uri: process.env.MONGO_URI,
                options: {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                }
            },
            jwt: {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_EXPIRES_IN || '30d'
            },
            email: {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                user: process.env.EMAIL_USER,
                password: process.env.EMAIL_PASSWORD
            },
            app: {
                port: process.env.PORT || 5001,
                environment: process.env.NODE_ENV || 'development'
            }
        };
    }

    get(key) {
        const keys = key.split('.');
        let value = this.config;

        for (const k of keys) {
            value = value[k];
            if (value === undefined) break;
        }

        return value;
    }

    set(key, value) {
        const keys = key.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }
}

// =============================================================================
// 5. ADAPTER PATTERN - Payment Gateway Integration
// =============================================================================

/**
 * Adapter Pattern for Payment Gateways
 * Problem: Different payment gateways have different APIs
 * Solution: Adapter pattern creates uniform interface for different gateways
 */

// Target Interface (what our application expects)
class PaymentGatewayInterface {
    processPayment(paymentData) {
        throw new Error("processPayment method must be implemented");
    }

    refundPayment(transactionId, amount) {
        throw new Error("refundPayment method must be implemented");
    }

    getTransactionStatus(transactionId) {
        throw new Error("getTransactionStatus method must be implemented");
    }
}

// Adaptee (external API - Stripe)
class StripeAPI {
    createCharge(amount, currency, source, description) {
        // Simulate Stripe API call
        return {
            id: 'ch_' + Math.random().toString(36).substr(2, 9),
            amount: amount * 100, // Stripe uses cents
            currency,
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000)
        };
    }

    createRefund(chargeId, amount) {
        return {
            id: 're_' + Math.random().toString(36).substr(2, 9),
            charge: chargeId,
            amount: amount * 100,
            status: 'succeeded'
        };
    }

    retrieveCharge(chargeId) {
        return {
            id: chargeId,
            status: 'succeeded',
            amount: 50000, // $500 in cents
            currency: 'usd'
        };
    }
}

// Adapter
class StripeAdapter extends PaymentGatewayInterface {
    constructor() {
        super();
        this.stripeAPI = new StripeAPI();
    }

    processPayment(paymentData) {
        try {
            const { amount, currency = 'usd', cardToken, description } = paymentData;

            const stripeResponse = this.stripeAPI.createCharge(
                amount,
                currency,
                cardToken,
                description
            );

            return {
                success: true,
                transactionId: stripeResponse.id,
                amount: amount,
                currency: stripeResponse.currency,
                status: stripeResponse.status,
                gateway: 'stripe',
                processedAt: new Date()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                gateway: 'stripe'
            };
        }
    }

    refundPayment(transactionId, amount) {
        try {
            const refundResponse = this.stripeAPI.createRefund(transactionId, amount);

            return {
                success: true,
                refundId: refundResponse.id,
                amount: amount,
                status: refundResponse.status,
                gateway: 'stripe'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                gateway: 'stripe'
            };
        }
    }

    getTransactionStatus(transactionId) {
        try {
            const charge = this.stripeAPI.retrieveCharge(transactionId);

            return {
                transactionId: charge.id,
                status: charge.status,
                amount: charge.amount / 100, // Convert from cents
                currency: charge.currency,
                gateway: 'stripe'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                gateway: 'stripe'
            };
        }
    }
}

// Another Adaptee (PayPal API)
class PayPalAPI {
    executePayment(paymentId, payerId) {
        return {
            id: paymentId,
            state: 'approved',
            transactions: [{
                amount: { total: '500.00', currency: 'USD' },
                related_resources: [{
                    sale: {
                        id: 'sale_' + Math.random().toString(36).substr(2, 9),
                        state: 'completed'
                    }
                }]
            }]
        };
    }

    refundSale(saleId, amount) {
        return {
            id: 'refund_' + Math.random().toString(36).substr(2, 9),
            state: 'completed',
            amount: { total: amount.toString(), currency: 'USD' }
        };
    }
}

// Another Adapter
class PayPalAdapter extends PaymentGatewayInterface {
    constructor() {
        super();
        this.paypalAPI = new PayPalAPI();
    }

    processPayment(paymentData) {
        try {
            const { paymentId, payerId } = paymentData;

            const paypalResponse = this.paypalAPI.executePayment(paymentId, payerId);

            return {
                success: true,
                transactionId: paypalResponse.transactions[0].related_resources[0].sale.id,
                amount: parseFloat(paypalResponse.transactions[0].amount.total),
                currency: paypalResponse.transactions[0].amount.currency.toLowerCase(),
                status: paypalResponse.state,
                gateway: 'paypal',
                processedAt: new Date()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                gateway: 'paypal'
            };
        }
    }

    refundPayment(transactionId, amount) {
        try {
            const refundResponse = this.paypalAPI.refundSale(transactionId, amount);

            return {
                success: true,
                refundId: refundResponse.id,
                amount: parseFloat(refundResponse.amount.total),
                status: refundResponse.state,
                gateway: 'paypal'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                gateway: 'paypal'
            };
        }
    }

    getTransactionStatus(transactionId) {
        // Simplified for demo
        return {
            transactionId,
            status: 'completed',
            amount: 500.00,
            currency: 'usd',
            gateway: 'paypal'
        };
    }
}

// Payment Gateway Factory (combining Factory + Adapter patterns)
class PaymentGatewayFactory {
    static createGateway(gatewayType) {
        switch (gatewayType.toLowerCase()) {
            case 'stripe':
                return new StripeAdapter();
            case 'paypal':
                return new PayPalAdapter();
            default:
                throw new Error(`Unsupported payment gateway: ${gatewayType}`);
        }
    }
}

// =============================================================================
// 6. FACADE PATTERN - Simplified Interface for Complex Operations
// =============================================================================

/**
 * Facade Pattern for E-Challan Management
 * Problem: Complex interactions between multiple subsystems for challan operations
 * Solution: Facade provides simplified interface to coordinate multiple operations
 */

class EChallanFacade {
    constructor() {
        this.userManager = new (require('./ClassHierarchy').UserManager)();
        this.violationManager = new (require('./ClassHierarchy').ViolationManager)();
        this.paymentProcessor = new PaymentProcessor();
        this.notificationSubject = new ChallanNotificationSubject();

        // Setup notification observers
        this.setupNotificationObservers();
    }

    setupNotificationObservers() {
        try {
            let emailService, smsService, logService;

            try {
                emailService = require('../utils/emailService');
            } catch (error) {
                emailService = {
                    sendEmail: (emailContent) => {
                        console.log('📧 Mock Email:', emailContent);
                        return Promise.resolve({ success: true });
                    }
                };
            }

            try {
                smsService = require('../utils/smsService');
            } catch (error) {
                smsService = {
                    sendSMS: (phone, message) => {
                        console.log('📱 Mock SMS:', { phone, message });
                        return Promise.resolve({ success: true });
                    }
                };
            }

            try {
                logService = require('../utils/logService');
            } catch (error) {
                logService = {
                    logActivity: (logEntry) => {
                        console.log('📝 Mock Log:', logEntry);
                        return Promise.resolve({ success: true });
                    }
                };
            }

            this.notificationSubject.addObserver(new EmailNotificationObserver(emailService));
            this.notificationSubject.addObserver(new SMSNotificationObserver(smsService));
            this.notificationSubject.addObserver(new DatabaseLogObserver(logService));

            console.log('✅ Notification observers setup successfully');
        } catch (error) {
            console.error('❌ Error setting up notification observers:', error.message);
        }
    }

    // FIXED: Real MongoDB integration for challan creation
    async createChallan(officerId, violationData) {
        try {
            // 1. Validate officer permissions
            const officer = await User.findById(officerId);
            if (!officer) {
                throw new Error('Officer not found');
            }

            const officerOOP = officer.toOOPInstance();
            if (!officerOOP.getPermissions().includes('create_challans')) {
                throw new Error('Officer not authorized to create challans');
            }

            // 2. Find citizen
            const citizen = await User.findOne({ email: violationData.citizenEmail, role: 'citizen' });
            if (!citizen) {
                throw new Error('Citizen not found');
            }

            // 3. Create violation using factory pattern
            const violation = ViolationFactory.createViolation({
                ...violationData,
                citizenId: citizen._id.toString(),
                officerId: officerId
            });

            // 4. Process violation and get calculated fine
            const processedViolation = violation.processViolation();

            // 5. REAL MongoDB save using the integrated model
            const challanDoc = new Challan({
                citizenId: citizen._id,
                officerId: officerId,
                vehicleNumber: violationData.vehicleNumber,
                violationType: processedViolation.violationType,
                location: violationData.location,
                description: violationData.description,
                fineAmount: processedViolation.fineAmount,

                // Violation-specific fields based on type
                speedLimit: violationData.speedLimit,
                actualSpeed: violationData.actualSpeed,
                radarReading: violationData.radarReading,
                zoneType: violationData.zoneType,
                duration: violationData.duration,
                passengerCount: violationData.passengerCount || 1,
                vehicleType: violationData.vehicleType,
                intersectionId: violationData.intersectionId,
                cameraId: violationData.cameraId,
                timeAfterRed: violationData.timeAfterRed,

                evidenceUrl: violationData.evidenceUrl,
                dateTime: new Date()
            });

            const savedChallan = await challanDoc.save();

            // 6. Send notifications using Observer pattern
            this.notificationSubject.notifyObservers('challan_created', {
                challanId: savedChallan._id.toString(),
                challanNumber: savedChallan.challanNumber,
                citizenEmail: citizen.email,
                citizenPhone: citizen.phone,
                officerId: officerId,
                fineAmount: savedChallan.fineAmount,
                violationType: savedChallan.violationType
            });

            return {
                success: true,
                challan: savedChallan.toJSON(),
                message: 'Challan created successfully and saved to database'
            };

        } catch (error) {
            console.error('Error creating challan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // FIXED: Real MongoDB integration for payment processing
    async processPayment(citizenId, challanId, paymentData) {
        try {
            // 1. Validate citizen
            const citizen = await User.findById(citizenId);
            if (!citizen) {
                throw new Error('Citizen not found');
            }

            // 2. Find challan in database
            const challan = await Challan.findById(challanId);
            if (!challan) {
                throw new Error('Challan not found');
            }

            if (challan.citizenId.toString() !== citizenId) {
                throw new Error('Unauthorized access to challan');
            }

            if (challan.status === 'paid') {
                throw new Error('Challan already paid');
            }

            // 3. Process payment using Strategy pattern
            const paymentResult = this.paymentProcessor.processPayment(
                challan.fineAmount,
                paymentData.details,
                paymentData.method
            );

            if (!paymentResult.success) {
                throw new Error('Payment processing failed: ' + paymentResult.error);
            }

            // 4. Save payment record to database
            const paymentDoc = new Payment({
                transactionId: paymentResult.transactionId,
                challanId: challan._id,
                citizenId: citizenId,
                amount: challan.fineAmount,
                fee: paymentResult.fee,
                totalAmount: paymentResult.amount,
                paymentMethod: paymentData.method,
                gateway: paymentResult.gateway,
                gatewayTransactionId: paymentResult.transactionId,
                status: 'completed',
                paymentDetails: {
                    cardLast4: paymentData.details.cardNumber ? paymentData.details.cardNumber.slice(-4) : null,
                    upiId: paymentData.details.upiId
                }
            });

            const savedPayment = await paymentDoc.save();

            // 5. Update challan status
            challan.status = 'paid';
            challan.paymentDate = new Date();
            await challan.save();

            // 6. Send notifications using Observer pattern
            this.notificationSubject.notifyObservers('payment_received', {
                challanId: challan._id.toString(),
                challanNumber: challan.challanNumber,
                citizenEmail: citizen.email,
                citizenPhone: citizen.phone,
                amount: paymentResult.amount,
                transactionId: paymentResult.transactionId
            });

            return {
                success: true,
                payment: savedPayment.toJSON(),
                challan: challan.toJSON(),
                message: 'Payment processed successfully and saved to database'
            };

        } catch (error) {
            console.error('Error processing payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // FIXED: Real MongoDB integration for dashboard
    async getUserDashboard(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const userOOP = user.toOOPInstance();
            let dashboardData = {};

            if (user.role === 'citizen') {
                // Get citizen's challans from database
                const challans = await Challan.find({ citizenId: userId });

                dashboardData = {
                    role: 'citizen',
                    totalChallans: challans.length,
                    pendingChallans: challans.filter(c => c.status === 'pending').length,
                    paidChallans: challans.filter(c => c.status === 'paid').length,
                    totalFineAmount: challans.reduce((sum, c) => sum + c.fineAmount, 0),
                    recentChallans: challans.slice(-5).map(c => c.toJSON())
                };

            } else if (user.role === 'officer') {
                // Get officer's issued challans from database
                const challans = await Challan.find({ officerId: userId });
                const today = new Date().toDateString();

                // Get payment data for collection amount
                const challanIds = challans.map(c => c._id);
                const payments = await Payment.find({
                    challanId: { $in: challanIds },
                    status: 'completed'
                });

                dashboardData = {
                    role: 'officer',

                    issuedChallans: challans.length,
                    todayChallans: challans.filter(c =>
                        new Date(c.dateTime).toDateString() === today
                    ).length,
                    thisMonthChallans: challans.filter(c => {
                        const challanMonth = new Date(c.dateTime).getMonth();
                        const currentMonth = new Date().getMonth();
                        return challanMonth === currentMonth;
                    }).length,
                  
                    collectionAmount: payments.reduce((sum, p) => sum + p.amount, 0), // ← This is missing

                    recentChallans: challans.slice(-5).map(c => c.toJSON())
                };
            }

            return {
                success: true,
                user: userOOP.toJSON(),
                dashboard: dashboardData,
                message: 'Dashboard data retrieved from database'
            };

        } catch (error) {
            console.error('Error getting dashboard:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get all challans with pagination
    async getAllChallans(userId, userRole, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            let query = {};

            // Role-based filtering
            if (userRole === 'citizen') {
                query.citizenId = userId;
            } else if (userRole === 'officer') {
                // Officers can see their own challans or all (depending on permissions)
                query.officerId = userId;
            }

            const challans = await Challan.find(query)
                .populate('citizenId', 'name email')
                .populate('officerId', 'name badgeNumber')
                .sort({ dateTime: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Challan.countDocuments(query);

            return {
                success: true,
                challans: challans.map(c => c.toJSON()),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                message: 'Challans retrieved from database'
            };

        } catch (error) {
            console.error('Error getting challans:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get payment history
    async getPaymentHistory(userId, userRole) {
        try {
            let query = {};

            if (userRole === 'citizen') {
                query.citizenId = userId;
            }

            const payments = await Payment.find(query)
                .populate('challanId', 'challanNumber vehicleNumber violationType')
                .sort({ paymentDate: -1 });

            return {
                success: true,
                payments: payments.map(p => p.toJSON()),
                message: 'Payment history retrieved from database'
            };

        } catch (error) {
            console.error('Error getting payment history:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// =============================================================================
// 7. DECORATOR PATTERN - Adding Features to User Permissions
// =============================================================================

/**
 * Decorator Pattern for User Permissions
 * Problem: Need to dynamically add/remove permissions and features to users
 * Solution: Decorator pattern allows adding behavior without modifying original classes
 */

// Base Component (User Wrapper)
class UserPermissionComponent {
    constructor(user) {
        this.user = user;
    }

    getPermissions() {
        return this.user.getPermissions();
    }

    getDashboardData() {
        return this.user.getDashboardData();
    }

    canPerformAction(action) {
        return this.getPermissions().includes(action);
    }

    getUser() {
        return this.user;
    }
}

// Base Decorator
class UserPermissionDecorator extends UserPermissionComponent {
    constructor(userComponent) {
        super(userComponent.getUser());
        this.wrappedComponent = userComponent;
    }

    getPermissions() {
        return this.wrappedComponent.getPermissions();
    }

    getDashboardData() {
        return this.wrappedComponent.getDashboardData();
    }
}

// Concrete Decorators
class SupervisorPermissionDecorator extends UserPermissionDecorator {
    constructor(userComponent) {
        super(userComponent);
        this.additionalPermissions = [
            'view_team_performance',
            'assign_cases',
            'approve_disputes',
            'generate_team_reports'
        ];
    }

    getPermissions() {
        const basePermissions = super.getPermissions();
        return [...basePermissions, ...this.additionalPermissions];
    }

    async getDashboardData() {
        const baseDashboard = await super.getDashboardData();

        return {
            ...baseDashboard,
            supervisorFeatures: {
                teamMembers: 5,
                pendingApprovals: 3,
                teamPerformance: 85
            }
        };
    }

    getTeamMembers() {
        // Supervisor-specific functionality
        return ['officer1', 'officer2', 'officer3'];
    }
}

class TemporaryAccessDecorator extends UserPermissionDecorator {
    constructor(userComponent, temporaryPermissions, expiryDate) {
        super(userComponent);
        this.temporaryPermissions = temporaryPermissions;
        this.expiryDate = expiryDate;
    }

    getPermissions() {
        const basePermissions = super.getPermissions();

        // Check if temporary access has expired
        if (new Date() > this.expiryDate) {
            return basePermissions;
        }

        return [...basePermissions, ...this.temporaryPermissions];
    }

    async getDashboardData() {
        const baseDashboard = await super.getDashboardData();

        if (new Date() <= this.expiryDate) {
            return {
                ...baseDashboard,
                temporaryAccess: {
                    permissions: this.temporaryPermissions,
                    expiresAt: this.expiryDate,
                    isActive: true
                }
            };
        }

        return baseDashboard;
    }

    isTemporaryAccessActive() {
        return new Date() <= this.expiryDate;
    }
}

class AuditTrailDecorator extends UserPermissionDecorator {
    constructor(userComponent, auditService) {
        super(userComponent);
        this.auditService = auditService;
        this.actionLog = [];
    }

    canPerformAction(action) {
        const canPerform = super.canPerformAction(action);

        // Log the permission check
        this.logAction('permission_check', {
            action: action,
            result: canPerform,
            timestamp: new Date(),
            userId: this.user.getId()
        });

        return canPerform;
    }

    async getDashboardData() {
        const dashboardData = await super.getDashboardData();

        // Log dashboard access
        this.logAction('dashboard_access', {
            timestamp: new Date(),
            userId: this.user.getId()
        });

        return {
            ...dashboardData,
            auditInfo: {
                totalActions: this.actionLog.length,
                lastAction: this.actionLog[this.actionLog.length - 1]
            }
        };
    }

    logAction(actionType, details) {
        const logEntry = {
            actionType,
            details,
            timestamp: new Date()
        };

        this.actionLog.push(logEntry);

        // Send to audit service
        if (this.auditService) {
            this.auditService.logUserAction(logEntry);
        }
    }

    getActionLog() {
        return this.actionLog;
    }
}

class FeatureToggleDecorator extends UserPermissionDecorator {
    constructor(userComponent, enabledFeatures = []) {
        super(userComponent);
        this.enabledFeatures = new Set(enabledFeatures);
    }

    getPermissions() {
        const basePermissions = super.getPermissions();
        const filteredPermissions = basePermissions.filter(permission =>
            this.isFeatureEnabled(permission)
        );

        return filteredPermissions;
    }

    async getDashboardData() {
        const baseDashboard = await super.getDashboardData();

        // Filter dashboard features based on enabled features
        const filteredDashboard = { ...baseDashboard };

        if (!this.isFeatureEnabled('advanced_reports')) {
            delete filteredDashboard.reports;
        }

        if (!this.isFeatureEnabled('notifications')) {
            delete filteredDashboard.notifications;
        }

        return {
            ...filteredDashboard,
            enabledFeatures: Array.from(this.enabledFeatures)
        };
    }

    isFeatureEnabled(feature) {
        return this.enabledFeatures.has(feature) || this.enabledFeatures.has('*');
    }

    enableFeature(feature) {
        this.enabledFeatures.add(feature);
    }

    disableFeature(feature) {
        this.enabledFeatures.delete(feature);
    }
}

// Permission Decorator Factory
class PermissionDecoratorFactory {
    static createDecoratedUser(user, decoratorConfigs = []) {
        let decoratedUser = new UserPermissionComponent(user);

        decoratorConfigs.forEach(config => {
            switch (config.type) {
                case 'supervisor':
                    decoratedUser = new SupervisorPermissionDecorator(decoratedUser);
                    break;
                case 'temporary':
                    decoratedUser = new TemporaryAccessDecorator(
                        decoratedUser,
                        config.permissions,
                        config.expiryDate
                    );
                    break;
                case 'audit':
                    decoratedUser = new AuditTrailDecorator(decoratedUser, config.auditService);
                    break;
                case 'feature_toggle':
                    decoratedUser = new FeatureToggleDecorator(decoratedUser, config.features);
                    break;
            }
        });

        return decoratedUser;
    }
}

// Usage Example for Decorator Pattern
class UserPermissionManager {
    static setupUserWithDecorators(user, userRole, specialAccess = []) {
        const decoratorConfigs = [];

        // Add supervisor permissions for senior officers
        if (userRole === 'officer' && specialAccess.includes('supervisor')) {
            decoratorConfigs.push({ type: 'supervisor' });
        }

        // Add temporary access for specific scenarios
        if (specialAccess.includes('temporary_admin')) {
            decoratorConfigs.push({
                type: 'temporary',
                permissions: ['delete_challans', 'modify_fines'],
                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });
        }

        // Add audit trail for admin users
        if (userRole === 'admin') {
            decoratorConfigs.push({
                type: 'audit',
                auditService: require('../services/auditService')
            });
        }

        // Add feature toggles based on user preferences
        if (specialAccess.includes('beta_features')) {
            decoratorConfigs.push({
                type: 'feature_toggle',
                features: ['advanced_search', 'bulk_operations', 'analytics_dashboard']
            });
        }

        return PermissionDecoratorFactory.createDecoratedUser(user, decoratorConfigs);
    }
}

// =============================================================================
// EXPORT ALL PATTERN IMPLEMENTATIONS
// =============================================================================

module.exports = {
    // Factory Pattern
    ViolationFactory,

    // Strategy Pattern
    PaymentStrategy,
    CreditCardPaymentStrategy,
    DebitCardPaymentStrategy,
    UPIPaymentStrategy,
    PaymentProcessor,

    // Observer Pattern
    ChallanNotificationSubject,
    NotificationObserver,
    EmailNotificationObserver,
    SMSNotificationObserver,
    DatabaseLogObserver,

    // Singleton Pattern
    DatabaseConnection,
    ConfigurationManager,

    // Adapter Pattern
    PaymentGatewayInterface,
    StripeAdapter,
    PayPalAdapter,
    PaymentGatewayFactory,

    // Facade Pattern
    EChallanFacade,

    // Decorator Pattern
    UserPermissionComponent,
    UserPermissionDecorator,
    SupervisorPermissionDecorator,
    TemporaryAccessDecorator,
    AuditTrailDecorator,
    FeatureToggleDecorator,
    PermissionDecoratorFactory,
    UserPermissionManager
};