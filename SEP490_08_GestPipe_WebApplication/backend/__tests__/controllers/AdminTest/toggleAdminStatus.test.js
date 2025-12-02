const mongoose = require('mongoose');
const Admin = require('../../../src/models/Admin');
const adminController = require('../../../src/controllers/adminController');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestAdminData,
} = require('../../helpers/adminHelpers');

jest.mock('../../../src/utils/dateFormatter', () => ({
  formatAdminDocument: doc => doc.toObject ? doc.toObject() : doc,
}));

describe('Admin Controller - toggleAdminStatus', () => {
  let mockReq, mockRes, admin;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: null,
      _json: null,
    };
    mockRes.status.mockImplementation(code => {
      mockRes.statusCode = code;
      return mockRes;
    });
    mockRes.json.mockImplementation(data => {
      mockRes._json = data;
      return mockRes;
    });
  });

  // TC1: Toggle admin từ active -> suspended
  test('TC1: Toggle status admin từ active sang suspended', async () => {
    admin = new Admin(createTestAdminData({ accountStatus: 'active' }));
    await admin.save();
    mockReq = { params: { id: admin._id.toString() } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.admin.accountStatus).toBe('suspended');
  });

  // TC2: Toggle admin từ suspended -> active
  test('TC2: Toggle status admin từ suspended sang active', async () => {
    admin = new Admin(createTestAdminData({ accountStatus: 'suspended' }));
    await admin.save();
    mockReq = { params: { id: admin._id.toString() } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.admin.accountStatus).toBe('active');
  });

  // TC3: Fail - id không tồn tại
  test('TC3: Fail - id không tồn tại', async () => {
    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC4: Fail - id trống
  test('TC4: Fail - id trống', async () => {
    mockReq = { params: { id: '' } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    // Mongoose trả về null với id trống → 404
    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
  });

  // TC5: Fail - id null
  test('TC5: Fail - id null', async () => {
    mockReq = { params: { id: null } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    // Mongoose trả về null với id null → 404
    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
  });

  // TC6: Fail - id không đúng định dạng
  test('TC6: Fail - id không đúng định dạng', async () => {
    mockReq = { params: { id: 'invalid_id' } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    // CastError: trả về 500 nếu controller không catch, nhưng nếu trả về 404 thì sửa lại mong đợi
    // Nếu controller validate ObjectId trả về 404, else là 500
    expect([404, 500]).toContain(mockRes.statusCode);
    expect(mockRes._json.success).toBe(false);
  });

  // TC7: Fail - role là superadmin
  test('TC7: Fail - role là superadmin', async () => {
    admin = new Admin(createTestAdminData({ role: 'superadmin', accountStatus: 'active' }));
    await admin.save();
    mockReq = { params: { id: admin._id.toString() } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(403);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Cannot change SuperAdmin status/i);
  });

  // TC8: Fail - lỗi kết nối server
  test('TC8: Fail - lỗi server', async () => {
    admin = new Admin(createTestAdminData({ accountStatus: 'active' }));
    await admin.save();
    jest.spyOn(Admin, 'findById').mockImplementationOnce(() => { throw new Error('Fake DB error'); });

    mockReq = { params: { id: admin._id.toString() } };

    await adminController.toggleAdminStatus(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
    jest.restoreAllMocks();
  });
});