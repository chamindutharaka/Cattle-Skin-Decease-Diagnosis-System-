from flask import Flask, request, jsonify
from flask_cors import CORS
from Net import SimpleCNN
import torch
from torchvision import transforms
from PIL import Image
import io
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim

# ---------------- CONFIG ----------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Labels
image_check_labels = ["cow", "not_a_cow"]
class_labels = ["Healthy", "Lumpy"]

# ---------------- LOAD MODELS ----------------

# Image validation model (cow / not cow)
image_check_model = SimpleCNN(num_classes=len(image_check_labels))
image_check_model.load_state_dict(
    torch.load("image_check.pth", map_location=device)
)
image_check_model.to(device)
image_check_model.eval()

# Disease classification model
disease_model = SimpleCNN(num_classes=len(class_labels))
disease_model.load_state_dict(
    torch.load("model.pth", map_location=device)
)
disease_model.to(device)
disease_model.eval()

# ---------------- TRANSFORM ----------------
transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5],
                         [0.5, 0.5, 0.5])
])

# Same transform for image check
image_check_transform = transform

# ---------------- FLASK ----------------
app = Flask(__name__)
CORS(app)

# ---------------- IMAGE CHECK FUNCTION ----------------
def is_cow_image(image_tensor, threshold=0.7):
    """
    Returns (is_cow: bool, confidence: float)
    """
    with torch.no_grad():
        outputs = image_check_model(image_tensor)
        probs = torch.softmax(outputs, dim=1)

        predicted = torch.argmax(probs, dim=1).item()
        confidence = probs[0][predicted].item()

    label = image_check_labels[predicted]

    if label == "cow" and confidence >= threshold:
        return True, confidence
    else:
        return False, confidence

# ---------------- RETINEX + SSIM ----------------
def single_scale_retinex(img, sigma):
    blur = cv2.GaussianBlur(img, (0, 0), sigma)
    retinex = np.log1p(img) - np.log1p(blur)
    return retinex

def apply_retinex(image_pil):
    img = np.array(image_pil).astype(np.float32) + 1.0
    img /= 255.0

    sigmas = [15, 80, 250]
    enhanced_images = []

    for sigma in sigmas:
        ret = single_scale_retinex(img, sigma)
        ret = cv2.normalize(ret, None, 0, 1, cv2.NORM_MINMAX)
        enhanced_images.append(ret)

    return enhanced_images

def select_best_by_ssim(original_pil, enhanced_list):
    original = np.array(original_pil)
    original_gray = cv2.cvtColor(original, cv2.COLOR_RGB2GRAY)

    best_score = -1
    best_image = None

    for enhanced in enhanced_list:
        enhanced_uint8 = (enhanced * 255).astype(np.uint8)
        enhanced_gray = cv2.cvtColor(enhanced_uint8, cv2.COLOR_RGB2GRAY)

        score = ssim(original_gray, enhanced_gray, data_range=255)

        if score > best_score:
            best_score = score
            best_image = enhanced_uint8

    # Safety fallback
    if best_image is None:
        best_image = original

    return best_image

# ---------------- ROUTES ----------------
@app.route("/")
def home():
    return "Backend running successfully"

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Load image
        original_image = Image.open(io.BytesIO(file.read())).convert("RGB")

        # ---------- IMAGE VALIDATION ----------
        check_tensor = image_check_transform(original_image)\
            .unsqueeze(0).to(device)

        is_cow, cow_conf = is_cow_image(check_tensor)

        if not is_cow:
            return jsonify({
                "error": "Uploaded image is not a cattle image",
                "cow_confidence": round(cow_conf * 100, 2)
            }), 400

        # ---------- HYBRID RETINEX + SSIM ----------
        retinex_images = apply_retinex(original_image)
        best_image = select_best_by_ssim(original_image, retinex_images)

        image = Image.fromarray(best_image)
        image = transform(image).unsqueeze(0).to(device)

        # ---------- DISEASE PREDICTION ----------
        with torch.no_grad():
            outputs = disease_model(image)
            probs = torch.softmax(outputs, dim=1)
            predicted = torch.argmax(probs, dim=1).item()

            label = class_labels[predicted]
            confidence = probs[0][predicted].item()

        return jsonify({
            "prediction": label,
            "confidence": round(confidence * 100, 2),
            "cow_confidence": round(cow_conf * 100, 2)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- MAIN ----------------
if __name__ == "__main__":
    app.run(debug=True, port=2200)
