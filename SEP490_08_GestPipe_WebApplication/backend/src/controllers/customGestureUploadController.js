const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const AdminCustomGesture = require('../models/AdminCustomGesture');
const AdminGestureRequest = require('../models/AdminGestureRequest');

const PIPELINE_CODE_DIR = path.resolve(__dirname, '../../../..', 'hybrid_realtime_pipeline', 'code');

const CSV_COLUMNS = [
  'instance_id',
  'pose_label',
  'left_finger_state_0',
  'left_finger_state_1',
  'left_finger_state_2',
  'left_finger_state_3',
  'left_finger_state_4',
  'right_finger_state_0',
  'right_finger_state_1',
  'right_finger_state_2',
  'right_finger_state_3',
  'right_finger_state_4',
  'motion_x_start',
  'motion_y_start',
  'motion_x_mid',
  'motion_y_mid',
  'motion_x_end',
  'motion_y_end',
  'main_axis_x',
  'main_axis_y',
  'delta_x',
  'delta_y',
];

// Validation settings (match Python script defaults)
const REQUIRED_SAMPLES = 5;
const MIN_CONSISTENT_SAMPLES = 3;
const SIMILARITY_THRESHOLD = 0.85; // 0..1

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const cosineSimilarity01 = (ax, ay, bx, by) => {
  const aNorm = Math.hypot(ax, ay);
  const bNorm = Math.hypot(bx, by);
  if (aNorm === 0 || bNorm === 0) return 0.0;
  const cos = (ax * bx + ay * by) / (aNorm * bNorm);
  // convert from [-1,1] to [0,1]
  return (cos + 1) / 2;
};

const sampleFingerKeys = ['finger_thumb', 'finger_index', 'finger_middle', 'finger_ring', 'finger_pinky'];

const convertSampleFormat = (sample) => {
  // Convert from frontend format to internal format
  const converted = {
    finger_thumb: Number(sample.rightStates?.[0] ?? sample.finger_thumb ?? 0),
    finger_index: Number(sample.rightStates?.[1] ?? sample.finger_index ?? 0),
    finger_middle: Number(sample.rightStates?.[2] ?? sample.finger_middle ?? 0),
    finger_ring: Number(sample.rightStates?.[3] ?? sample.finger_ring ?? 0),
    finger_pinky: Number(sample.rightStates?.[4] ?? sample.finger_pinky ?? 0),
    motion_x: Number(sample.deltaX ?? sample.motion_x ?? sample.delta_x ?? 0),
    motion_y: Number(sample.deltaY ?? sample.motion_y ?? sample.delta_y ?? 0),
  };
  return converted;
};

const calcSampleSimilarity = (s1, s2) => {
  // Convert samples to internal format
  const c1 = convertSampleFormat(s1);
  const c2 = convertSampleFormat(s2);

  // finger similarity only: each matching finger adds 0.2
  let fingerSim = 0;
  for (const k of sampleFingerKeys) {
    if (Number(c1[k]) === Number(c2[k])) fingerSim += 0.2;
  }

  // Only check finger consistency (ignore motion)
  return fingerSim;
};

const validateSampleQuality = (samples) => {
  // samples: array of objects with finger_* and motion_x/motion_y
  if (!Array.isArray(samples) || samples.length < REQUIRED_SAMPLES) {
    return { valid: false, message: `Need ${REQUIRED_SAMPLES - (samples.length || 0)} more samples` };
  }

  const n = samples.length;
  // build similarity matrix
  const sim = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) sim[i][j] = 1.0;
      else sim[i][j] = calcSampleSimilarity(samples[i], samples[j]);
    }
  }

  // find consistent groups: greedy grouping ensuring all pairs similar
  const used = new Set();
  const groups = [];
  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue;
    const group = [i];
    used.add(i);
    let added = true;
    while (added) {
      added = false;
      for (let j = i + 1; j < n; j++) {
        if (used.has(j)) continue;
        // check if j is similar to ALL in group
        const similarToAll = group.every((k) => sim[k][j] >= SIMILARITY_THRESHOLD);
        if (similarToAll) {
          group.push(j);
          used.add(j);
          added = true;
        }
      }
    }
    if (group.length >= MIN_CONSISTENT_SAMPLES) groups.push(group);
  }  if (groups.length === 0) {
    return { valid: false, message: 'No consistent group of samples found (need 3 similar samples).' };
  }

  // pick largest group
  const best = groups.reduce((a, b) => (b.length > a.length ? b : a), groups[0]);
  const consistentSamples = best.map((idx) => samples[idx]);
  return { valid: true, consistentSamples, message: `Found ${consistentSamples.length} consistent samples` };
};

const getMotionDirection = (dx, dy, threshold = 0.01) => {
  const absx = Math.abs(dx);
  const absy = Math.abs(dy);
  if (absx < threshold && absy < threshold) return 'static';
  if (absx > absy) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
};

const checkGestureConflict = async (leftStates, rightStates, dx, dy) => {
  // Force left states to [0,0,0,0,0] to match reference CSV format
  const normalizedLeftStates = [0, 0, 0, 0, 0];
  
  // read reference CSV
  const refPath = path.join(PIPELINE_CODE_DIR, 'training_results', 'gesture_data_compact.csv');
  console.log('[checkGestureConflict] Reference path:', refPath);
  try {
    const text = await fs.readFile(refPath, 'utf-8');
    console.log('[checkGestureConflict] Read reference data, length:', text.length);
    const lines = text.trim().split(/\r?\n/).slice(1);
    console.log('[checkGestureConflict] Reference lines:', lines.length);
    for (const line of lines) {
      const cols = line.split(',');
      // columns include left_0..4 then right_0..4 then motion columns etc depending on CSV format
      // attempt to read based on expected positions
      const r_left = [
        Number(cols[2] || 0),
        Number(cols[3] || 0),
        Number(cols[4] || 0),
        Number(cols[5] || 0),
        Number(cols[6] || 0),
      ];
      const r_right = [
        Number(cols[7] || 0),
        Number(cols[8] || 0),
        Number(cols[9] || 0),
        Number(cols[10] || 0),
        Number(cols[11] || 0),
      ];
      const r_dx = safeNumber(cols[cols.length - 2]);
      const r_dy = safeNumber(cols[cols.length - 1]);

      if (
        r_left.every((v, i) => Number(normalizedLeftStates[i]) === v) &&
        r_right.every((v, i) => Number(rightStates[i]) === v)
      ) {
        // Same finger pattern = CONFLICT! (ignore direction)
        return { conflict: true, message: `Conflict with existing gesture (same finger pattern)` };
      }
    }
    return { conflict: false, message: 'No conflict' };
  } catch (err) {
    // if reference load fails, we treat as no conflict but log
    console.warn('[checkGestureConflict] failed to read reference data', err.message);
    return { conflict: false, message: 'Reference data unavailable' };
  }
};

const sanitizeNumber = (value, defaultValue = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const sanitizeName = (value) => {
  if (!value) return 'unknown';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
};

const ensureUserDirs = async (adminId, gestureSlug) => {
  const userDir = path.join(PIPELINE_CODE_DIR, `user_${adminId}`);
  const rawDir = path.join(userDir, 'raw_data');
  const gestureDir = path.join(rawDir, gestureSlug);
  await fs.mkdir(gestureDir, { recursive: true });
  return { userDir, rawDir, gestureDir };
};

const upsertAdminCustomGesture = async (adminId, gestureName) => {
  const update = {
    status: 'draft',
    rejectionReason: '',
    'artifactPaths.rawDataDir': path.join(`user_${adminId}`, 'raw_data'),
  };

  await AdminCustomGesture.findOneAndUpdate(
    { adminId },
    {
      $addToSet: { gestures: gestureName },
      $set: update,
    },
    { upsert: true, new: true }
  );
};

const samplesToCsvRows = (samples, gestureName) => {
  return samples.map((sample, idx) => {
    const poseLabel = sample.pose_label || gestureName;
    const left = sample.leftStates || sample.left_finger_state || sample.left_fingers || [];
    const right = sample.rightStates || sample.right_finger_state || sample.right_fingers || [];

    const getFinger = (arr, index) => {
      if (!Array.isArray(arr)) return 0;
      return Number(arr[index]) === 1 ? 1 : 0;
    };

    return [
      sanitizeNumber(sample.instance_id ?? idx + 1, idx + 1),
      poseLabel,
      getFinger(left, 0),
      getFinger(left, 1),
      getFinger(left, 2),
      getFinger(left, 3),
      getFinger(left, 4),
      getFinger(right, 0),
      getFinger(right, 1),
      getFinger(right, 2),
      getFinger(right, 3),
      getFinger(right, 4),
      sanitizeNumber(sample.motion_x_start ?? sample.motion?.start?.x),
      sanitizeNumber(sample.motion_y_start ?? sample.motion?.start?.y),
      sanitizeNumber(sample.motion_x_mid ?? sample.motion?.mid?.x),
      sanitizeNumber(sample.motion_y_mid ?? sample.motion?.mid?.y),
      sanitizeNumber(sample.motion_x_end ?? sample.motion?.end?.x),
      sanitizeNumber(sample.motion_y_end ?? sample.motion?.end?.y),
      sanitizeNumber(sample.main_axis_x ?? sample.motion?.main_axis_x ?? sample.mainAxisX),
      sanitizeNumber(sample.main_axis_y ?? sample.motion?.main_axis_y ?? sample.mainAxisY),
      sanitizeNumber(sample.deltaX ?? sample.delta_x ?? sample.motion?.delta_x ?? sample.motion_x_end ?? 0),
      sanitizeNumber(sample.deltaY ?? sample.delta_y ?? sample.motion?.delta_y ?? sample.motion_y_end ?? 0),
    ];
  });
};

const appendToMasterCsv = async (masterPath, rows) => {
  let nextInstanceId = 1;
  let fileExists = false;
  try {
    const existing = await fs.readFile(masterPath, 'utf-8');
    fileExists = true;
    const lines = existing.trim().split(/\r?\n/);
    if (lines.length > 1) {
      const last = lines[lines.length - 1].split(',')[0];
      nextInstanceId = Number(last) + 1;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  const normalizedRows = rows.map((row, idx) => {
    const clone = [...row];
    clone[0] = nextInstanceId + idx;
    return clone;
  });

  if (!fileExists) {
    const header = CSV_COLUMNS.join(',');
    const payload = normalizedRows.map((row) => row.join(',')).join('\n');
    await fs.writeFile(masterPath, `${header}\n${payload}`, { encoding: 'utf-8' });
  } else {
    const payload = normalizedRows.map((row) => row.join(',')).join('\n');
    await fs.writeFile(masterPath, `\n${payload}`, { encoding: 'utf-8', flag: 'a' });
  }
};

exports.checkGestureConflict = async (req, res) => {
  try {
    const { leftStates, rightStates, deltaX, deltaY } = req.body;

    if (!Array.isArray(leftStates) || !Array.isArray(rightStates)) {
      return res.status(400).json({ message: 'leftStates and rightStates must be arrays' });
    }

    console.log('[checkGestureConflict] Checking conflict for sample:', { leftStates, rightStates, deltaX, deltaY });
    const conflict = await checkGestureConflict(leftStates, rightStates, deltaX || 0, deltaY || 0);
    console.log('[checkGestureConflict] Result:', conflict);

    if (conflict.conflict) {
      return res.status(409).json({ conflict: true, message: conflict.message });
    } else {
      return res.status(200).json({ conflict: false, message: conflict.message });
    }
  } catch (error) {
    console.error('[checkGestureConflict] Error:', error);
    // Return no conflict on error to allow upload
    return res.status(200).json({ conflict: false, message: 'Conflict check failed, proceeding' });
  }
};

exports.uploadCustomGesture = async (req, res) => {
  try {
    const { adminId, gestureName, samples } = req.body;

    if (!adminId || !gestureName) {
      return res.status(400).json({ message: 'adminId and gestureName are required.' });
    }

    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ message: 'Missing sample data.' });
    }

    console.log(
      `[uploadCustomGesture] admin=${adminId} gesture=${gestureName} samples=${samples.length}`
    );

    const normalizedGesture = gestureName.trim();
    const gestureSlug = sanitizeName(normalizedGesture);

    // Check conflict FIRST using the first sample (before quality validation)
    if (samples.length > 0) {
      const firstSample = samples[0];
      const leftStates = firstSample.leftStates || firstSample.left_finger_state || firstSample.left_fingers || [];
      const rightStates = firstSample.rightStates || firstSample.right_finger_state || firstSample.right_fingers || [];
      const dx = sanitizeNumber(firstSample.deltaX ?? firstSample.delta_x ?? firstSample.motion?.delta_x ?? firstSample.motion_x_end ?? 0);
      const dy = sanitizeNumber(firstSample.deltaY ?? firstSample.delta_y ?? firstSample.motion?.delta_y ?? firstSample.motion_y_end ?? 0);

      console.log('[uploadCustomGesture] Checking conflict early with first sample...');
      const conflict = await checkGestureConflict(leftStates, rightStates, dx, dy);
      console.log('[uploadCustomGesture] Early conflict result:', conflict);
      if (conflict.conflict) {
        console.log('[uploadCustomGesture] Returning 409 early conflict:', conflict.message);
        return res.status(409).json({ message: 'Conflict detected', detail: conflict.message });
      }
    }

    // Run sample quality validation
    console.log('[uploadCustomGesture] Running quality validation...');
    const quality = validateSampleQuality(samples);
    console.log('[uploadCustomGesture] Quality result:', quality);
    if (!quality.valid) {
      console.log('[uploadCustomGesture] Returning 400 quality fail:', quality.message);
      return res.status(400).json({ message: 'Quality check failed', detail: quality.message });
    }

    // Prepare dirs and files
    let userDir, gestureDir;
    try {
      const dirs = await ensureUserDirs(adminId, gestureSlug);
      userDir = dirs.userDir;
      gestureDir = dirs.gestureDir;
    } catch (dirErr) {
      console.error('[uploadCustomGesture] Failed to create directories:', dirErr.message);
      return res.status(500).json({ message: 'Failed to create directories', error: dirErr.message });
    }
    // Save raw CSV with all uploaded samples (always keep raw copy)
    let rawFilePath;
    try {
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
      rawFilePath = path.join(
        gestureDir,
        `gesture_data_custom_${adminId}_${gestureSlug}_${timestamp}.csv`
      );
      const csvRowsAll = samplesToCsvRows(samples, normalizedGesture);
      await fs.writeFile(
        rawFilePath,
        [CSV_COLUMNS.join(','), ...csvRowsAll.map((row) => row.join(','))].join('\n'),
        { encoding: 'utf-8' }
      );
      const rawFiles = await fs.readdir(gestureDir);
      console.log(
        `[uploadCustomGesture] Saved raw CSV -> ${rawFilePath}. Total files for ${gestureSlug}: ${rawFiles.length}`
      );
    } catch (fileErr) {
      console.error('[uploadCustomGesture] Failed to save raw CSV:', fileErr.message);
      return res.status(500).json({ message: 'Failed to save data', error: fileErr.message });
    }

    // Run Python validator on the saved CSV to get authoritative validation and consistent rows
    let pyResult = { valid: true, message: 'Basic validation only', consistent_rows: [] };
    try {
      const pythonScript = path.join(PIPELINE_CODE_DIR, 'collect_data_update.py');
      const pythonCmd = process.env.PYTHON_BIN || 'python';
      const args = [pythonScript, '--validate-csv', rawFilePath, '--pose-label', normalizedGesture];
      console.log('[uploadCustomGesture] Spawning Python validator:', pythonCmd, args.join(' '));
      
      const { stdout, stderr } = await execFileAsync(pythonCmd, args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
      if (stderr) console.warn('[uploadCustomGesture][py] stderr:', stderr.toString());
      
      const parsedResult = JSON.parse(stdout.toString());
      if (parsedResult && typeof parsedResult === 'object') {
        pyResult = parsedResult;
      }
    } catch (err) {
      console.warn('[uploadCustomGesture] Python validator failed, using basic validation:', err.message);
      // Keep default pyResult
    }

    // If validator reports conflict, return 409
    if (pyResult && pyResult.conflict) {
      return res.status(409).json({ message: 'Conflict detected by Python validator', detail: pyResult.conflict_message, rawFile: rawFilePath });
    }

    // If validator reports invalid quality, return 400
    if (pyResult && !pyResult.valid) {
      return res.status(400).json({ message: 'Quality check failed (Python)', detail: pyResult.message, rawFile: rawFilePath });
    }

    // Try to append to master CSV and update database
    let masterCsvPath = null;
    try {
      masterCsvPath = path.join(userDir, `gesture_data_custom_${adminId}.csv`);
      let consistentRows = Array.isArray(pyResult.consistent_rows) ? pyResult.consistent_rows : [];
      
      // If no validation results, use raw data from the uploaded CSV
      if (consistentRows.length === 0) {
        console.log('[uploadCustomGesture] No validation results, using raw CSV data');
        // Read the uploaded CSV and convert to consistent format
        const csvContent = await fs.readFile(rawFilePath, 'utf-8');
        const lines = csvContent.trim().split(/\r?\n/).slice(1); // Skip header
        consistentRows = lines.map(line => line.split(',').map(val => isNaN(val) ? val : parseFloat(val)));
      }
      
      if (consistentRows.length > 0) {
        await appendToMasterCsv(masterCsvPath, consistentRows);
      }
      await upsertAdminCustomGesture(adminId, normalizedGesture);
      
      // Update AdminGestureRequest status to 'customed'
      try {
        let request = await AdminGestureRequest.findOne({ adminId });
        if (!request) {
          request = await AdminGestureRequest.createForAdmin(adminId);
        }
        
        const gestureIndex = request.gestures.findIndex(g => g.gestureId === normalizedGesture);
        if (gestureIndex !== -1) {
          request.gestures[gestureIndex].status = 'customed';
          request.gestures[gestureIndex].gestureName = normalizedGesture;
          request.gestures[gestureIndex].customedAt = new Date();
          await request.save();
          console.log(`[uploadCustomGesture] Updated AdminGestureRequest status to 'customed' for gesture: ${normalizedGesture}`);
        }
      } catch (statusErr) {
        console.warn('[uploadCustomGesture] Failed to update gesture status:', statusErr.message);
        // Continue anyway, data is saved
      }
    } catch (finalErr) {
      console.warn('[uploadCustomGesture] Final operations failed:', finalErr.message);
      // Continue anyway, raw file is saved
    }

    return res.status(200).json({
      message: 'Custom gesture accepted and saved.',
      validation: pyResult.message || 'Basic validation',
      rawFile: rawFilePath,
      masterFile: masterCsvPath,
    });
  } catch (error) {
    console.error('[uploadCustomGesture] Unexpected error:', error);
    // Return success anyway since raw file might be saved
    return res.status(200).json({ 
      message: 'Gesture saved with warnings', 
      error: error.message,
      note: 'Data saved but some operations failed'
    });
  }
};
