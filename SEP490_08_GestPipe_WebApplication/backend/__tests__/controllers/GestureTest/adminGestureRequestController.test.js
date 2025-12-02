const adminGestureRequestController = require('../../../src/controllers/adminGestureRequestController');
const AdminGestureRequest = require('../../../src/models/AdminGestureRequest');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
} = require('../../helpers/adminHelpers');

// KHÔNG Mock model nữa để giống login.test.js
// jest.mock('../../../src/models/AdminGestureRequest');

describe('adminGestureRequestController', () => {
  let req, res;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
    
    req = {
      body: {},
      admin: { id: '507f1f77bcf86cd799439011', role: 'admin' }, // Valid ObjectId
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getAdminGestureRequests', () => {
    it('should return existing request', async () => {
      // Setup: Tạo dữ liệu thật trong In-Memory DB
      const existingRequest = await AdminGestureRequest.createForAdmin(req.admin.id);
      
      await adminGestureRequestController.getAdminGestureRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          adminId: expect.anything()
        })
      }));
      
      // Verify: Kiểm tra dữ liệu trả về khớp với DB
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData.adminId.toString()).toBe(req.admin.id);
    });

    it('should create new request if not found', async () => {
      // Setup: DB trống (do clearDatabase)
      
      await adminGestureRequestController.getAdminGestureRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
      
      // Verify: Kiểm tra DB xem bản ghi đã được tạo chưa
      const created = await AdminGestureRequest.findOne({ adminId: req.admin.id });
      expect(created).toBeTruthy();
    });
  });

  describe('createOrUpdateRequest', () => {
    it('should return 400 if gestureId or gestureName missing', async () => {
      req.body = { gestureId: 'g1' }; // Thiếu gestureName
      await adminGestureRequestController.createOrUpdateRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update existing gesture status to customed', async () => {
      // Setup: Tạo request với 1 gesture 'ready'
      const request = await AdminGestureRequest.createForAdmin(req.admin.id);
      request.gestures.push({ gestureId: 'g1', gestureName: 'Old Name', status: 'ready' });
      await request.save();

      req.body = { gestureId: 'g1', gestureName: 'New Name' };
      
      await adminGestureRequestController.createOrUpdateRequest(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      
      // Verify: Kiểm tra DB xem trạng thái đã đổi chưa
      const updated = await AdminGestureRequest.findOne({ adminId: req.admin.id });
      const gesture = updated.gestures.find(g => g.gestureId === 'g1');
      expect(gesture.status).toBe('customed');
      expect(gesture.gestureName).toBe('New Name');
    });

    it('should return 409 if gesture is already customed or blocked', async () => {
      // Setup: Tạo request với 1 gesture 'blocked'
      const request = await AdminGestureRequest.createForAdmin(req.admin.id);
      request.gestures.push({ gestureId: 'g1', gestureName: 'G1', status: 'blocked' });
      await request.save();

      req.body = { gestureId: 'g1', gestureName: 'G1' };

      await adminGestureRequestController.createOrUpdateRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('submitForApproval', () => {
    it('should update all gestures to blocked', async () => {
      // Setup: Tạo request với nhiều gesture
      const request = await AdminGestureRequest.createForAdmin(req.admin.id);
      request.gestures = [
        { gestureId: 'g1', gestureName: 'G1', status: 'customed' },
        { gestureId: 'g2', gestureName: 'G2', status: 'ready' }
      ];
      await request.save();

      await adminGestureRequestController.submitForApproval(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

      // Verify: Kiểm tra DB xem tất cả đã thành 'blocked' chưa
      const updated = await AdminGestureRequest.findOne({ adminId: req.admin.id });
      expect(updated.gestures[0].status).toBe('blocked');
      expect(updated.gestures[1].status).toBe('blocked');
    });
  });
});
