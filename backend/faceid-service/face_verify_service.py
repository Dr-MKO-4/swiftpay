# backend/face_verify_service.py
import os, time, base64
from io import BytesIO
from dotenv import load_dotenv
from PIL import Image
import numpy as np
import cv2
import psycopg2
import mediapipe as mp
from flask import Flask, request, jsonify

load_dotenv()
app = Flask(__name__)

# MediaPipe
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1)

# Lire config BDD depuis .env
DB_CONFIG = {
    'host':     os.getenv('PG_HOST'),
    'port':     os.getenv('PG_PORT'),
    'dbname':   os.getenv('PG_DATABASE'),
    'user':     os.getenv('PG_USER'),
    'password': os.getenv('PG_PASSWORD'),
}

def connect_with_retry(retries=5, delay=2):
    for i in range(retries):
        try:
            return psycopg2.connect(**DB_CONFIG)
        except Exception as e:
            print(f"[DB] tentative {i+1} échouée : {e}, retry in {delay}s")
            time.sleep(delay)
    raise RuntimeError("Impossible de se connecter à PostgreSQL")

conn = connect_with_retry()

def get_known_landmarks(user_id):
    """Charge et calcule landmarks à la demande."""
    cur = conn.cursor()
    cur.execute("SELECT face_image FROM biometric_keys WHERE user_id=%s", (user_id,))
    row = cur.fetchone()
    if not row or not row[0]:
        return None
    b64 = row[0]
    if not b64.startswith("data:image"):
        b64 = "data:image/jpeg;base64," + b64
    img = Image.open(BytesIO(base64.b64decode(b64.split(",",1)[1])))
    img_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    res = face_mesh.process(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
    if not res.multi_face_landmarks:
        return None
    return np.array([[p.x,p.y] for p in res.multi_face_landmarks[0].landmark])

THRESHOLD = 0.03

@app.route("/verify_face", methods=["POST"])
def verify_face():
    data = request.get_json() or {}
    images = data.get("images", [])
    # Charger landmarks de ref ici, pour l’utilisateur authentifié
    user_id = data.get("userId", 1)
    known = get_known_landmarks(user_id)
    if known is None:
        return jsonify(success=False, message="Pas d’image de référence"), 400

    for uri in images:
        try:
            img = Image.open(BytesIO(base64.b64decode(uri.split(",",1)[1])))
        except:
            continue
        img_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        res = face_mesh.process(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
        if not res.multi_face_landmarks:
            continue
        curr = np.array([[p.x,p.y] for p in res.multi_face_landmarks[0].landmark])
        dist = np.linalg.norm(known-curr, axis=1).mean()
        if dist < THRESHOLD:
            return jsonify(success=True, message="Visage reconnu")
    return jsonify(success=False, message="Visage non reconnu"), 401

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PYTHON_PORT",5001)), debug=False)
