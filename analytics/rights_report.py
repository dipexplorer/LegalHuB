#!/usr/bin/env python3
"""
analytics/rights_report.py
Reads user_activity.csv and produces:
 - top searched terms (bar chart)
 - top downloaded forms (bar chart)
 - top categories (bar chart)
 - saves PNGs to analytics_reports/
 - creates a simple analytics_reports/report.html that embeds PNGs
"""

import os
import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter

INPUT_CSV = "user_activity.csv"
OUT_DIR = "analytics_reports"

os.makedirs(OUT_DIR, exist_ok=True)

def load_data(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} not found. Provide a sample CSV as described in README.")
    df = pd.read_csv(path, parse_dates=["timestamp"])
    return df

def plot_and_save(series, title, fname, xlabel="", ylabel="Count", top_n=10):
    top = series.value_counts().nlargest(top_n)
    plt.figure(figsize=(8,5))
    top.plot(kind="bar")
    plt.title(title)
    plt.xlabel(xlabel if xlabel else "")
    plt.ylabel(ylabel)
    plt.tight_layout()
    outpath = os.path.join(OUT_DIR, fname)
    plt.savefig(outpath)
    plt.close()
    return outpath

def main():
    print("Loading data...")
    df = load_data(INPUT_CSV)

    # Most searched terms
    searches = df[df["action"].str.lower() == "search"]
    if "term" in df.columns:
        print("Computing most searched terms...")
        p1 = plot_and_save(searches["term"].dropna(), "Top Searched Legal Terms", "top_searched_terms.png", xlabel="Term")
    else:
        p1 = None

    # Most downloaded forms
    downloads = df[df["action"].str.lower().isin(["download", "downloaded"])]
    if "form_id" in df.columns:
        print("Computing most downloaded forms...")
        p2 = plot_and_save(downloads["form_id"].dropna(), "Top Downloaded Forms", "top_downloaded_forms.png", xlabel="Form ID")
    else:
        p2 = None

    # Common categories of user queries (or visits)
    if "category" in df.columns:
        print("Computing top categories...")
        p3 = plot_and_save(df["category"].dropna(), "Top Categories", "top_categories.png", xlabel="Category")
    else:
        p3 = None

    # Basic usage stats table
    stats = {
        "total_events": len(df),
        "unique_users": df["user_id"].nunique() if "user_id" in df.columns else "N/A",
        "total_searches": len(searches)
    }

    # Create a simple HTML report
    html = [
        "<html><head><meta charset='utf-8'><title>LegalHuB Analytics Report</title></head><body>",
        "<h1>LegalHuB Analytics Report</h1>",
        "<h2>Summary</h2>",
        "<ul>"
    ]
    for k,v in stats.items():
        html.append(f"<li><strong>{k}:</strong> {v}</li>")
    html.append("</ul>")

    if p1:
        html.append("<h2>Top Searched Terms</h2>")
        html.append(f"<img src='top_searched_terms.png' alt='Top searched terms' style='max-width:800px'>")
    if p2:
        html.append("<h2>Top Downloaded Forms</h2>")
        html.append(f"<img src='top_downloaded_forms.png' alt='Top downloaded forms' style='max-width:800px'>")
    if p3:
        html.append("<h2>Top Categories</h2>")
        html.append(f"<img src='top_categories.png' alt='Top categories' style='max-width:800px'>")

    html.append("</body></html>")

    report_path = os.path.join(OUT_DIR, "report.html")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(html))

    print(f"Report and charts saved to {OUT_DIR}/")
    print("Open analytics_reports/report.html in your browser to view.")

if __name__ == "__main__":
    main()
