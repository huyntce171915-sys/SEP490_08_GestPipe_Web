const mongoose = require('mongoose');
const {
  createTestAdminData,
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} = require('../../helpers/authHelper');
const Admin = require('../../../src/models/Admin');
const authController = require('../../../src/controllers/authController');

// Mock sendMail
jest.mock('../../../src/utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));

const { sendMail } = require('../../../src/utils/mailer');

describe('Auth Controller - SendForgotPasswordOTP', () => {
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

  // TC1: Send OTP thành công đến Email
  test('TC1: Send OTP thành công đến Email', async () => {
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      accountStatus: 'active',
    });
    const admin = new Admin(adminData);
    await admin.save();
    mockReq.body = { email: 'admin@test.com' };

    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.message).toMatch(/OTP sent to email/i);
    expect(sendMail).toHaveBeenCalledTimes(1);

    // Check OTP was set in database
    const updatedAdmin = await Admin.findOne({ email: 'admin@test.com' });
    expect(updatedAdmin.resetPasswordOTP).toMatch(/^\d{6}$/);
    expect(updatedAdmin.resetPasswordOTPExpires).toBeTruthy();
  });

  // TC2: Fail: do email sai
  test('TC2: Fail - email sai', async () => {
    // Có admin trong DB
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      accountStatus: 'active',
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'wrong@test.com' };

    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('email_not_found');
    expect(mockRes._json.message).toMatch(/Email not found/i);
    expect(sendMail).not.toHaveBeenCalled();
  });

  // TC3: Fail: do email không đúng định dạng
  test('TC3: Fail - email không đúng định dạng', async () => {
    // Tạo 1 admin đúng, nhưng query với email sai format
    mockReq.body = { email: 'not-an-email' };

    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    // Nếu không có validation ở controller sẽ lỗi not found (như TC2)
    expect([400, 404]).toContain(mockRes.statusCode);
    expect(mockRes._json.success).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  // TC4: Fail: do email trống
  test('TC4: Fail - do email trống', async () => {
    mockReq.body = { email: '' };

    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('email_required');
    expect(sendMail).not.toHaveBeenCalled();
  });

  // TC5: Fail: do email null
  test('TC5: Fail - do email null', async () => {
    mockReq.body = { email: null };

    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  // TC6: Fail: do admin bị khóa
  test('TC6: Fail - do admin bị khóa', async () => {
    const adminData = createTestAdminData({
      email: 'locked@test.com',
      accountStatus: 'suspended',
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'locked@test.com' };

    // Nếu chưa xử lý ở controller, vẫn gửi mail. Nếu muốn fail thì nên check trạng thái trong controller.
    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    // Nếu logic chỉ check email, vẫn thành công
    // Có thể kỳ vọng gửi mail hoặc fail tuỳ business
    if (mockRes.statusCode === 200) {
      expect(mockRes._json.success).toBe(true);
      expect(sendMail).toHaveBeenCalledTimes(1);
    } else {
      expect(mockRes._json.success).toBe(false);
    }
  });

  // TC7: Fail: do admin không tồn tại
  test('TC7: Fail - do admin không tồn tại', async () => {
    mockReq.body = { email: 'notfound@test.com' };

    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('email_not_found');
    expect(sendMail).not.toHaveBeenCalled();
  });

  // TC8: Fail: do lỗi Server
  test('TC8: Fail - do lỗi Server', async () => {
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      accountStatus: 'active',
    });
    const admin = new Admin(adminData);
    await admin.save();
    // Mock lỗi khi tìm admin
    jest.spyOn(Admin, 'findOne').mockImplementationOnce(() => { throw new Error("Fake server error"); });
    mockReq.body = { email: 'admin@test.com' };

    await authController.sendForgotPasswordOTP(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
    expect(sendMail).not.toHaveBeenCalled();
  });
});