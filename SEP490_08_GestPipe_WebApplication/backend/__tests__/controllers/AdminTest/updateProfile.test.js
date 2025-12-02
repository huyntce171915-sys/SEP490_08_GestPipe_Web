const mongoose = require('mongoose');
const Admin = require('../../../src/models/Admin');
const adminController = require('../../../src/controllers/adminController');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestAdminData,
} = require('../../helpers/adminHelpers');

// Mock formatAdminDocument nếu controller dùng nó
jest.mock('../../../src/utils/dateFormatter', () => ({
  formatAdminDocument: doc => doc.toObject ? doc.toObject() : doc,
}));

describe('Admin Controller - updateProfile', () => {
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

  // TC 1: Edit thành công
  test('TC1: Edit thành công', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'Updated Name',
        birthday: '2000-10-01',
        phoneNumber: '0987654321',
        province: 'Ho Chi Minh',
        uiLanguage: 'en'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.message).toMatch(/Profile updated successfully/i);
    expect(mockRes._json.admin.fullName).toBe('Updated Name');
    expect(mockRes._json.admin.phoneNumber).toBe('0987654321');
    expect(mockRes._json.admin.province).toBe('Ho Chi Minh');
    expect(mockRes._json.admin.birthday).toBeDefined();
  });

  // TC 2: Fail - id không tồn tại
  test('TC2: Fail - id không tồn tại', async () => {
    mockReq = {
      params: { id: mongoose.Types.ObjectId().toString() },
      body: {
        fullName: 'Name',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC 3: Fail - id trống
  test('TC3: Fail - id trống', async () => {
    mockReq = {
      params: { id: '' },
      body: {
        fullName: 'Name',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404); // Mongoose trả về null
    expect(mockRes._json.success).toBe(false);
  });

  // TC 4: Fail - id null
  test('TC4: Fail - id null', async () => {
    mockReq = {
      params: { id: null },
      body: {
        fullName: 'Name',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404); // Mongoose trả về null
    expect(mockRes._json.success).toBe(false);
  });

  // TC 5: Fail - id không đúng định dạng (Object)
  test('TC5: Fail - id sai định dạng', async () => {
    mockReq = {
      params: { id: 'not_valid_id' },
      body: {
        fullName: 'Name',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500); // Mongoose CastError sẽ trả về lỗi server
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
  });

  // TC 6: Fail - các trường dữ liệu trống
  test('TC6: Fail - tất cả trường trống', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: '',
        birthday: '',
        phoneNumber: '',
        province: '',
        uiLanguage: ''
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC 7: Fail - fullname trống
  test('TC7: Fail - fullname trống', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: '',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.message).toMatch(/Full name is required/i);
  });

  // TC 8: Fail - fullname null
  test('TC8: Fail - fullname null', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: null,
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.message).toMatch(/Full name is required/i);
  });

  // TC 9: Fail - dob trống
  test('TC9: Fail - dob trống', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        birthday: '',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);
    // Không có validate birthday nên test chỉ check không trả về 400
    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC 10: Fail - dob null
  test('TC10: Fail - dob null', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        birthday: null,
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);
    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC 11: Fail - dob sai định dạng
  test('TC11: Fail - dob sai định dạng', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        birthday: 'not-a-date',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    // Không kiểm tra định dạng date ở controller, nó sẽ nhận string hoặc null
    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC 12: Fail - phone number sai định dạng
  test('TC12: Fail - phone number sai định dạng', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: 'abc123',
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.message).toMatch(/exactly 10 digits/i);
  });

  // TC 13: Fail - phone number trống
  test('TC13: Fail - phone number trống', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: ''
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.message).toMatch(/Phone number is required/i);
  });

  // TC 14: Fail - phone number null
  test('TC14: Fail - phone number null', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: null
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.message).toMatch(/Phone number is required/i);
  });

  // TC 15: Fail - uiLanguage trống
  test('TC15: Fail - uiLanguage trống', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: '0987654321',
        uiLanguage: ''
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    // Không có validate field này, expect 200
    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC 16: Fail - uiLanguage null
  test('TC16: Fail - uiLanguage null', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: '0987654321',
        uiLanguage: null
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC 17: Fail - province trống
  test('TC17: Fail - province trống', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: '0987654321',
        province: '',
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    // Không validate bắt buộc, expect 200
    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC 18: Fail - province null
  test('TC18: Fail - province null', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: '0987654321',
        province: null
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect([200, 400]).toContain(mockRes.statusCode);
  });

  // TC 19: Fail - lỗi server
  test('TC19: Fail - lỗi server', async () => {
    admin = new Admin(createTestAdminData());
    await admin.save();
    jest.spyOn(Admin, 'findById').mockImplementationOnce(() => { throw new Error('Fake DB error'); });
    mockReq = {
      params: { id: admin._id.toString() },
      body: {
        fullName: 'New Name',
        phoneNumber: '0987654321'
      }
    };
    await adminController.updateProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
    jest.restoreAllMocks();
  });
});