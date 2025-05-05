# faceid_backend/faceid_backend.py
from flask import Flask, request, jsonify
import cv2
import numpy as np
import mediapipe as mp
import base64
import io
import logging

app = Flask(__name__)
# Active logging INFO pour voir les prints app.logger
app.logger.setLevel(logging.INFO)

# MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

# Indices des landmarks pour calculer l'EAR
LEFT_EYE  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [263, 387, 385, 362, 380, 373]

# Nombre de clignements requis pour valider vivacité (réduit à 1 pour test)
BLINK_REQUIRED = 1
EAR_THRESHOLD   = 0.25


def decode_image(b64: str):
    try:
        header, data = b64.split(',', 1)
        img_data = base64.b64decode(data)
        img = cv2.imdecode(np.frombuffer(img_data, np.uint8), cv2.IMREAD_COLOR)
        app.logger.info(f"Image décodée: dimensions={img.shape}")
        return img
    except Exception as e:
        app.logger.error(f"[Decode Error] Impossible de décoder l'image: {e}")
        return None


def eye_aspect_ratio(landmarks, eye_idxs, image_w, image_h):
    pts = [(int(landmarks[idx].x * image_w), int(landmarks[idx].y * image_h)) for idx in eye_idxs]
    def dist(a, b): return np.linalg.norm(np.array(a) - np.array(b))
    A = dist(pts[1], pts[5])
    B = dist(pts[2], pts[4])
    C = dist(pts[0], pts[3])
    ear = (A + B) / (2.0 * C)
    app.logger.info(f"EAR calculé: {ear:.3f}")
    return ear

@app.route("/")
def home():
    return "🎉 SwiftPay FaceID Backend is Running!"

@app.route("/verify_face", methods=["POST"])
def verify_face():
    data = request.get_json()
    b64_list = data.get('images', [])
    if not b64_list or not isinstance(b64_list, list):
        return jsonify(success=False, message="Liste d'images manquante ou invalide"), 400

    blink_count = 0
    was_closed = False

    for idx, b64 in enumerate(b64_list):
        img = decode_image(b64)
        if img is None:
            continue

        h, w, _ = img.shape
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        # Attention: warning NORM_RECT sans image_dimensions, peut être ignoré
        results = face_mesh.process(img_rgb)
        if not results.multi_face_landmarks:
            app.logger.warning(f"[Frame {idx}] Aucun visage détecté.")
            continue

        lm = results.multi_face_landmarks[0].landmark
        ear = (eye_aspect_ratio(lm, LEFT_EYE, w, h) +
               eye_aspect_ratio(lm, RIGHT_EYE, w, h)) / 2.0

        if ear < EAR_THRESHOLD:
            was_closed = True
        else:
            if was_closed:
                blink_count += 1
                was_closed = False
                app.logger.info(f"Blink détecté! compteur={blink_count}")

    app.logger.info(f"Total blinks={blink_count}, requis={BLINK_REQUIRED}")
    if blink_count >= BLINK_REQUIRED:
        return jsonify(success=True, message=f"{blink_count} clignement(s) détecté(s), vivacité validée."), 200
    else:
        return jsonify(success=False, message=f"Seulement {blink_count} clignements détectés, échec de la vérification."), 401

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


