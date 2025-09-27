// =============================================================================
// REFACTORED AUTHENTICATION MIDDLEWARE - Using OOP and Decorator Pattern
// =============================================================================

/**
 * Enhanced Authentication Middleware
 * Uses OOP principles and design patterns
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { UserPermissionManager, ConfigurationManager } = require('../patterns/DesignPatterns');

class AuthMiddleware {
    constructor() {
        this.config = ConfigurationManager.getInstance();
    }

    /**
     * Protect Route Middleware - Enhanced with OOP
     */
    protect = async (req, res, next) => {
        let token;

        try {
            // Extract token
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }

            if (!token) {
                return res.status(401).json({ message: 'Not authorized, no token' });
            }

            // Verify token
            const jwtConfig = this.config.get('jwt');
            const decoded = jwt.verify(token, jwtConfig.secret);

            // Find user
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            if (!user.isActive) {
                return res.status(401).json({ message: 'User account is deactivated' });
            }

            // Convert to OOP instance and apply decorators
            const userOOP = user.toOOPInstance();
            const decoratedUser = UserPermissionManager.setupUserWithDecorators(
                userOOP,
                user.role,
                user.specialAccess || []
            );

            // Add both Mongoose user and OOP user to request
            req.user = {
                ...user.toObject(),
                id: user._id.toString(),
                oopInstance: decoratedUser,
                getPermissions: () => decoratedUser.getPermissions(),
                canPerformAction: (action) => decoratedUser.canPerformAction(action)
            };

            next();

        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    };

    /**
     * Enhanced Authorization Middleware - Using OOP Permissions
     */
    authorize = (...allowedRoles) => {
        return (req, res, next) => {
            try {
                // Check role-based access
                if (!allowedRoles.includes(req.user.role)) {
                    return res.status(403).json({
                        message: `User role ${req.user.role} is not authorized to access this route`
                    });
                }

                next();
            } catch (error) {
                return res.status(403).json({ message: 'Authorization failed' });
            }
        };
    };

    /**
     * Permission-Based Authorization - Using Decorator Pattern
     */
    requirePermission = (permission) => {
        return (req, res, next) => {
            try {
                if (!req.user || !req.user.canPerformAction(permission)) {
                    return res.status(403).json({
                        message: `Permission '${permission}' required for this action`
                    });
                }

                next();
            } catch (error) {
                return res.status(403).json({ message: 'Permission check failed' });
            }
        };
    };

    requireAnyPermission = (...permissions) => {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(403).json({ message: 'User not authenticated' });
                }

                // Check if user has ANY of the required permissions
                const hasPermission = permissions.some(permission =>
                    req.user.canPerformAction(permission)
                );

                if (!hasPermission) {
                    return res.status(403).json({
                        message: `One of these permissions required: ${permissions.join(', ')}`
                    });
                }

                next();
            } catch (error) {
                return res.status(403).json({ message: 'Permission check failed' });
            }
        };
    };

    /**
     * Rate Limiting Middleware - Using Decorator Pattern
     */
    rateLimitByRole = (limits = {}) => {
        const defaultLimits = {
            citizen: { requests: 100, window: 3600000 }, // 100 requests per hour
            officer: { requests: 500, window: 3600000 }, // 500 requests per hour
            admin: { requests: 1000, window: 3600000 }   // 1000 requests per hour
        };

        const rateLimits = { ...defaultLimits, ...limits };
        const userRequests = new Map();

        return (req, res, next) => {
            try {
                const userId = req.user.id;
                const userRole = req.user.role;
                const now = Date.now();
                const limit = rateLimits[userRole] || rateLimits.citizen;

                if (!userRequests.has(userId)) {
                    userRequests.set(userId, { count: 1, resetTime: now + limit.window });
                    return next();
                }

                const userLimit = userRequests.get(userId);

                if (now > userLimit.resetTime) {
                    userLimit.count = 1;
                    userLimit.resetTime = now + limit.window;
                    return next();
                }

                if (userLimit.count >= limit.requests) {
                    return res.status(429).json({
                        message: 'Rate limit exceeded',
                        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
                    });
                }

                userLimit.count++;
                next();

            } catch (error) {
                next(); // Don't block requests if rate limiting fails
            }
        };
    };

    /**
     * Audit Trail Middleware - Using Observer Pattern
     */
    auditAction = (actionType) => {
        return (req, res, next) => {
            try {
                // Log the action attempt
                const auditData = {
                    userId: req.user?.id,
                    userRole: req.user?.role,
                    action: actionType,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date(),
                    requestBody: this.sanitizeRequestBody(req.body)
                };

                // Use Observer pattern to notify audit systems
                if (req.user?.oopInstance?.logAction) {
                    req.user.oopInstance.logAction(actionType, auditData);
                }

                // Add audit data to request for use in controller
                req.auditData = auditData;

                next();

            } catch (error) {
                console.error('Audit middleware error:', error);
                next(); // Don't block requests if auditing fails
            }
        };
    };

    /**
 * Check if user has ANY of the specified permissions
 */
    requireAnyPermission = (...permissions) => {
        return (req, res, next) => {
            try {
                const hasAnyPermission = permissions.some(permission =>
                    req.user && req.user.canPerformAction(permission)
                );

                if (!hasAnyPermission) {
                    return res.status(403).json({
                        message: `One of these permissions required: ${permissions.join(', ')}`
                    });
                }

                next();
            } catch (error) {
                return res.status(403).json({ message: 'Permission check failed' });
            }
        };
    };

    /**
     * Helper method to sanitize request body for audit logs
     */
    sanitizeRequestBody(body) {
        const sanitized = { ...body };

        // Remove sensitive fields
        const sensitiveFields = ['password', 'cardNumber', 'cvv', 'pin', 'token'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }
}

// Export single instance
const authMiddleware = new AuthMiddleware();
module.exports = authMiddleware;

