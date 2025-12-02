const mongoose = require('mongoose');
const {
  hashPassword,
  createTestAdminData,
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} = require('../../helpers/authHelpers');
const Admin = require('../../../src/models/Admin');
const authController = require('../../../src/controllers/authController');

describe('Auth Controller - Login', () => {
  let mockReq, mockRes;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
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

  // TC1: Login thành công
  test('TC1: Login thành công', async () => {
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      password: 'password123',
      accountStatus: 'active',
    });
    const admin = new Admin(adminData);
    await admin.save();
    mockReq.body = { email: 'admin@test.com', password: 'password123' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.token).toBeTruthy();
    expect(mockRes._json.message).toMatch(/Login successful/);
    expect(mockRes._json.errorType).toBeUndefined();
  });

  // TC2: Fail: do email sai
  test('TC2: Fail - email sai', async () => {
    const adminData = createTestAdminData({
      email: 'realadmin@test.com',
      password: 'password123',
      accountStatus: 'active',
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'wrongadmin@test.com', password: 'password123' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('email_not_found');
    expect(mockRes._json.message).toMatch(/Email not found/);
  });

  // TC3: Fail: do mật khẩu sai
  test('TC3: Fail - mật khẩu sai', async () => {
    const adminData = createTestAdminData({
      email: 'admin@test.com',
      password: 'rightpassword',
      accountStatus: 'active',
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'admin@test.com', password: 'wrongpassword' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('wrong_password');
    expect(mockRes._json.message).toMatch(/Incorrect password/);
  });

  // TC4: Fail: do email không đúng định dạng
  test('TC4: Fail - email không đúng định dạng', async () => {
    mockReq.body = { email: 'not-an-email', password: 'password123' };

    await authController.login(mockReq, mockRes);

    // Nếu code không validate email format ở controller, lúc findOne sẽ không tìm thấy admin
    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('email_not_found');
  });

  // TC5: Fail: do tài khoản admin bị khóa
  test('TC5: Fail - tài khoản admin bị khóa', async () => {
    const adminData = createTestAdminData({
      email: 'locked@test.com',
      password: 'password123',
      accountStatus: 'suspended',
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'locked@test.com', password: 'password123' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(403);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Account is suspended/);
    expect(mockRes._json.errorType).toBeUndefined();
  });

  // TC6: Fail: do tài khoản không tồn tại
  test('TC6: Fail - tài khoản không tồn tại', async () => {
    mockReq.body = { email: 'notfound@test.com', password: 'password123' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('email_not_found');
    expect(mockRes._json.message).toMatch(/Email not found/);
  });

  // TC7: Thành công: admin lần đầu đăng nhập với mật khẩu tạm
  test('TC7: Thành công - lần đầu đăng nhập với mật khẩu tạm', async () => {
    const tempPassword = 'temppass001';
    const adminData = createTestAdminData({
      email: 'newadmin@test.com',
      password: tempPassword,
      accountStatus: 'inactive',
      isFirstLogin: true,
      temporaryPassword: tempPassword,
    });
    const admin = new Admin(adminData);
    await admin.save();
    mockReq.body = { email: 'newadmin@test.com', password: tempPassword };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.admin.isFirstLogin).toBe(true);
    expect(mockRes._json.redirect).toBe('change-password');
    expect(mockRes._json.message).toMatch(/change your temporary password/);

    // Kiểm tra status đã chuyển active
    const updatedAdmin = await Admin.findOne({ email: 'newadmin@test.com' });
    expect(updatedAdmin.accountStatus).toBe('active');
  });

  // TC8: Fail: lần đầu đăng nhập - nhập sai khẩu tạm
  test('TC8: Fail - lần đầu đăng nhập - sai mật khẩu tạm', async () => {
    const tempPassword = 'temppass002';
    const adminData = createTestAdminData({
      email: 'firstlogin@test.com',
      password: tempPassword,
      accountStatus: 'inactive',
      isFirstLogin: true,
      temporaryPassword: hashPassword(tempPassword),
    });
    await new Admin(adminData).save();
    mockReq.body = { email: 'firstlogin@test.com', password: 'wrongtemp' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.errorType).toBe('wrong_password');
  });

  // TC9: Fail: do email và password đều trống ""
  test('TC9: Fail - email và password đều trống', async () => {
    mockReq.body = { email: '', password: '' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide email and password/i);
  });

  // TC10: Fail: Trống email
  test('TC10: Fail - Trống email', async () => {
    mockReq.body = { email: '', password: 'password123' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide email and password/i);
    expect(mockRes._json.errorType).toBeUndefined();
  });

  // TC11: Fail: Trống password
  test('TC11: Fail - Trống password', async () => {
    mockReq.body = { email: 'admin@test.com', password: '' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide email and password/i);
    expect(mockRes._json.errorType).toBeUndefined();
  });

  // TC12: Fail: email null
  test('TC12: Fail - email null', async () => {
    mockReq.body = { email: null, password: 'password123' };
    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC13: Fail: pw null
  test('TC13: Fail - pw null', async () => {
    mockReq.body = { email: 'admin@test.com', password: null };
    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC14: Fail: email và pw đều null
  test('TC14: Fail - email và pw đều null', async () => {
    mockReq.body = { email: null, password: null };
    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC15: Fail: lỗi server nội bộ
  test('TC15: Fail - lỗi server nội bộ', async () => {
    jest.spyOn(Admin, 'findOne').mockImplementationOnce(() => { throw new Error("Fake server error"); });
    mockReq.body = { email: 'admin@test.com', password: 'password123' };

    await authController.login(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/);
  });
});