/**
 * Challan Routes - Updated for OOP Controllers
 */

const express = require('express');

const challanController = require('../controllers/challanController');
const authMiddleware = require('../middleware/authMiddleware');

const challanRouter = express.Router();

// Dashboard statistics - available to all authenticated users
challanRouter.get('/stats',
    authMiddleware.protect,
    authMiddleware.rateLimitByRole(),
    challanController.getDashboardStats.bind(challanController)
);

// Challan collection routes
challanRouter.route('/')
    .get(
        authMiddleware.protect,
        authMiddleware.requireAnyPermission('view_challans', 'view_own_challans'), // ← Fixed permissions
        authMiddleware.rateLimitByRole(),
        authMiddleware.auditAction('view_challans'),
        challanController.getChallans.bind(challanController)
    )
    .post(
        authMiddleware.protect,
        authMiddleware.authorize('officer', 'admin'),
        authMiddleware.requirePermission('create_challans'),
        authMiddleware.auditAction('create_challan'),
        challanController.createChallan.bind(challanController)
    );

// Individual challan routes
challanRouter.route('/:id')
    .get(
        authMiddleware.protect,
        authMiddleware.auditAction('view_specific_challan'),
        challanController.getChallanById.bind(challanController)
    )
    .put(
        authMiddleware.protect,
        authMiddleware.auditAction('update_challan'),
        challanController.updateChallan.bind(challanController)
    )
    .delete(
        authMiddleware.protect,
        authMiddleware.authorize('officer', 'admin'),
        authMiddleware.requirePermission('delete_challans'),
        authMiddleware.auditAction('delete_challan'),
        challanController.deleteChallan.bind(challanController)
    );

module.exports.challanRoutes = challanRouter;