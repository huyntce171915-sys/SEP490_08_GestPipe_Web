const mongoose = require('mongoose');
const {
  createTestAdminData,
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} = require('../../helpers/authHelpers');
const Admin = require('../../../src/models/Admin');
const authController = require('../../../src/controllers/authController');

describe('Auth Controller - VerifyForgotPasswordOTP', () => {
  let mockReq, mockRes;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
    mockReq = { body: {}, headers: {}, admin: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: null,
      _json: null,
    };
    mockRes.status.mockImplementation((code) => {
      mockRes.statusCode = code;
      return mockRes;
    });
    mockRes.json.mockImplementation((data) => {
      mockRes._json = data;
      return mockRes;
    });
  });

  // TC1: Verify OTP thành công
  test('TC1: Verify OTP thành công', async () => {
    const OTP = '555777';
    const futureDate = new Date(Date.now() + 60 * 1000); // +1 phút
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      resetPasswordOTP: OTP,
      resetPasswordOTPExpires: futureDate,
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'admin@test.com', otp: "555777" };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.message).toMatch(/OTP verified/);

    // Kiểm tra OTP được xóa khỏi DB
    const updatedAdmin = await Admin.findOne({ email: 'admin@test.com' });
    expect(updatedAdmin.resetPasswordOTP).toBeNull();
    expect(updatedAdmin.resetPasswordOTPExpires).toBeNull();
  });

  // TC2: Fail: do Email sai
  test('TC2: Fail - Email sai', async () => {
    const OTP = '555777';
    const futureDate = new Date(Date.now() + 60 * 1000);
    const adminData = createTestAdminData({
      email: 'realadmin@test.com',
      resetPasswordOTP: OTP,
      resetPasswordOTPExpires: futureDate,
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'wrong@test.com', otp: OTP };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('otp_not_found');
    expect(mockRes._json.message).toMatch(/OTP not found/);
  });

  // TC3: Fail: do Email không tồn tại
  test('TC3: Fail - Email không tồn tại', async () => {
    mockReq.body = { email: 'notfound@test.com', otp: '555777' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('otp_not_found');
    expect(mockRes._json.message).toMatch(/OTP not found/);
  });

  // TC4: Fail: do Email trống
  test('TC4: Fail - Email trống', async () => {
    mockReq.body = { email: '', otp: '555777' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('missing_fields');
    expect(mockRes._json.message).toMatch(/Email and OTP are required/i);
  });

  // TC5: Fail: do Email null
  test('TC5: Fail - Email null', async () => {
    mockReq.body = { email: null, otp: '555777' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('missing_fields');
    expect(mockRes._json.message).toMatch(/Email and OTP are required/i);
  });

  // TC6: Fail: do OTP sai
  test('TC6: Fail - OTP sai', async () => {
    const OTP = '555777';
    const futureDate = new Date(Date.now() + 60 * 1000);
    const adminData = createTestAdminData({
      email: 'adminotp@test.com',
      resetPasswordOTP: OTP,
      resetPasswordOTPExpires: futureDate,
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'adminotp@test.com', otp: '999888' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('invalid_otp');
    expect(mockRes._json.message).toMatch(/Invalid OTP/i);
  });

  // TC7: Fail: do OTP không đúng định dạng
  test('TC7: Fail - OTP không đúng định dạng', async () => {
    const OTP = '555777';
    const futureDate = new Date(Date.now() + 60 * 1000);
    const adminData = createTestAdminData({
      email: 'admintest@test.com',
      resetPasswordOTP: OTP,
      resetPasswordOTPExpires: futureDate,
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'admintest@test.com', otp: 'abcde' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('invalid_otp');
    expect(mockRes._json.message).toMatch(/Invalid OTP/i);
  });

  // TC8: Fail: do OTP hết hạn (expired)
  test('TC8: Fail - OTP hết hạn', async () => {
    const OTP = '555777';
    const pastDate = new Date(Date.now() - 60 * 1000); // Hết hạn
    const adminData = createTestAdminData({
      email: 'expired@test.com',
      resetPasswordOTP: OTP,
      resetPasswordOTPExpires: pastDate,
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'expired@test.com', otp: OTP };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('otp_expired');
    expect(mockRes._json.message).toMatch(/OTP expired/i);
  });

  // TC9: Fail: do OTP trống
  test('TC9: Fail - OTP trống', async () => {
    mockReq.body = { email: 'admin@test.com', otp: '' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('missing_fields');
    expect(mockRes._json.message).toMatch(/Email and OTP are required/i);
  });

  // TC10: Fail: do OTP null
  test('TC10: Fail - OTP null', async () => {
    mockReq.body = { email: 'admin@test.com', otp: null };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('missing_fields');
    expect(mockRes._json.message).toMatch(/Email and OTP are required/i);
  });

  // TC11: Fail: do OTP không tồn tại
  test('TC11: Fail - OTP không tồn tại', async () => {
    const futureDate = new Date(Date.now() + 60 * 1000);
    const adminData = createTestAdminData({
      email: 'nootp@test.com',
      resetPasswordOTP: null, // Không tồn tại
      resetPasswordOTPExpires: futureDate,
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'nootp@test.com', otp: '555777' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('otp_not_found');
    expect(mockRes._json.message).toMatch(/OTP not found/i);
  });

  // TC12: Fail: do Email và OTP trống
  test('TC12: Fail - Email và OTP trống', async () => {
    mockReq.body = { email: '', otp: '' };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('missing_fields');
  });

  // TC13: Fail: do Email và OTP null
  test('TC13: Fail - Email và OTP null', async () => {
    mockReq.body = { email: null, otp: null };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('missing_fields');
  });

  // TC14: Fail: do Lỗi Server
  test('TC14: Fail - Lỗi Server', async () => {
    const OTP = '555777';
    const futureDate = new Date(Date.now() + 60 * 1000);
    const adminData = createTestAdminData({
      email: 'err@test.com',
      resetPasswordOTP: OTP,
      resetPasswordOTPExpires: futureDate,
    });
    await new Admin(adminData).save();
    jest.spyOn(Admin, 'findOne').mockImplementationOnce(() => { throw new Error("Fake server error"); });
    mockReq.body = { email: 'err@test.com', otp: OTP };

    await authController.verifyForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
  });

});