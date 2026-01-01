import streamlit as st
from PIL import Image
import torch
from torchvision import transforms, models
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pandas as pd
import cv2

# --------------------------------------------------
# PAGE CONFIGURATION
# --------------------------------------------------
st.set_page_config(page_title="Severity Analyzer", layout="centered")

st.title("Assess the Severity Level")
st.write("Upload a cattle skin image to identify the disease and estimate wound severity.")

# --------------------------------------------------
# LOAD MODEL
# --------------------------------------------------
model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
num_features = model.fc.in_features
model.fc = nn.Linear(num_features, 3)

model.load_state_dict(torch.load("cow_cnn_model.pth", map_location=torch.device('cpu')))
model.eval()

labels = ["foot-and-mouth", "healthy", "lumpy"]

# --------------------------------------------------
# IMAGE TRANSFORM
# --------------------------------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

# --------------------------------------------------
# FILE UPLOADER
# --------------------------------------------------
uploaded_file = st.file_uploader("Choose a cattle image...", type=["jpg", "jpeg", "png"])

if uploaded_file:

    # Display uploaded image
    image = Image.open(uploaded_file).convert("RGB")
    st.image(image, width=350, caption="Uploaded Image")

    # --------------------------------------------------
    # MODEL PREDICTION + PROBABILITIES
    # --------------------------------------------------
    img_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(img_tensor)
        probs = F.softmax(output, dim=1)
        _, pred = torch.max(probs, 1)

    disease = labels[pred.item()]
    confidence = probs[0][pred.item()].item() * 100

    # --------------------------------------------------
    # DISEASE RESULTS
    # --------------------------------------------------
    st.subheader("Disease Prediction:")
    st.write(f"**{disease.upper()}**")
    st.write(f"Model confidence: **{confidence:.2f}%**")

    if disease == "healthy":
        st.success("Healthy cattle skin detected.")
    elif disease == "lumpy":
        st.warning("Lumpy Skin Disease detected.")
    else:
        st.error("Foot and Mouth Disease detected.")

    # --------------------------------------------------
    # PER-CLASS PROBABILITY BAR CHART (RESEARCH FEATURE)
    # --------------------------------------------------
    st.subheader("Class Probability Distribution")

    prob_data = {
        "Disease": labels,
        "Probability (%)": [
            probs[0][0].item() * 100,
            probs[0][1].item() * 100,
            probs[0][2].item() * 100
        ]
    }

    df_probs = pd.DataFrame(prob_data)
    st.bar_chart(df_probs.set_index("Disease"))

    st.caption("Probabilities are obtained using the softmax function on the model output.")

    # --------------------------------------------------
    # SEVERITY ANALYSIS (IMAGE PROCESSING)
    # --------------------------------------------------
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)

    thresh = cv2.adaptiveThreshold(
        img_cv, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY_INV,
        21, 10
    )

    lesion_pixels = np.sum(thresh == 255)
    total_pixels = thresh.size
    severity_percent = (lesion_pixels / total_pixels) * 100

    if disease == "healthy":
        severity_level = "None"
    else:
        if severity_percent < 10:
            severity_level = "Low"
            color = "green"
        elif severity_percent < 30:
            severity_level = "Medium"
            color = "orange"
        else:
            severity_level = "High"
            color = "red"

    # --------------------------------------------------
    # SEVERITY DISPLAY
    # --------------------------------------------------
    st.subheader("Severity Level:")

    if disease == "healthy":
        st.info("No wound area detected.")
    else:
        st.markdown(
            f"""
            <div style="background-color:{color}; padding:12px; border-radius:8px">
            <h3 style="color:white; text-align:center;">
            {severity_level.upper()} – {severity_percent:.2f}% lesion area
            </h3>
            </div>
            """,
            unsafe_allow_html=True
        )

        st.write("Severity Coverage Scale:")
        st.progress(int(severity_percent))

        # --------------------------------------------------
        # SEGMENTATION PREVIEW
        # --------------------------------------------------
        st.write("Lesion segmentation output (white = wound area):")
        st.image(thresh, width=350)
