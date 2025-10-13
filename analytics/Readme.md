# 📊 LegalHuB Analytics Dashboard

## 📝 Overview
The **LegalHuB Analytics Dashboard** is an **Python-based data visualization tool** that helps analyze platform usage trends — such as **most searched legal terms**, **most downloaded forms**, and **top categories** — using sample activity data.

---

## 🧠 Features

* 📈 Analyze platform activity from a CSV file (`user_activity_sample.csv`)
* 🔍 Identify top searched legal terms and downloaded forms
* 🧾 Generate summary statistics (unique users, total actions, etc.)
* 🖼️ Visualize insights as charts (PNG)
* 🌐 Compile everything into an easy-to-view HTML report

---

## 📂 Folder Structure
```bash 
LegalHuB/
└── analytics/
     ├── rights_report.py         # Main analytics script
     ├── user_activity_sample.csv # Sample dataset
     ├── README.md                # This file
     └── analytics_reports/       # Auto-generated reports folder
         ├── report.html
         ├── top_categories.png
         ├── top_downloaded_forms.png
         └── top_searched_terms.png

```



## ⚙️ Requirements

Install dependencies (preferably in a virtual environment):
```bash
pip install pandas matplotlib
```

---

## 🚀 Usage Instructions

1. Open terminal in the LegalHuB directory
```bash
cd analytics
```


2. Run the script
```bash
python rights_report.py
```

3. View the output
After running successfully, check the folder:
```bash
analytics/analytics_reports/
```
Open report.html in your browser to explore:

- Summary statistics
- Top searched terms chart
- Top downloaded forms chart
- Top categories chart


---


## 🧩 Input Data Format

**The script expects a CSV file (user_activity_sample.csv) with these columns:**

| Column     | Description                              |
|-------------|------------------------------------------|
| timestamp   | Date & time of the event                 |
| user_id     | Unique ID of the user                    |
| action      | Action performed (e.g., search, download)|
| term        | Legal term searched                      |
| form_id     | Form downloaded                          |
| category    | Category of the event (e.g., Housing, Employment) |


**⚠️ Make sure column names match exactly, or the script will skip those visualizations.**


---

## 🧾 Output

When executed, the script automatically generates:

- PNG charts (saved in analytics_reports/)

- A combined HTML dashboard report with embedded charts

Example output preview:
```bash
analytics_reports/
├── report.html
├── top_categories.png
├── top_downloaded_forms.png
└── top_searched_terms.png
```


## Important Notes
- The script is idempotent — running it again will overwrite the previous reports.
- This analytics module is offline and does not require any backend setup.

---

Developed by [@vishalsorout0] as part of GSSoC’25 
Feature: Offline Analytics Dashboard (rights_report.py)