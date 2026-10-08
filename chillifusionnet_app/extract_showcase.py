import os
import json
import pandas as pd
from pathlib import Path

# Setup paths
base_dir = Path(r"c:\Users\sangm\OneDrive\git remote\OneDrive\Desktop\Major Model\CHILLIFUSIONNET\chillifusionnet_app_advanced\chillifusionnet_app")
showcase_dir = base_dir / "chillifusionnet_showcase1"
data_dir = base_dir / "project_data"

# Create directories
(data_dir / "training").mkdir(parents=True, exist_ok=True)
(data_dir / "evaluation").mkdir(parents=True, exist_ok=True)
(data_dir / "model").mkdir(parents=True, exist_ok=True)

def parse_metrics_summary():
    df = pd.read_csv(showcase_dir / "metrics_summary.csv")
    metrics = dict(zip(df['Metric'], df['Value']))
    return metrics

def safe_float(val):
    try:
        return float(val)
    except:
        return None

def safe_int(val):
    try:
        return int(float(val))
    except:
        return None

def extract_all():
    print("Extracting data from showcase...")
    metrics = parse_metrics_summary()
    
    # 1. model/model_summary.txt (N/A)
    # We will write N/A since it's not present in showcase
    with open(data_dir / "model" / "model_summary.txt", "w") as f:
        f.write("N/A - Original model_summary.txt not provided in showcase data.")
        
    # 2. model/model_config.json
    model_config = {
        "model_name": metrics.get("Model Name", "N/A"),
        "architecture": metrics.get("Architecture", "N/A"),
        "input_size": metrics.get("Input Size", "N/A"),
        "number_of_classes": safe_int(metrics.get("Number of Classes")),
    }
    with open(data_dir / "model" / "model_config.json", "w") as f:
        json.dump(model_config, f, indent=4)
        
    # 3. model/class_names.json (read from existing backend)
    with open(base_dir / "backend" / "class_names.json", "r") as f:
        class_names = json.load(f)
    with open(data_dir / "model" / "class_names.json", "w") as f:
        json.dump(class_names, f, indent=4)
        
    # 4. training/training_history.json
    try:
        history_df = pd.read_csv(showcase_dir / "training_history.csv")
        history_dict = history_df.to_dict(orient="list")
    except:
        history_dict = {"N/A": None}
    with open(data_dir / "training" / "training_history.json", "w") as f:
        json.dump(history_dict, f, indent=4)
        
    # 5. training/training_details.json
    training_details = {
        "training_samples": safe_int(metrics.get("Training Samples")),
        "validation_samples": safe_int(metrics.get("Validation Samples")),
        "initial_epochs_requested": safe_int(metrics.get("Initial Epochs (requested)")),
        "fine_tuning_epochs_requested": safe_int(metrics.get("Fine-tuning Epochs (requested)")),
        "actual_epochs_run": safe_int(metrics.get("Actual Epochs Run")),
        "training_time": "207.71 minutes" # from final_experiment_report.txt
    }
    with open(data_dir / "training" / "training_details.json", "w") as f:
        json.dump(training_details, f, indent=4)
        
    # 6. training/best_epoch.json
    best_epoch = {
        "best_epoch": safe_int(metrics.get("Best Epoch")),
        "best_validation_accuracy": safe_float(metrics.get("Best Validation Accuracy")),
        "best_validation_loss": safe_float(metrics.get("Best Validation Loss"))
    }
    with open(data_dir / "training" / "best_epoch.json", "w") as f:
        json.dump(best_epoch, f, indent=4)
        
    # 7. evaluation/metrics.json
    eval_metrics = {
        "test_samples": safe_int(metrics.get("Test Samples")),
        "test_accuracy": safe_float(metrics.get("Final Test Accuracy")),
        "test_loss": safe_float(metrics.get("Test Loss")),
        "macro_precision": safe_float(metrics.get("Macro Precision")),
        "macro_recall": safe_float(metrics.get("Macro Recall")),
        "macro_f1": safe_float(metrics.get("Macro F1")),
        "macro_auc": safe_float(metrics.get("Macro AUC")),
        "macro_sensitivity": safe_float(metrics.get("Macro Sensitivity")),
        "macro_specificity": safe_float(metrics.get("Macro Specificity"))
    }
    with open(data_dir / "evaluation" / "metrics.json", "w") as f:
        json.dump(eval_metrics, f, indent=4)
        
    # 8. evaluation/classification_report.json
    try:
        cr_df = pd.read_csv(showcase_dir / "classification_report.csv", index_col=0)
        cr_dict = cr_df.to_dict(orient="index")
    except:
        cr_dict = {"N/A": None}
    with open(data_dir / "evaluation" / "classification_report.json", "w") as f:
        json.dump(cr_dict, f, indent=4)
        
    # 9. evaluation/confusion_matrix.json
    try:
        cm_df = pd.read_csv(showcase_dir / "confusion_matrix.csv", header=None)
        cm_dict = {"matrix": cm_df.values.tolist()}
    except:
        cm_dict = {"N/A": None}
    with open(data_dir / "evaluation" / "confusion_matrix.json", "w") as f:
        json.dump(cm_dict, f, indent=4)
        
    # 10. evaluation/sensitivity_specificity.json
    try:
        ss_df = pd.read_csv(showcase_dir / "sensitivity_specificity.csv")
        ss_dict = ss_df.to_dict(orient="records")
    except:
        ss_dict = {"N/A": None}
    with open(data_dir / "evaluation" / "sensitivity_specificity.json", "w") as f:
        json.dump(ss_dict, f, indent=4)
        
    # 11. evaluation/roc_auc.json (Not explicitly in csv, but macro AUC is)
    with open(data_dir / "evaluation" / "roc_auc.json", "w") as f:
        json.dump({"macro_auc": eval_metrics["macro_auc"], "per_class_auc": "N/A - See roc_curve.png"}, f, indent=4)
        
    # 12. evaluation/class_distribution.json (Not explicitly provided beyond what is in classification report support)
    try:
        distribution = {}
        for cls in class_names:
            if cls in cr_dict:
                distribution[cls] = int(cr_dict[cls]["support"])
    except:
        distribution = {"N/A": None}
    with open(data_dir / "evaluation" / "class_distribution.json", "w") as f:
        json.dump(distribution, f, indent=4)

    print("Data extraction complete! The following real values were found and saved:")
    print("--- Model Config ---")
    print(json.dumps(model_config, indent=2))
    print("--- Training Details ---")
    print(json.dumps(training_details, indent=2))
    print("--- Evaluation Metrics ---")
    print(json.dumps(eval_metrics, indent=2))

if __name__ == "__main__":
    extract_all()
