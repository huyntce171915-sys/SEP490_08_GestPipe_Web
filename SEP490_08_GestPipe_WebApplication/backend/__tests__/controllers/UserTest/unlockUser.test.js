const mongoose = require('mongoose');
const User = require('../../../src/models/User');
const userController = require('../../../src/controllers/userController');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestUserData,
  createUserOnly,
} = require('../../helpers/userHelpers');

describe('User Controller - unlockUser', () => {
  let mockReq, mockRes, user;

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

  // TC1: Unlock User thành công
  test('TC1: Unlock User thành công', async () => {
    user = await createUserOnly({ email: 'unlockme@abc.com', account_status: 'blocked' });
    mockReq = { params: { id: user._id.toString() } };
    await userController.unlockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.message).toMatch(/User unlocked/i);
    expect(mockRes._json.user.account_status).toBe('inactive');
  });

  // TC2: Fail - id không tồn tại
  test('TC2: Fail - id không tồn tại', async () => {
    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };
    await userController.unlockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.error).toMatch(/User not found/);
  });

  // TC3: Fail - id bị trống
  test('TC3: Fail - id bị trống', async () => {
    mockReq = { params: { id: '' } };
    await userController.unlockUser(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode);
  });

  // TC4: Fail - id không đúng định dạng
  test('TC4: Fail - id không đúng định dạng', async () => {
    mockReq = { params: { id: 'invalid_id' } };
    await userController.unlockUser(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode);
  });

  // TC5: Fail - id null
  test('TC5: Fail - id null', async () => {
    mockReq = { params: { id: null } };
    await userController.unlockUser(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode);
  });

  // TC6: Fail - id sai (random, chưa có trong DB)
  test('TC6: Fail - id sai', async () => {
    const fakeId = mongoose.Types.ObjectId().toString();
    mockReq = { params: { id: fakeId } };
    await userController.unlockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.error).toMatch(/User not found/);
  });

  // TC7: Fail - lỗi kết nối tới server
  test('TC7: Fail - lỗi server', async () => {
    user = await createUserOnly({ email: 'server@abc.com', account_status: 'blocked' });
    jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => { throw new Error('DB error'); });

    mockReq = { params: { id: user._id.toString() } };
    await userController.unlockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.error).toMatch(/Failed to unlock user/);
    jest.restoreAllMocks();
  });
});