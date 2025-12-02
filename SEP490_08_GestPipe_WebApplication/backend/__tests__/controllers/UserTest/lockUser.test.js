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

describe('User Controller - lockUser', () => {
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

  // TC 1: Lock User thành công
  test('TC1: Lock User thành công', async () => {
    user = await createUserOnly({ email: 'lockme@abc.com', account_status: 'activeonline' });
    mockReq = { params: { id: user._id.toString() } };
    await userController.lockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.message).toMatch(/User locked/i);
    expect(mockRes._json.user.account_status).toBe('blocked');
  });

  // TC 2: Fail - id không tồn tại
  test('TC2: Fail - id không tồn tại', async () => {
    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };
    await userController.lockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.error).toMatch(/User not found/);
  });

  // TC 3: Fail - id trống
  test('TC3: Fail - id trống', async () => {
    mockReq = { params: { id: '' } };
    await userController.lockUser(mockReq, mockRes);

    // Mongoose trả về null với id trống -> 404, hoặc throw lỗi -> 500
    expect([404, 500]).toContain(mockRes.statusCode);
  });

  // TC 4: Fail - id không đúng định dạng
  test('TC4: Fail - id không đúng định dạng', async () => {
    mockReq = { params: { id: 'invalid_id' } };
    await userController.lockUser(mockReq, mockRes);

    // Nếu id invalid, Mongoose trả về 500 (CastError), hoặc 404 nếu controller kiểm tra trước
    expect([404, 500]).toContain(mockRes.statusCode);
  });

  // TC 5: Fail - id null
  test('TC5: Fail - id null', async () => {
    mockReq = { params: { id: null } };
    await userController.lockUser(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode);
  });

  // TC 6: Fail - id sai (id random, chưa được tạo)
  test('TC6: Fail - id sai', async () => {
    // Tạo 1 id hợp lệ nhưng chưa có trong DB (giống TC2)
    const fakeId = mongoose.Types.ObjectId().toString();
    mockReq = { params: { id: fakeId } };
    await userController.lockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.error).toMatch(/User not found/);
  });

  // TC 7: Fail - lỗi kết nối tới server
  test('TC7: Fail - lỗi kết nối tới server', async () => {
    user = await createUserOnly({ email: 'server@abc.com', account_status: 'activeonline' });
    jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => { throw new Error('DB error'); });

    mockReq = { params: { id: user._id.toString() } };
    await userController.lockUser(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.error).toMatch(/Failed to lock user/);
    jest.restoreAllMocks();
  });
});