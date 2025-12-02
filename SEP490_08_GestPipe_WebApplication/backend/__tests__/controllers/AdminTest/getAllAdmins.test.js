const mongoose = require('mongoose');
const Admin = require('../../../src/models/Admin');
const adminController = require('../../../src/controllers/adminController');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestAdminData,
} = require('../../helpers/adminHelpers');

// Mock format function nếu controller sử dụng bên ngoài (có thể không cần nếu formatAdminDocument thực chất chỉ clone object)
jest.mock('../../../src/utils/dateFormatter', () => ({
  formatAdminDocument: doc => doc.toObject ? doc.toObject() : doc,
}));

describe('Admin Controller - getAllAdmins', () => {
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
    mockReq = {}; // Không cần truyền gì vào hàm này
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

  // TC 1: Get all list admin thành công
  test('TC1: Get all list admin thành công', async () => {
    // Tạo một vài admin vào DB
    const admins = [
      createTestAdminData({ email: 'admin1@test.com' }),
      createTestAdminData({ email: 'admin2@test.com' }),
      createTestAdminData({ email: 'admin3@test.com' }),
    ];
    await Admin.insertMany(admins);

    await adminController.getAllAdmins(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.count).toBe(3);
    expect(Array.isArray(mockRes._json.admins)).toBe(true);
    expect(mockRes._json.admins.length).toBe(3);
    // Đúng email đã insert (nếu cần check sâu hơn)
    const emails = mockRes._json.admins.map(a => a.email).sort();
    expect(emails).toEqual(['admin1@test.com', 'admin2@test.com', 'admin3@test.com'].sort());
  });

  // TC 2: Nếu DB trống trả về list admin = 0, thành công
  test('TC2: Nếu DB trống trả về list admin = 0, thành công', async () => {
    // DB đã clear ở beforeEach
    await adminController.getAllAdmins(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.count).toBe(0);
    expect(Array.isArray(mockRes._json.admins)).toBe(true);
    expect(mockRes._json.admins.length).toBe(0);
  });

  // TC 3: Fail do lỗi Server
  test('TC3: Fail do lỗi Server', async () => {
    // Mock Admin.find to throw error
    jest.spyOn(Admin, 'find').mockImplementationOnce(() => { throw new Error('Fake server error'); });

    await adminController.getAllAdmins(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/);
    // Restore spy
    jest.restoreAllMocks();
  });
});