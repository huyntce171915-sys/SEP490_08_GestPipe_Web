import os
import pickle
import numpy as np
from typing import Dict, List, Tuple, Optional
import sys

# Constants
DELTA_WEIGHT = 10.0
CONFIDENCE_THRESHOLD = 0.65
MODELS_DIR = os.path.join(os.path.dirname(__file__), '../../../../hybrid_realtime_pipeline/code/models')
MODEL_PKL = os.path.join(MODELS_DIR, 'motion_svm_model.pkl')
SCALER_PKL = os.path.join(MODELS_DIR, 'motion_scaler.pkl')
STATIC_DYNAMIC_PKL = os.path.join(MODELS_DIR, 'static_dynamic_classifier.pkl')
GESTURE_TEMPLATES_CSV = os.path.join(os.path.dirname(__file__), '../../../../hybrid_realtime_pipeline/code/training_results/gesture_data_compact.csv')

# Global variables for loaded models
svm_model = None
label_encoder = None
scaler = None
static_dynamic_data = None
gesture_templates = None

def load_models():
    """Load trained SVM model, scaler, and static/dynamic classifier"""
    global svm_model, label_encoder, scaler, static_dynamic_data

    if svm_model is not None:
        return  # Already loaded

    if not os.path.exists(MODEL_PKL) or not os.path.exists(SCALER_PKL):
        raise FileNotFoundError(f"Model files not found! Please check:\n{MODEL_PKL}\n{SCALER_PKL}")

    with open(MODEL_PKL, 'rb') as f:
        model_data = pickle.load(f)

    with open(SCALER_PKL, 'rb') as f:
        scaler = pickle.load(f)

    svm_model = model_data['model']
    label_encoder = model_data['label_encoder']

    # Load static/dynamic classifier
    if os.path.exists(STATIC_DYNAMIC_PKL):
        with open(STATIC_DYNAMIC_PKL, 'rb') as f:
            static_dynamic_data = pickle.load(f)

    # Only print in interactive mode, not when called via CLI
    try:
        import sys
        if sys.stdin.isatty():  # Only print if running interactively
            print("Models loaded successfully!")
            print(f"   - SVM Model: {len(label_encoder.classes_)} classes")
            print(f"   - Classes: {list(label_encoder.classes_)}")
    except:
        pass  # Don't print if stdin check fails

def load_gesture_templates():
    """Load gesture templates for validation"""
    global gesture_templates

    if gesture_templates is not None:
        return  # Already loaded

    import pandas as pd

    if not os.path.exists(GESTURE_TEMPLATES_CSV):
        raise FileNotFoundError(f"Gesture templates not found: {GESTURE_TEMPLATES_CSV}")

    df = pd.read_csv(GESTURE_TEMPLATES_CSV)
    templates = {}

    for _, row in df.iterrows():
        gesture = row['pose_label']
        templates[gesture] = {
            'left_fingers': [int(row[f'left_finger_state_{i}']) for i in range(5)],
            'right_fingers': [int(row[f'right_finger_state_{i}']) for i in range(5)],
            'main_axis_x': int(row['main_axis_x']),
            'main_axis_y': int(row['main_axis_y']),
            'delta_x': float(row['delta_x']),
            'delta_y': float(row['delta_y']),
            'is_static': abs(float(row['delta_x'])) < 0.02 and abs(float(row['delta_y'])) < 0.02
        }

    gesture_templates = templates
    # Only print in interactive mode, not when called via CLI
    try:
        import sys
        if sys.stdin.isatty():  # Only print if running interactively
            print(f"Gesture templates loaded: {len(templates)} gestures")
    except:
        pass  # Don't print if stdin check fails

def prepare_features(left_states: List[int], right_states: List[int], motion_features: Dict, scaler, use_expected_left: bool = False, expected_left: List[int] = None) -> np.ndarray:
    """Prepare features for SVM prediction"""
    # Use expected left states instead of actual for trigger hand
    actual_left = expected_left if (use_expected_left and expected_left) else left_states

    # Combine finger states
    finger_feats = np.array(actual_left + right_states, dtype=float).reshape(1, -1)

    # Apply delta weight and add direction features
    motion_array = np.array([[
        motion_features['main_axis_x'],
        motion_features['main_axis_y'],
        motion_features['delta_x'] * DELTA_WEIGHT,
        motion_features['delta_y'] * DELTA_WEIGHT,
        motion_features['motion_left'] * DELTA_WEIGHT,
        motion_features['motion_right'] * DELTA_WEIGHT,
        motion_features['motion_up'] * DELTA_WEIGHT,
        motion_features['motion_down'] * DELTA_WEIGHT
    ]], dtype=float)

    # Scale motion features
    motion_scaled = scaler.transform(motion_array)

    # Combine features
    X = np.hstack([finger_feats, motion_scaled])
    return X

def prepare_static_features(left_states: List[int], right_states: List[int], delta_magnitude: float, static_scaler=None, use_expected_left: bool = False, expected_left: List[int] = None):
    """Prepare features for static/dynamic classification"""
    # Use expected left states instead of actual for trigger hand
    actual_left = expected_left if (use_expected_left and expected_left) else left_states

    # Combine finger states + delta magnitude
    features = np.array([actual_left + right_states + [delta_magnitude]], dtype=float)

    if static_scaler:
        features = static_scaler.transform(features)

    return features

def evaluate_gesture(left_states: List[int], right_states: List[int], motion_features: Dict,
                    target_gesture: str, duration: float) -> Tuple[bool, str, str]:
    """Evaluate gesture against target for practice session"""

    # Ensure models are loaded
    load_models()
    load_gesture_templates()

    # Get expected template for target gesture
    if target_gesture not in gesture_templates:
        return False, "no_template", f"No template found for {target_gesture}"

    expected = gesture_templates[target_gesture]

    # Step 1: Finger validation (only check RIGHT hand, LEFT is trigger only)
    if right_states != expected['right_fingers']:
        return False, "right_fingers", f"Wrong right fingers: got {right_states}, expected {expected['right_fingers']}"

    # Step 2: Static/Dynamic classification
    is_static_expected = expected['is_static']

    if static_dynamic_data and 'model' in static_dynamic_data:
        try:
            static_features = prepare_static_features(
                left_states, right_states, motion_features['delta_magnitude'],
                use_expected_left=True, expected_left=expected['left_fingers']
            )
            is_static_predicted = static_dynamic_data['model'].predict(static_features)[0] == 'static'
        except:
            is_static_predicted = is_static_expected  # Fallback to template
    else:
        is_static_predicted = is_static_expected

    # Step 3: Static gesture validation
    if is_static_expected:
        # Check duration
        if duration < 1.0:  # STATIC_HOLD_SECONDS
            return False, "static_duration", f"Hold longer: {duration:.1f}s < 1.0s"

        # Check minimal motion
        if motion_features['delta_magnitude'] > 0.05:
            return False, "static_motion", f"Too much motion: {motion_features['delta_magnitude']:.3f}"

        return True, "static_correct", f"Static gesture held for {duration:.1f}s"

    # Step 4: Dynamic gesture validation
    # Check if motion is sufficient
    if motion_features['delta_magnitude'] < 0.05:  # MIN_DELTA_MAG
        return False, "motion_small", f"Movement too small: {motion_features['delta_magnitude']:.3f}"

    # Step 5: Direction validation
    expected_dx = expected['delta_x']
    expected_dy = expected['delta_y']
    actual_dx = motion_features['raw_dx']
    actual_dy = motion_features['raw_dy']

    # Add delta_x and delta_y to motion_features for prepare_features
    motion_features['delta_x'] = actual_dx
    motion_features['delta_y'] = actual_dy

    # Check main axis matches
    expected_main_x = expected['main_axis_x']
    actual_main_x = motion_features['main_axis_x']

    if expected_main_x != actual_main_x:
        axis_name = "horizontal" if expected_main_x else "vertical"
        return False, "wrong_axis", f"Wrong axis: expected {axis_name} movement"

    # Check direction matches (flipped for intuitive gesture control)
    if expected_main_x == 1:  # Horizontal movement
        if (expected_dx > 0 and actual_dx < 0) or (expected_dx < 0 and actual_dx > 0):
            direction = "right" if expected_dx > 0 else "left"  # positive delta_x = move right (left-to-right for next_slide)
            return False, "wrong_direction", f"Wrong direction: expected {direction}"
    else:  # Vertical movement
        if (expected_dy > 0 and actual_dy <= 0) or (expected_dy < 0 and actual_dy >= 0):
            direction = "down" if expected_dy > 0 else "up"
            return False, "wrong_direction", f"Wrong direction: expected {direction}"    # Step 6: ML confidence validation
    try:
        X = prepare_features(
            left_states, right_states, motion_features, scaler,
            use_expected_left=True, expected_left=expected['left_fingers']
        )

        # Predict gesture
        prediction = svm_model.predict(X)[0]
        probabilities = svm_model.predict_proba(X)[0]
        confidence = np.max(probabilities)
        predicted_label = label_encoder.inverse_transform([prediction])[0]

        # Check confidence threshold
        if confidence < CONFIDENCE_THRESHOLD:
            return False, "low_confidence", f"Too uncertain: {confidence:.1%} < {CONFIDENCE_THRESHOLD:.0%}"

        # Check prediction matches target
        if predicted_label != target_gesture:
            return False, "wrong_prediction", f"ML predicted: {predicted_label} ({confidence:.1%})"

        return True, "ml_correct", f"Perfect! ({confidence:.1%} confidence)"

    except Exception as e:
        return False, "ml_error", f"Prediction failed: {str(e)}"

def evaluate_gesture_cli():
    """CLI interface for gesture evaluation"""
    import json
    import sys

    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)

        left_fingers = input_data['left_fingers']
        right_fingers = input_data['right_fingers']
        motion_features = input_data['motion_features']
        target_gesture = input_data['target_gesture']
        duration = input_data.get('duration', 1.0)

        # Evaluate gesture
        success, reason_code, reason_msg = evaluate_gesture(
            left_fingers, right_fingers, motion_features, target_gesture, duration
        )

        # Output result as JSON
        result = {
            'success': success,
            'reason_code': reason_code,
            'reason_msg': reason_msg,
            'target_gesture': target_gesture
        }

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            'success': False,
            'reason_code': 'error',
            'reason_msg': f'CLI Error: {str(e)}',
            'target_gesture': input_data.get('target_gesture', 'unknown')
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    evaluate_gesture_cli()