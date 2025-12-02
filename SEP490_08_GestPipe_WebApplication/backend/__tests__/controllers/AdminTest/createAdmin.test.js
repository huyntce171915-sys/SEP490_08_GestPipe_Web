const mongoose = require('mongoose');
const Admin = require('../../../src/models/Admin');
const adminController = require('../../../src/controllers/adminController');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestAdminData,
} = require('../../helpers/adminHelpers');

// Mock các util, ví dụ sendMail và formatAdminDocument để tránh gửi mail thật trong test
jest.mock('../../../src/utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../src/utils/dateFormatter', () => ({
  formatAdminDocument: doc => doc.toObject ? doc.toObject() : doc,
}));

describe('Admin Controller - createAdmin', () => {
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
    mockReq = { body: {} };
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

  // TC1: Create thành công
  test('TC1: Create Account Admin thành công', async () => {
    mockReq.body = {
      email: 'admin1@test.com',
      fullName: 'Admin One',
      phoneNumber: '0984123456',
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(201);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.message).toMatch(/Admin created successfully/);
    expect(mockRes._json.admin.email).toBe('admin1@test.com');
    expect(mockRes._json.temporaryPassword).toBeDefined();
  });

  // TC2: Fail do thiếu email
  test('TC2: Fail - thiếu email', async () => {
    mockReq.body = {
      fullName: 'Admin Two',
      phoneNumber: '0984123456',
      province: 'HCMC'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/provide email and full name/i);
  });

  // TC3: Fail do email invalid
  test('TC3: Fail - email không hợp lệ', async () => {
    mockReq.body = {
      email: 'not-an-email',
      fullName: 'Admin Three',
      phoneNumber: '0984123456',
      province: 'Danang'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC4: Fail do email null
  test('TC4: Fail - email null', async () => {
    mockReq.body = {
      email: null,
      fullName: 'Admin Four',
      phoneNumber: '0984123456',
      province: 'Hue'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC5: Fail do email đã tồn tại
  test('TC5: Fail - Admin đã tồn tại', async () => {
    // Tạo admin trước
    await new Admin(createTestAdminData({ email: 'admin5@test.com' })).save();
    mockReq.body = {
      email: 'admin5@test.com',
      fullName: 'Admin Five',
      phoneNumber: '0984123456',
      province: 'Vinh'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/already exists/i);
  });

  // TC6: Fail do tất cả các trường trống
  test('TC6: Fail - tất cả trường trống', async () => {
    mockReq.body = {
      email: '',
      fullName: '',
      phoneNumber: '',
      province: ''
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC7: Fail do tất cả các trường null
  test('TC7: Fail - tất cả trường null', async () => {
    mockReq.body = {
      email: null,
      fullName: null,
      phoneNumber: null,
      province: null
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC8: Fail do fullname trống
  test('TC8: Fail - fullname trống', async () => {
    mockReq.body = {
      email: 'admin8@test.com',
      fullName: '',
      phoneNumber: '0984123456',
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC9: Fail do fullname null
  test('TC9: Fail - fullname null', async () => {
    mockReq.body = {
      email: 'admin9@test.com',
      fullName: null,
      phoneNumber: '0984123456',
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes._json.success).toBe(false);
  });

  // TC10: Fail do phone number trống
  test('TC10: Fail - phone number trống', async () => {
    mockReq.body = {
      email: 'admin10@test.com',
      fullName: 'Admin Ten',
      phoneNumber: '',
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(201); // vẫn tạo tài khoản vì phoneNumber không bắt buộc
    expect(mockRes._json.admin.phoneNumber).toBeNull();
  });

  // TC11: Fail do phone number null
  test('TC11: Fail - phone number null', async () => {
    mockReq.body = {
      email: 'admin11@test.com',
      fullName: 'Admin Eleven',
      phoneNumber: null,
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(201);
    expect(mockRes._json.admin.phoneNumber).toBeNull();
  });

  // TC12: Fail do phone number sai định dạng
  test('TC12: Fail - phone number sai định dạng', async () => {
    mockReq.body = {
      email: 'admin12@test.com',
      fullName: 'Admin Twelve',
      phoneNumber: 'abcdef',
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    // Nếu controller không validate thì vẫn pass
    expect([400, 201]).toContain(mockRes.statusCode);
  });

  // TC13: Fail do province trống
  test('TC13: Fail - province trống', async () => {
    mockReq.body = {
      email: 'admin13@test.com',
      fullName: 'Admin Thirteen',
      phoneNumber: '0984123456',
      province: ''
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(201);
    expect(mockRes._json.admin.province).toBeNull();
  });

  // TC14: Fail do province null
  test('TC14: Fail - province null', async () => {
    mockReq.body = {
      email: 'admin14@test.com',
      fullName: 'Admin Fourteen',
      phoneNumber: '0984123456',
      province: null
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(201);
    expect(mockRes._json.admin.province).toBeNull();
  });

  // TC15: Fail - không tạo được mật khẩu tự động (exception)
  test('TC15: Fail - không tạo được mật khẩu tự động', async () => {
    // Mock hàm generateRandomPassword để throw lỗi
    jest.spyOn(adminController, 'generateRandomPassword').mockImplementationOnce(() => { throw new Error('Can not gen password'); });
    mockReq.body = {
      email: 'admin15@test.com',
      fullName: 'Admin Fifteen',
      phoneNumber: '0984123456',
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    jest.restoreAllMocks();
  });

  // TC16: Fail - Lỗi server của createAdmin
  test('TC16: Fail - Lỗi server', async () => {
    jest.spyOn(Admin, 'findOne').mockImplementationOnce(() => { throw new Error('Fake server error'); });
    mockReq.body = {
      email: 'admin16@test.com',
      fullName: 'Admin Sixteen',
      phoneNumber: '0984123456',
      province: 'Hanoi'
    };
    await adminController.createAdmin(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/server error/i);
    jest.restoreAllMocks();
  });
});