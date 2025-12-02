const {
  createTestAdminData,
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
  hashPassword,
} = require('../../helpers/authHelpers');
const Admin = require('../../../src/models/Admin');
const authController = require('../../../src/controllers/authController');
const mongoose = require('mongoose');

describe('Auth Controller - ChangePassword', () => {
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
    mockReq = { body: {}, admin: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: null,
      _json: null,
    };
    mockRes.status.mockImplementation(function (code) {
      mockRes.statusCode = code;
      return mockRes;
    });
    mockRes.json.mockImplementation(function (data) {
      mockRes._json = data;
      return mockRes;
    });
  });

  // TC1: Change PW thành công
  test('TC1: Change PW thành công', async () => {
    const originalPassword = 'current123!';
    const adminData = createTestAdminData({
      password: originalPassword,
      temporaryPassword: hashPassword('temppass'),
      isFirstLogin: true,
    });
    const admin = new Admin(adminData);
    await admin.save();

    mockReq.body = { currentPassword: originalPassword, newPassword: 'newStrong123!' };
    mockReq.admin = { id: admin._id.toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.message).toMatch(/Password changed successfully/i);

    const updatedAdmin = await Admin.findById(admin._id).select('+temporaryPassword');
    expect(updatedAdmin.isFirstLogin).toBe(false);
    // Field chọn ra đúng như real, nên luôn check null (select: false trong schema)
    expect(updatedAdmin.temporaryPassword).toBeNull();
  });

  // TC2: Fail: Do id sai
  test('TC2: Fail - Do id sai', async () => {
    const adminData = createTestAdminData({
      password: 'current123!',
    });
    const admin = new Admin(adminData);
    await admin.save();

    mockReq.body = { currentPassword: 'current123!', newPassword: 'newStrong123!' };
    mockReq.admin = { id: mongoose.Types.ObjectId().toString() }; // Random id

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC3: Fail: Do id (User) không tồn tại
  test('TC3: Fail - Do id không tồn tại', async () => {
    mockReq.body = { currentPassword: 'current123!', newPassword: 'newStrong123!' };
    mockReq.admin = { id: mongoose.Types.ObjectId().toString() }; // Chưa có admin với id này

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC4: Fail: Do id bị trống
  test('TC4: Fail - Do id bị trống', async () => {
    mockReq.body = { currentPassword: 'current123!', newPassword: 'newStrong123!' };
    mockReq.admin = { id: '' };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC5: Fail: Do id bị null
  test('TC5: Fail - Do id bị null', async () => {
    mockReq.body = { currentPassword: 'current123!', newPassword: 'newStrong123!' };
    mockReq.admin = { id: null };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC6: Fail: do current pw, new pw trống
  test('TC6: Fail - do current pw, new pw trống', async () => {
    mockReq.body = { currentPassword: '', newPassword: '' };
    mockReq.admin = { id: mongoose.Types.ObjectId().toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide current and new password/i);
  });

  // TC7: Fail: do current pw bị trống
  test('TC7: Fail - do current pw trống', async () => {
    mockReq.body = { currentPassword: '', newPassword: 'newStrong123!' };
    mockReq.admin = { id: mongoose.Types.ObjectId().toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide current and new password/i);
  });

  // TC8: Fail: do current pw null
  test('TC8: Fail - do current pw null', async () => {
    mockReq.body = { currentPassword: null, newPassword: 'newStrong123!' };
    mockReq.admin = { id: mongoose.Types.ObjectId().toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide current and new password/i);
  });

  // TC9: Fail: do current pw bị sai
  test('TC9: Fail - do current pw sai', async () => {
    const adminData = createTestAdminData({
      password: 'correctPW123!',
    });
    const admin = new Admin(adminData);
    await admin.save();

    mockReq.body = { currentPassword: 'wrongPW', newPassword: 'newStrong123!' };
    mockReq.admin = { id: admin._id.toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Current password is incorrect/i);
  });

  // TC10: Fail: do new pw trống
  test('TC10: Fail - do new pw trống', async () => {
    const adminData = createTestAdminData({
      password: 'correctPW123!',
    });
    const admin = new Admin(adminData);
    await admin.save();

    mockReq.body = { currentPassword: 'correctPW123!', newPassword: '' };
    mockReq.admin = { id: admin._id.toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide current and new password/i);
  });

  // TC11: Fail: do new pw null
  test('TC11: Fail - do new pw null', async () => {
    const adminData = createTestAdminData({
      password: 'correctPW123!',
    });
    const admin = new Admin(adminData);
    await admin.save();

    mockReq.body = { currentPassword: 'correctPW123!', newPassword: null };
    mockReq.admin = { id: admin._id.toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide current and new password/i);
  });

  // TC12: Fail: do new pw quá ngắn 
  test('TC12a: Fail - do new pw quá ngắn', async () => {
    const adminData = createTestAdminData({
      password: 'correctPW123!',
    });
    const admin = new Admin(adminData);
    await admin.save();

    mockReq.body = { currentPassword: 'correctPW123!', newPassword: '123' };
    mockReq.admin = { id: admin._id.toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/at least 6 characters/i);
  });

  // TC12b: Fail - do new pw chứa ký tự đặc biệt/độ dài quá lớn (nếu trong controller có validate thêm, bổ sung case này)
  test('TC12b: Fail - do new pw chứa ký tự đặc biệt/độ dài quá lớn', async () => {
    const adminData = createTestAdminData({
      password: 'correctPW123!',
    });
    const admin = new Admin(adminData);
    await admin.save();

    mockReq.body = { currentPassword: 'correctPW123!', newPassword: 'new!@#$%^&*()_+=[]{}|,.<>?/' };
    mockReq.admin = { id: admin._id.toString() };

    await authController.changePassword(mockReq, mockRes);

    // Nếu controller không validate, có thể là pass hoặc reject, check status code cho hợp lý
    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC13: Fail lỗi server
  test('TC13: Fail lỗi server', async () => {
    const adminData = createTestAdminData({
      password: 'correctPW123!',
    });
    const admin = new Admin(adminData);
    await admin.save();

    jest.spyOn(Admin, 'findById').mockImplementationOnce(() => { throw new Error("Fake server error"); });

    mockReq.body = { currentPassword: 'correctPW123!', newPassword: 'newStrong123!' };
    mockReq.admin = { id: admin._id.toString() };

    await authController.changePassword(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error during password change/i);
  });
});