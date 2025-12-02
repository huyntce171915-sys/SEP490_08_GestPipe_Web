// Gesture database utility based on your CSV data
export const GESTURE_DATABASE = {
  'end': {
    id: 1,
    left_finger: [0,0,0,0,0],
    right_finger: [0,0,0,0,1],
    main_axis: [1,0],
    delta: [-0.0001223981380462, 0.0],
    type: 'static',
    description: '✋ End - Pinky finger extended',
    instruction: 'Extend only your pinky finger'
  },
  'end_present': {
    id: 2,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,1,1,1],
    main_axis: [1,0],
    delta: [-0.1149142533540725, 0.0],
    type: 'static',
    description: '🎭 End Present - All fingers extended',
    instruction: 'Extend all five fingers'
  },
  'home': {
    id: 3,
    left_finger: [0,0,0,0,0],
    right_finger: [1,0,0,0,0],
    main_axis: [1,0],
    delta: [4.1037797927856445e-05, 0.0],
    type: 'static',
    description: '🏠 Home - Thumb extended',
    instruction: 'Extend only your thumb'
  },
  'next_slide': {
    id: 4,
    left_finger: [0,0,0,0,0],
    right_finger: [0,1,0,0,0],
    main_axis: [1,0],
    delta: [0.1894827485084533, 0.0],
    type: 'dynamic',
    description: '➡️ Next Slide - Index finger extended, move right',
    instruction: 'Extend index finger and move hand to the right'
  },
  'previous_slide': {
    id: 5,
    left_finger: [0,0,0,0,0],
    right_finger: [0,1,1,0,0],
    main_axis: [1,0],
    delta: [-0.2638420760631561, 0.0],
    type: 'dynamic',
    description: '⬅️ Previous Slide - Index and middle extended, move left',
    instruction: 'Extend index and middle fingers, move hand to the left'
  },
  'rotate_down': {
    id: 6,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,0,0,0],
    main_axis: [0,1],
    delta: [0.0, 0.2617712020874023],
    type: 'dynamic',
    description: '🔄⬇️ Rotate Down - Thumb and index extended, move down',
    instruction: 'Extend thumb and index finger, move hand downward'
  },
  'rotate_left': {
    id: 7,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,0,0,0],
    main_axis: [1,0],
    delta: [-0.2039719820022583, 0.0],
    type: 'dynamic',
    description: '🔄⬅️ Rotate Left - Thumb and index extended, move left',
    instruction: 'Extend thumb and index finger, move hand to the left'
  },
  'rotate_right': {
    id: 8,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,0,0,0],
    main_axis: [1,0],
    delta: [0.1992542743682861, 0.0],
    type: 'dynamic',
    description: '🔄➡️ Rotate Right - Thumb and index extended, move right',
    instruction: 'Extend thumb and index finger, move hand to the right'
  },
  'rotate_up': {
    id: 9,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,0,0,0],
    main_axis: [0,1],
    delta: [0.0, -0.2254938036203384],
    type: 'dynamic',
    description: '🔄⬆️ Rotate Up - Thumb and index extended, move up',
    instruction: 'Extend thumb and index finger, move hand upward'
  },
  'start_present': {
    id: 10,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,1,1,1],
    main_axis: [1,0],
    delta: [0.1158757507801055, 0.0],
    type: 'static',
    description: '🎬 Start Present - All fingers extended',
    instruction: 'Extend all five fingers to start presentation'
  },
  'zoom_in': {
    id: 11,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,1,0,0],
    main_axis: [0,1],
    delta: [0.0, -0.3583151251077652],
    type: 'dynamic',
    description: '🔍➕ Zoom In - Thumb, index, middle extended, move up',
    instruction: 'Extend thumb, index, and middle fingers, move hand up to zoom in'
  },
  'zoom_in_slide': {
    id: 12,
    left_finger: [0,0,0,0,0],
    right_finger: [0,1,1,0,0],
    main_axis: [0,1],
    delta: [0.0, -0.1667674928903579],
    type: 'dynamic',
    description: '📊➕ Zoom In Slide - Index and middle extended, move up',
    instruction: 'Extend index and middle fingers, move hand up to zoom in slide'
  },
  'zoom_out': {
    id: 13,
    left_finger: [0,0,0,0,0],
    right_finger: [1,1,1,0,0],
    main_axis: [0,1],
    delta: [0.0, 0.0709550380706787],
    type: 'dynamic',
    description: '🔍➖ Zoom Out - Thumb, index, middle extended, move down',
    instruction: 'Extend thumb, index, and middle fingers, move hand down to zoom out'
  },
  'zoom_out_slide': {
    id: 14,
    left_finger: [0,0,0,0,0],
    right_finger: [0,1,1,0,0],
    main_axis: [0,1],
    delta: [0.0, 0.1899888962507248],
    type: 'dynamic',
    description: '📊➖ Zoom Out Slide - Index and middle extended, move down',
    instruction: 'Extend index and middle fingers, move hand down to zoom out slide'
  }
};

// Get all available gesture labels
export const getAvailableGestures = () => {
  return Object.keys(GESTURE_DATABASE);
};

// Get gesture template by name
export const getGestureTemplate = (gestureName) => {
  return GESTURE_DATABASE[gestureName] || null;
};

// Validate if gesture exists in database
export const isValidGesture = (gestureName) => {
  return gestureName in GESTURE_DATABASE;
};

// Get gestures by type
export const getGesturesByType = (type) => {
  return Object.entries(GESTURE_DATABASE)
    .filter(([_, template]) => template.type === type)
    .map(([name, _]) => name);
};

// Calculate gesture similarity score
export const calculateGestureSimilarity = (detectedFingers, expectedFingers) => {
  if (!detectedFingers || !expectedFingers) return 0;
  
  const matches = detectedFingers.reduce((count, finger, index) => {
    return count + (finger === expectedFingers[index] ? 1 : 0);
  }, 0);
  
  return matches / expectedFingers.length;
};

// Calculate motion similarity score
export const calculateMotionSimilarity = (detectedDelta, expectedDelta, threshold = 0.1) => {
  if (!detectedDelta || !expectedDelta) return 0;
  
  const distance = Math.sqrt(
    Math.pow(detectedDelta[0] - expectedDelta[0], 2) + 
    Math.pow(detectedDelta[1] - expectedDelta[1], 2)
  );
  
  return Math.max(0, 1 - (distance / threshold));
};

// Get gesture instruction text
export const getGestureInstruction = (gestureName) => {
  const template = getGestureTemplate(gestureName);
  return template ? template.instruction : 'Practice the gesture as shown';
};

// Export for component usage
export default GESTURE_DATABASE;