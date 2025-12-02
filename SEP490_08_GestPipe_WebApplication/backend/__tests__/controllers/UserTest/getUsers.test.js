const mongoose = require('mongoose');
const User = require('../../../src/models/User');
const UserProfile = require('../../../src/models/UserProfile');
const userController = require('../../../src/controllers/userController');

const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestUserData,
  createTestUserProfileData,
  createUserWithProfile,
  createUserOnly,
} = require('../../helpers/userHelpers');

describe('User Controller - getAllUsers', () => {
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

  // TC 1: Get all user thành công (có nhiều user, có cả user có và không có profile)
  test('TC1: Get all user thành công', async () => {
    // Tạo 1 user có profile, 1 user không có profile, 1 user bị blocked
    const { user, profile } = await createUserWithProfile({
      email: 'u1@abc.com',
      account_status: 'activeonline'
    }, { phone_number: '0123456789' });

    const user2 = await createUserOnly({ email: 'u2@abc.com', account_status: 'activeoffline' });
    const user3 = await createUserOnly({ email: 'blocked@abc.com', account_status: 'blocked' });

    mockReq = { query: {} };

    await userController.getAllUsers(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(Array.isArray(mockRes._json)).toBe(true);
    expect(mockRes._json.length).toBe(3);

    // Kiểm tra user có profile
    const u1 = mockRes._json.find(u => u.email === 'u1@abc.com');
    expect(u1.phoneNumber).toBe('0123456789');
    // Kiểm tra user không có profile
    const u2 = mockRes._json.find(u => u.email === 'u2@abc.com');
    expect(u2.phoneNumber).toBe('');
    // Kiểm tra user bị blocked
    const u3 = mockRes._json.find(u => u.email === 'blocked@abc.com');
    expect(u3.status).toBe('blocked');
  });

  // TC 2: Get thành công User trả về empty khi DB trống dữ liệu
  test('TC2: Get thành công trả về empty khi không có user', async () => {
    mockReq = { query: {} };

    await userController.getAllUsers(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(Array.isArray(mockRes._json)).toBe(true);
    expect(mockRes._json.length).toBe(0);
  });

  // TC 3: Fail - lỗi server
  test('TC3: Fail - lỗi server', async () => {
    jest.spyOn(User, 'aggregate').mockImplementationOnce(() => { throw new Error('Failed aggregate'); });

    mockReq = { query: {} };
    await userController.getAllUsers(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.error).toMatch(/Failed to get users/);
    // Restore mock
    jest.restoreAllMocks();
  });
});