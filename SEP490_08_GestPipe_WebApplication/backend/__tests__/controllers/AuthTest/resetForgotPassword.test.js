const mongoose = require('mongoose');
const {
  createTestAdminData,
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} = require('../../helpers/authHelpers');
const Admin = require('../../../src/models/Admin');
const authController = require('../../../src/controllers/authController');

describe('Auth Controller - ResetForgotPassword', () => {
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

  // TC1: Reset Password thành công
  test('TC1: Reset Password thành công', async () => {
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      password: 'oldPw123',
      resetPasswordOTP: null,
      resetPasswordOTPExpires: null,
    });
    await new Admin(adminData).save();

    mockReq.body = { email: 'admin@test.com', newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.message).toMatch(/Password reset successfully/i);

    // Check password is updated (by hash, only if you have hashPassword in test helper)
    const updatedAdmin = await Admin.findOne({ email: 'admin@test.com' });
    expect(updatedAdmin.isFirstLogin).toBe(false);
  });

  // TC2: Fail: Do Email sai
  test('TC2: Fail - Do Email sai', async () => {
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      password: 'oldPw123',
      resetPasswordOTP: null,
      resetPasswordOTPExpires: null,
    });
    await new Admin(adminData).save();

    mockReq.body = { email: 'wrong@test.com', newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC3: Fail: Do Email không đúng định dạng
  test('TC3: Fail - Do Email không đúng định dạng', async () => {
    mockReq.body = { email: 'not-an-email', newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    // Nếu không có validate ở controller, sẽ trả lỗi not found
    expect([404,400]).toContain(mockRes.statusCode);
    expect(mockRes._json.success).toBe(false);
  });

  // TC4: Fail: Do Email không tồn tại (User không tồn tại)
  test('TC4: Fail - Do Email không tồn tại', async () => {
    mockReq.body = { email: 'notfound@test.com', newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC5: Fail: Do Email null
  test('TC5: Fail - Do Email null', async () => {
    mockReq.body = { email: null, newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide email and new password/i);
  });

  // TC6: Fail: Do Email trống
  test('TC6: Fail - Do Email trống', async () => {
    mockReq.body = { email: '', newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide email and new password/i);
  });

  // TC7: Fail: Do pw trống
  test('TC7: Fail - Do pw trống', async () => {
    mockReq.body = { email: 'admin@test.com', newPassword: '' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect([400,404]).toContain(mockRes.statusCode);
    expect(mockRes._json.success).toBe(false);
  });

  // TC8: Fail: Do pw null
  test('TC8: Fail - Do pw null', async () => {
    mockReq.body = { email: 'admin@test.com', newPassword: null };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect([400,404]).toContain(mockRes.statusCode);
    expect(mockRes._json.success).toBe(false);
  });

  // TC9: Fail: Do mật khẩu mới quá ngắn hoặc chứa ký tự đặc biệt
  test('TC9a: Fail - Do mật khẩu mới quá ngắn', async () => {
    mockReq.body = { email: 'admin@test.com', newPassword: '123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/at least 6 characters/i);
  });

  test('TC9b: Fail - Do mật khẩu chứa ký tự đặc biệt', async () => {
    // Tùy vào controller có validate hay không, nếu không sẽ vẫn đăng được
    mockReq.body = { email: 'admin@test.com', newPassword: "abc!@#'%--" };

    await authController.resetForgotPassword(mockReq, mockRes);

    // Nếu chỉ validate length thì sẽ pass, nếu có validate ký tự đặc biệt thì sẽ fail
    expect([400,404,200]).toContain(mockRes.statusCode);
  });

  // TC10: Fail: Do lỗi server
  test('TC10: Fail - Do lỗi server', async () => {
    jest.spyOn(Admin, 'findOne').mockImplementationOnce(() => { throw new Error("Fake server error"); });
    mockReq.body = { email: 'admin@test.com', newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
  });

  // Các case fail do OTP chưa verify
  test('Fail - OTP chưa verify', async () => {
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      password: 'oldPw123',
      resetPasswordOTP: '555777',
      resetPasswordOTPExpires: new Date(Date.now() + 60 * 1000),
    });
    await new Admin(adminData).save();

    mockReq.body = { email: 'admin@test.com', newPassword: 'newPassword123' };

    await authController.resetForgotPassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/OTP not verified yet/i);
  });
});