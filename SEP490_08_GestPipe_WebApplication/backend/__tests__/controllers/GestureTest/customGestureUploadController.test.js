const customGestureUploadController = require('../../../src/controllers/customGestureUploadController');
const AdminCustomGesture = require('../../../src/models/AdminCustomGesture');
const AdminGestureRequest = require('../../../src/models/AdminGestureRequest');
const fs = require('fs/promises');
const child_process = require('child_process');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
} = require('../../helpers/adminHelpers');

// Mock dependencies (keep fs and child_process mocked)
jest.mock('fs/promises');
jest.mock('child_process');
// Do NOT mock models anymore
// jest.mock('../../../src/models/AdminCustomGesture');
// jest.mock('../../../src/models/AdminGestureRequest');

describe('customGestureUploadController', () => {
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
      admin: { id: '507f1f77bcf86cd799439011' } // Valid ObjectId
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('checkGestureConflict', () => {
    it('should return 400 if leftStates or rightStates are missing', async () => {
      req.body = { deltaX: 0, deltaY: 0 };
      await customGestureUploadController.checkGestureConflict(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('must be arrays') }));
    });

    it('should return 200 with conflict: false if no conflict found', async () => {
      req.body = {
        leftStates: [0, 0, 0, 0, 0],
        rightStates: [0, 1, 0, 0, 0],
        deltaX: 10,
        deltaY: 0
      };

      // Mock fs.readFile to return empty CSV or non-conflicting data
      fs.readFile.mockResolvedValue('header\n1,label,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0');

      await customGestureUploadController.checkGestureConflict(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ conflict: false }));
    });

    it('should return 409 with conflict: true if conflict found', async () => {
      req.body = {
        leftStates: [0, 0, 0, 0, 0],
        rightStates: [0, 1, 0, 0, 0], // Matches the mocked file below
        deltaX: 0,
        deltaY: 0
      };

      // Mock fs.readFile to return conflicting data
      const conflictingLine = '1,label,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0';
      fs.readFile.mockResolvedValue(`header\n${conflictingLine}`);

      await customGestureUploadController.checkGestureConflict(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ conflict: true }));
    });
  });

  describe('uploadCustomGesture', () => {
    const validSamples = Array(5).fill({
      leftStates: [0, 0, 0, 0, 0],
      rightStates: [0, 1, 0, 0, 0],
      deltaX: 0,
      deltaY: 0,
      instance_id: 1
    });

    it('should return 400 if adminId or gestureName is missing', async () => {
      req.body = { samples: [] };
      await customGestureUploadController.uploadCustomGesture(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if samples are missing or empty', async () => {
      req.body = { adminId: '507f1f77bcf86cd799439011', gestureName: 'test', samples: [] };
      await customGestureUploadController.uploadCustomGesture(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should successfully upload custom gesture', async () => {
      const adminId = '507f1f77bcf86cd799439011';
      req.body = {
        adminId: adminId,
        gestureName: 'test_gesture',
        samples: validSamples
      };

      // Setup: Create AdminGestureRequest in DB
      const request = await AdminGestureRequest.createForAdmin(adminId);
      request.gestures.push({ gestureId: 'test_gesture', gestureName: 'Test Gesture', status: 'ready' });
      await request.save();

      // Mock fs operations
      fs.readFile.mockResolvedValue('header\n'); // No conflict
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      fs.readdir.mockResolvedValue(['file1.csv']);

      // Mock child_process.execFile for python validation
      child_process.execFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: JSON.stringify({ valid: true, message: 'OK' }), stderr: '' });
      });

      await customGestureUploadController.uploadCustomGesture(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Custom gesture accepted and saved.' }));
      expect(fs.writeFile).toHaveBeenCalled();
      
      // Verify DB updates
      const updatedRequest = await AdminGestureRequest.findOne({ adminId });
      const gesture = updatedRequest.gestures.find(g => g.gestureId === 'test_gesture');
      expect(gesture.status).toBe('customed');

      const customGesture = await AdminCustomGesture.findOne({ adminId });
      expect(customGesture).toBeTruthy();
      expect(customGesture.gestures).toContain('test_gesture');
    });

    it('should return 409 if early conflict check fails', async () => {
      req.body = {
        adminId: '507f1f77bcf86cd799439011',
        gestureName: 'test_gesture',
        samples: validSamples
      };

      // Mock fs.readFile to return conflicting data
      const conflictingLine = '1,label,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0';
      fs.readFile.mockResolvedValue(`header\n${conflictingLine}`);

      await customGestureUploadController.uploadCustomGesture(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Conflict detected' }));
    });
  });
});
