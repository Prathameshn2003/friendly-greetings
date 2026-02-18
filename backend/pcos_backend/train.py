# ==============================
# train.py
# ==============================

import pandas as pd
import numpy as np
import pickle

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier

# ------------------------------
# Load Dataset (SAME FOLDER)
# ------------------------------
df = pd.read_csv("PCOS_data_Yes_No.csv")

# Clean column names (IMPORTANT)
df.columns = df.columns.str.strip()

print("Dataset Loaded Successfully")
print("Columns:", df.columns.tolist())

# ------------------------------
# Select 15 Important Features
# ------------------------------
FEATURES = [
    'Age (yrs)',
    'Weight (Kg)',
    'BMI',
    'Cycle(R/I)',
    'Cycle length(days)',
    'Weight gain(Y/N)',
    'hair growth(Y/N)',
    'Skin darkening (Y/N)',
    'Hair loss(Y/N)',
    'Pimples(Y/N)',
    'Fast food (Y/N)',
    'Reg.Exercise(Y/N)',
    'Follicle No. (L)',
    'Follicle No. (R)',
    'Endometrium (mm)'
]

TARGET = 'PCOS (Y/N)'

X = df[FEATURES].copy()
y = df[TARGET].copy()

# ------------------------------
# Handle Missing Values
# ------------------------------
for col in X.columns:
    if X[col].dtype == 'object':
        X[col].fillna("No", inplace=True)
    else:
        X[col].fillna(X[col].median(), inplace=True)

y.fillna("No", inplace=True)

# ------------------------------
# Encode Yes/No Columns
# ------------------------------
encoder = LabelEncoder()
for col in X.columns:
    if X[col].dtype == 'object':
        X[col] = encoder.fit_transform(X[col])

y = encoder.fit_transform(y)

# ------------------------------
# Handle Outside / Unseen Values
# ------------------------------
X['Age (yrs)'] = X['Age (yrs)'].clip(15, 50)
X['BMI'] = X['BMI'].clip(15, 45)
X['Cycle length(days)'] = X['Cycle length(days)'].clip(15, 90)
X['Follicle No. (L)'] = X['Follicle No. (L)'].clip(0, 30)
X['Follicle No. (R)'] = X['Follicle No. (R)'].clip(0, 30)
X['Endometrium (mm)'] = X['Endometrium (mm)'].clip(1, 20)

# ------------------------------
# Feature Scaling
# ------------------------------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ------------------------------
# Train Test Split
# ------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ------------------------------
# Random Forest Model
# ------------------------------
rf_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    random_state=42
)
rf_model.fit(X_train, y_train)

# ------------------------------
# XGBoost Model
# ------------------------------
xgb_model = XGBClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=5,
    eval_metric='logloss'
)
xgb_model.fit(X_train, y_train)

# ------------------------------
# KNN Model (Recommendation)
# ------------------------------
knn_model = KNeighborsClassifier(n_neighbors=5)
knn_model.fit(X_train, y_train)

# ------------------------------
# Save Models
# ------------------------------
import os
os.makedirs("models", exist_ok=True)

pickle.dump(rf_model, open("models/rf_model.pkl", "wb"))
pickle.dump(xgb_model, open("models/xgb_model.pkl", "wb"))
pickle.dump(knn_model, open("models/knn_model.pkl", "wb"))
pickle.dump(scaler, open("models/scaler.pkl", "wb"))

print("✅ Training Completed Successfully")
print("✅ Models saved in 'models/' folder")
