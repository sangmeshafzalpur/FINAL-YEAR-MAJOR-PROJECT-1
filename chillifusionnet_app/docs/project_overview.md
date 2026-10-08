# Project Overview

## 1. Problem Statement
Chilli crops are fundamental to global agriculture and local economies. However, they are highly susceptible to a variety of yield-destroying conditions, including pathogenic diseases (e.g., Cercospora Leaf Spot, Powdery Mildew), pest infestations (e.g., Mites and Thrips), and nutritional deficiencies. Traditionally, detecting these issues relies on the visual inspection of farmers or the periodic visits of agricultural experts. This manual process is subjective, labor-intensive, error-prone, and often too slow to prevent widespread crop damage.

There is a critical demand for an automated, accessible, and highly accurate diagnostic tool capable of identifying these conditions in real-time, empowering farmers to apply targeted interventions immediately.

## 2. Objectives
The primary objectives of the **ChilliFusionNet** project are:
1. **High-Accuracy Classification**: To design and train a deep learning model capable of accurately classifying chilli leaf images into 5 specific categories (Healthy, Cercospora, Mites & Thrips, Nutritional Deficiency, Powdery Mildew).
2. **Model Transparency (Explainable AI)**: To integrate XAI techniques (Grad-CAM) that visually explain the model's predictions, ensuring that users can trust the automated diagnosis.
3. **Professional User Interface**: To develop a modern, interactive, and responsive web dashboard that makes the complex AI model accessible to non-technical users.
4. **Scalable Backend**: To build a robust RESTful API that efficiently handles image preprocessing, model inference, and the generation of visual artifacts.

## 3. Dataset Summary
The model was trained, validated, and tested on a comprehensive dataset of chilli leaf images. The input resolution for all images was standardized to **380x380x3** (RGB). 

**Target Classes**:
- Cercospora Leaf Spot
- Healthy
- Mites & Thrips Infestation
- Nutritional Deficiency
- Powdery Mildew

## 4. Final Evaluation Results
The final model underwent rigorous testing (on 2,225 test samples), achieving state-of-the-art performance metrics that prove its efficacy for real-world deployment:
- **Test Accuracy**: 99.87%
- **Macro Precision**: 99.87%
- **Macro Recall**: 99.84%
- **Macro F1-Score**: 99.85%
- **Macro Sensitivity**: 99.84%
- **Macro Specificity**: 99.97%
- **Macro AUC**: 1.0000

The model demonstrates exceptional robustness, minimizing false positives and ensuring reliable diagnostic support.
