const authController = require('../src/controllers/authController');
const User = require('../src/models/User');
const ApiResponse = require('../src/utils/apiResponse');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../src/models/User');
jest.mock('../src/utils/apiResponse');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
    
    ApiResponse.created.mockImplementation((res, data, msg) => res.status(201).json({ data, msg }));
    ApiResponse.success.mockImplementation((res, data, msg) => res.status(200).json({ data, msg }));
    ApiResponse.conflict.mockImplementation((res, msg) => res.status(409).json({ message: msg }));
    ApiResponse.unauthorized.mockImplementation((res, msg) => res.status(401).json({ message: msg }));
    ApiResponse.badRequest.mockImplementation((res, msg) => res.status(400).json({ message: msg }));
    
    jwt.sign.mockReturnValue('mock-jwt-token');
  });

  describe('Register', () => {
    it('should register successfully with email', async () => {
      req.body = {
        username: 'testuser',
        contact: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        dateOfBirth: '2000-01-01',
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'mock-id',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
      });

      await authController.register(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ username: 'testuser' }, { email: 'test@example.com' }],
      });
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        phone: null,
      }));
      expect(ApiResponse.created).toHaveBeenCalled();
    });

    it('should register successfully with phone', async () => {
      req.body = {
        username: 'testphone',
        contact: '+91 98765 43210',
        password: 'password123',
        displayName: 'Phone User',
        dateOfBirth: '2000-01-01',
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'mock-id',
        username: 'testphone',
        phone: '+919876543210',
        displayName: 'Phone User',
        role: 'user',
      });

      await authController.register(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ username: 'testphone' }, { phone: '+919876543210' }],
      });
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        email: null,
        phone: '+919876543210',
      }));
      expect(ApiResponse.created).toHaveBeenCalled();
    });

    it('should reject duplicate email or phone or username', async () => {
      req.body = {
        username: 'testuser',
        contact: 'test@example.com',
        password: 'password123',
      };

      User.findOne.mockResolvedValue({ _id: 'existing-id' });

      await authController.register(req, res, next);

      expect(ApiResponse.conflict).toHaveBeenCalledWith(res, expect.any(String), 'DUPLICATE_USER');
    });

    it('should reject invalid phone format', async () => {
      req.body = {
        username: 'testuser',
        contact: 'not-an-email-or-phone',
        password: 'password123',
      };

      await authController.register(req, res, next);

      expect(ApiResponse.badRequest).toHaveBeenCalledWith(res, 'Invalid mobile number format');
    });
  });

  describe('Login', () => {
    it('should login with email', async () => {
      req.body = {
        identifier: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: 'mock-id',
        username: 'testuser',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await authController.login(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'test@example.com' }],
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(ApiResponse.success).toHaveBeenCalled();
    });

    it('should login with username or phone', async () => {
      req.body = {
        identifier: 'testuser',
        password: 'password123',
      };

      const mockUser = {
        _id: 'mock-id',
        username: 'testuser',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await authController.login(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ username: 'testuser' }],
      });
      expect(ApiResponse.success).toHaveBeenCalled();
    });

    it('should return generic error on nonexistent identifier', async () => {
      req.body = { identifier: 'nobody', password: 'password123' };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await authController.login(req, res, next);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(res, 'Invalid login credentials.', 'INVALID_CREDENTIALS');
    });

    it('should return generic error on incorrect password', async () => {
      req.body = { identifier: 'testuser', password: 'wrongpassword' };
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      await authController.login(req, res, next);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(res, 'Invalid login credentials.', 'INVALID_CREDENTIALS');
    });
  });
});
