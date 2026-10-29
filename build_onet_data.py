#!/usr/bin/env python3
"""
Build the survey's O*NET data files from the official O*NET database download.

Input: a folder (or .zip) containing these O*NET files, as CSV, Excel or tab-delimited text:
    Content Model Reference, IWA Reference, DWA Reference, Task Statements, Occupation Data

Output (written to ../data/ by default):
    onet_activities.json   GWA -> IWA -> DWA hierarchy, used by the survey page
    soc_tasks.json         the 23 SOC major groups -> occupations -> task statements
    soc_tasks.csv          the same tasks as one flat table (opens in Excel)

Usage:
    python3 tools/build_onet_data.py <folder-or-zip> --release "31.0" --date "August 2026"
"""
import argparse, csv, io, json, re, sys, zipfile
from pathlib import Path

import pandas as pd

FILES = {
    "content_model": "content model reference",
    "iwa": "iwa reference",
    "dwa": "dwa reference",
    "hierarchy": "gwas to iwas to dwas",
    "tasks": "task statements",
    "occupations": "occupation data",
}

# 2018 Standard Occupational Classification major groups.
SOC_MAJOR_GROUPS = {
    "11": "Management Occupations",
    "13": "Business and Financial Operations Occupations",
    "15": "Computer and Mathematical Occupations",
    "17": "Architecture and Engineering Occupations",
    "19": "Life, Physical, and Social Science Occupations",
    "21": "Community and Social Service Occupations",
    "23": "Legal Occupations",
    "25": "Educational Instruction and Library Occupations",
    "27": "Arts, Design, Entertainment, Sports, and Media Occupations",
    "29": "Healthcare Practitioners and Technical Occupations",
    "31": "Healthcare Support Occupations",
    "33": "Protective Service Occupations",
    "35": "Food Preparation and Serving Related Occupations",
    "37": "Building and Grounds Cleaning and Maintenance Occupations",
    "39": "Personal Care and Service Occupations",
    "41": "Sales and Related Occupations",
    "43": "Office and Administrative Support Occupations",
    "45": "Farming, Fishing, and Forestry Occupations",
    "47": "Construction and Extraction Occupations",
    "49": "Installation, Maintenance, and Repair Occupations",
    "51": "Production Occupations",
    "53": "Transportation and Material Moving Occupations",
    "55": "Military Specific Occupations",
}


def norm(name):
    return re.sub(r"[^a-z]+", " ", name.lower()).strip()


def collect_sources(src: Path):
    """Return {key: (filename, bytes)} for each needed file, from a folder or a zip (zips may be nested)."""
    found = {}

    def consider(name, read):
        stem = norm(Path(name).stem)
        ext = Path(name).suffix.lower()
        if ext not in (".csv", ".txt", ".xlsx", ".xls"):
            return
        for key, want in FILES.items():
            if stem == want and key not in found:
                found[key] = (name, read())

    def walk_zip(zf):
        for info in zf.infolist():
            if info.filename.lower().endswith(".zip"):
                walk_zip(zipfile.ZipFile(io.BytesIO(zf.read(info))))
            else:
                consider(info.filename, lambda i=info: zf.read(i))

    if src.is_file() and src.suffix.lower() == ".zip":
        walk_zip(zipfile.ZipFile(src))
    else:
        for p in sorted(src.rglob("*")):
            if p.is_file():
                if p.suffix.lower() == ".zip":
                    walk_zip(zipfile.ZipFile(p))
                else:
                    consider(p.name, p.read_bytes)
    missing = [FILES[k] for k in ("content_model", "tasks", "occupations") if k not in found]
    if "hierarchy" not in found:
        missing.extend(FILES[k] for k in ("iwa", "dwa") if k not in found)
    if missing:
        sys.exit("Missing O*NET files: " + ", ".join(m.title() for m in missing))
    return found


def read_table(name, data):
    ext = Path(name).suffix.lower()
    if ext in (".xlsx", ".xls"):
        df = pd.read_excel(io.BytesIO(data), dtype=str)
    else:
        text = data.decode("utf-8-sig", errors="replace")
        sep = "\t" if text.split("\n", 1)[0].count("\t") > text.split("\n", 1)[0].count(",") else ","
        df = pd.read_csv(io.StringIO(text), sep=sep, dtype=str, keep_default_na=False)
    df.columns = [norm(c) for c in df.columns]
    return df.fillna("")


def col(df, *options):
    for o in options:
        if norm(o) in df.columns:
            return norm(o)
    sys.exit(f"Expected one of the columns {options}; found {list(df.columns)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("--release", default="31.0")
    ap.add_argument("--date", default="August 2026")
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "data")
    a = ap.parse_args()

    src = collect_sources(a.source)
    cm = read_table(*src["content_model"])
    if "hierarchy" in src:
        hierarchy = read_table(*src["hierarchy"])
        iwa = hierarchy[["gwa element id", "iwa element id", "iwa element name"]].drop_duplicates()
        iwa.columns = ["element id", "iwa id", "iwa title"]
        dwa = hierarchy[["iwa element id", "dwa element id", "dwa element name"]].drop_duplicates()
        dwa.columns = ["iwa id", "dwa id", "dwa title"]
    else:
        iwa = read_table(*src["iwa"])
        dwa = read_table(*src["dwa"])
    tasks = read_table(*src["tasks"])
    occ = read_table(*src["occupations"])

    # ---- activity hierarchy ----
    cm_id, cm_name, cm_desc = col(cm, "Element ID"), col(cm, "Element Name"), col(cm, "Description")
    names = dict(zip(cm[cm_id], cm[cm_name]))
    descs = dict(zip(cm[cm_id], cm[cm_desc]))

    i_gwa, i_id, i_title = col(iwa, "Element ID"), col(iwa, "IWA ID"), col(iwa, "IWA Title")
    d_iwa, d_id, d_title = col(dwa, "IWA ID"), col(dwa, "DWA ID"), col(dwa, "DWA Title")

    dwas_by_iwa = {}
    for _, r in dwa.drop_duplicates(d_id).iterrows():
        dwas_by_iwa.setdefault(r[d_iwa], []).append({"id": r[d_id], "title": r[d_title]})

    iwas_by_gwa = {}
    for _, r in iwa.drop_duplicates(i_id).iterrows():
        iwas_by_gwa.setdefault(r[i_gwa], []).append(
            {"id": r[i_id], "title": r[i_title], "dwas": sorted(dwas_by_iwa.get(r[i_id], []), key=lambda d: d["id"])}
        )

    gwa_ids = sorted(iwas_by_gwa)  # every GWA that has IWAs
    categories = {}
    for g in gwa_ids:
        cat = ".".join(g.split(".")[:3])  # e.g. 4.A.1
        categories.setdefault(cat, []).append(
            {"id": g, "name": names.get(g, g), "description": descs.get(g, ""),
             "iwas": sorted(iwas_by_gwa[g], key=lambda x: x["id"])}
        )

    n_iwa = sum(len(v) for v in iwas_by_gwa.values())
    n_dwa = sum(len(i["dwas"]) for v in iwas_by_gwa.values() for i in v)
    activities = {
        "source": f"O*NET {a.release} Database",
        "released": a.date,
        "counts": {"gwa": len(gwa_ids), "iwa": n_iwa, "dwa": n_dwa},
        "categories": [{"id": c, "name": names.get(c, c), "gwas": categories[c]} for c in sorted(categories)],
    }

    # ---- SOC major groups -> occupations -> tasks ----
    o_code, o_title = col(occ, "O*NET-SOC Code"), col(occ, "Title")
    t_code, t_id, t_task = col(tasks, "O*NET-SOC Code"), col(tasks, "Task ID"), col(tasks, "Task")
    t_type = col(tasks, "Task Type") if "task type" in tasks.columns else None
    titles = dict(zip(occ[o_code], occ[o_title]))

    groups = {k: {"code": f"{k}-0000", "title": v, "occupations": {}} for k, v in SOC_MAJOR_GROUPS.items()}
    flat = []
    for _, r in tasks.iterrows():
        code = r[t_code]
        g = groups.get(code[:2])
        if not g:
            continue
        o = g["occupations"].setdefault(code, {"code": code, "title": titles.get(code, ""), "tasks": []})
        t = {"id": r[t_id], "task": r[t_task]}
        if t_type and r[t_type]:
            t["type"] = r[t_type]
        o["tasks"].append(t)
        flat.append([g["code"], g["title"], code, o["title"], r[t_id], r[t_task], r[t_type] if t_type else ""])

    major = []
    for k in SOC_MAJOR_GROUPS:
        g = groups[k]
        occs = sorted(g["occupations"].values(), key=lambda o: o["code"])
        major.append({"code": g["code"], "title": g["title"], "occupationCount": len(occs),
                      "taskCount": sum(len(o["tasks"]) for o in occs), "occupations": occs})
    soc = {"source": f"O*NET {a.release} Database", "released": a.date,
           "counts": {"majorGroups": len(major), "occupations": sum(m["occupationCount"] for m in major),
                      "tasks": sum(m["taskCount"] for m in major)},
           "majorGroups": major}

    a.out.mkdir(parents=True, exist_ok=True)
    (a.out / "onet_activities.json").write_text(json.dumps(activities, ensure_ascii=False, indent=1), encoding="utf-8")
    (a.out / "soc_tasks.json").write_text(json.dumps(soc, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(a.out / "soc_tasks.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["SOC major group code", "SOC major group", "O*NET-SOC code", "Occupation", "Task ID", "Task", "Task type"])
        w.writerows(flat)

    print(f"Activities: {activities['counts']}")
    print(f"SOC tasks:  {soc['counts']}  (groups with no tasks: "
          f"{[m['code'] for m in major if m['taskCount'] == 0] or 'none'})")


if __name__ == "__main__":
    main()