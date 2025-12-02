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

describe('User Controller - getUserDetail', () => {
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

  // TC 1: Get Detail User thành công với đầy đủ các trường
  test('TC1: Get Detail User thành công với đầy đủ các trường', async () => {
    const { user, profile } = await createUserWithProfile(
      {
        email: "u1@abc.com",
        account_status: "activeonline",
        avatar_url: "user-avatar-url"
      },
      {
        full_name: "Test User",
        birth_date: new Date("2001-09-01"),
        phone_number: "0123456789",
        address: "Test Address",
        company: "Test Company",
        education_level: "Bachelor",
        profile_image: "profile-avatar"
      }
    );

    mockReq = { params: { id: user._id.toString() } };
    await userController.getUserDetail(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.name).toBe("Test User");
    expect(new Date(mockRes._json.birthDate).getUTCFullYear()).toBe(new Date(profile.birth_date).getUTCFullYear())
    expect(mockRes._json.email).toBe("u1@abc.com");
    expect(mockRes._json.phoneNumber).toBe("0123456789");
    expect(mockRes._json.address).toBe("Test Address");
    expect(mockRes._json.company).toBe("Test Company");
    expect(mockRes._json.education).toBe("Bachelor");
    expect(mockRes._json.createdDate).toBeDefined();
    expect(mockRes._json.status).toBe("activeonline");
    expect(mockRes._json.avatarUrl).toBe("user-avatar-url");
  });

  // TC 2: Fail - id không tồn tại
  test('TC2: Fail - id không tồn tại', async () => {
    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };
    await userController.getUserDetail(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.error).toMatch(/User not found/);
  });

  // TC 3: Fail - id không đúng định dạng
  test('TC3: Fail - id không đúng định dạng', async () => {
    mockReq = { params: { id: "invalid_id_format" } };
    await userController.getUserDetail(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.error).toMatch(/Failed to get user details/);
  });

  // TC 4: Fail - id trống
  test('TC4: Fail - id trống', async () => {
    mockReq = { params: { id: "" } };
    await userController.getUserDetail(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode); // Có thể là 404 nếu trả về null, hoặc 500 nếu throw, tùy controller
  });

  // TC 5: Fail - id null
  test('TC5: Fail - id null', async () => {
    mockReq = { params: { id: null } };
    await userController.getUserDetail(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode); // Có thể là 404 nếu trả về null, hoặc 500 nếu throw, tùy controller
  });

  // TC 6: Chỉ get được info user, không get được profile (exception nghiệp vụ)
  test('TC6: Chỉ get được thông tin cơ bản user, không profile', async () => {
    const user = await createUserOnly({ email: "noprof@abc.com", account_status: "activeoffline" });
    mockReq = { params: { id: user._id.toString() } };
    await userController.getUserDetail(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.email).toBe("noprof@abc.com");
    expect(mockRes._json.name).toBe("Huy"); // Vì không có profile
    expect(mockRes._json.phoneNumber).toBe("");
    expect(mockRes._json.address).toBe("");
    expect(mockRes._json.company).toBe("");
    expect(mockRes._json.education).toBe("");
  });

  // TC 6 (2nd): Fail - lỗi server
  test('TC6 (2nd): Fail - lỗi server', async () => {
    jest.spyOn(User, 'findById').mockImplementationOnce(() => { throw new Error('DB Error'); });

    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };
    await userController.getUserDetail(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.error).toMatch(/Failed to get user details/);
    jest.restoreAllMocks();
  });
});