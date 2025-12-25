# Cattle Skin Disease Severity Assessment

This project focuses on identifying cattle skin diseases and assessing the severity level of skin wounds using image-based analysis.

## Project Description
The system uses a deep learning model (ResNet-18 with transfer learning) to classify cattle skin images into disease categories such as healthy, lumpy skin disease, and foot-and-mouth disease.  
Since the dataset does not contain labeled severity levels, severity is estimated using image processing techniques by calculating the lesion area percentage from the uploaded image.

## Features
- Disease classification using CNN
- Severity estimation (Low / Medium / High)
- Per-class probability visualization
- Confidence-aware predictions
- Web-based interface using Streamlit

## Technologies Used
- Python
- PyTorch
- Torchvision
- OpenCV
- Streamlit
- NumPy
- Pandas

## How to Run
```bash
streamlit run app.py
