import csv
import json
import re
import sys
import unicodedata
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

import pandas as pd
from dateutil.relativedelta import relativedelta

REPORTS_DIR = Path("reports")


def clean_columns(df):
    df = df.copy()
    df.columns = [
        "".join(ch for ch in unicodedata.normalize("NFKD", str(col)) if not unicodedata.combining(ch)).strip()
        for col in df.columns
    ]
    return df


def normalize_text(value):
    text = "".join(ch for ch in unicodedata.normalize("NFKD", str(value or "")) if not unicodedata.combining(ch))
    text = re.sub(r"[^A-Z0-9 ]+", " ", text.upper())
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_localidade_match(value):
    text = normalize_text(value)
    text = re.sub(r"^BR\s+\d+\s+\d+\s+", "", text)
    text = re.sub(r"^BR\s+\d+\s+", "", text)
    text = re.sub(r"^\d+\s+", "", text)
    return text.strip()


def load_workbook_rows(workbook_paths):
    all_rows = []

    for path_str in workbook_paths:
        path = Path(path_str)
        excel = pd.ExcelFile(path)

        for sheet in excel.sheet_names:
            if normalize_text(sheet) == "RELATORIO":
                continue

            df = clean_columns(excel.parse(sheet))
            if "Nome" not in df.columns or "Localidade" not in df.columns:
                continue
            if "Nivel" not in df.columns:
                continue

            df = df[df["Nivel"].astype(str).str.contains("CANDIDATO", case=False, na=False)].copy()
            if df.empty:
                continue

            for col in ["MSA Lancamento", "Data Metodo", "Data Hino", "Data da Verificacao"]:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], dayfirst=True, errors="coerce")

            priority = 2 if "ITAPEVI" in normalize_text(path.name) or "ITAPEVI" in normalize_text(sheet) else 1

            for _, row in df.iterrows():
                payload = row.to_dict()
                payload["__source_file"] = path.name
                payload["__source_sheet"] = sheet
                payload["__priority"] = priority
                all_rows.append(payload)

    deduped = {}
    for row in all_rows:
        key = (normalize_text(row.get("Nome")), normalize_text(row.get("Localidade")))
        if key not in deduped or row.get("__priority", 0) >= deduped[key].get("__priority", 0):
            deduped[key] = row

    return list(deduped.values())


def read_supabase_credentials():
    source = Path("create_demo_users.js").read_text(encoding="utf-8")
    url = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", source).group(1)
    key = re.search(r"SERVICE_ROLE_KEY\s*=\s*'([^']+)'", source).group(1)
    return url, key


def fetch_all_candidates():
    url, key = read_supabase_credentials()
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    rows = []
    start = 0

    while True:
        req = urllib.request.Request(
            f"{url}/rest/v1/musica_acompanhamento_aluno?select=id,nome_aluno,comum_congregacao,status,nivel,observacoes&order=created_at.asc",
            headers={**headers, "Range": f"{start}-{start + 999}"},
        )
        with urllib.request.urlopen(req) as response:
            page = json.loads(response.read().decode())
        rows.extend(page)
        if len(page) < 1000:
            break
        start += 1000

    return [
        row for row in rows
        if str(row.get("status", "")).lower() != "concluido"
        and "oficializado" not in str(row.get("nivel", "")).lower()
    ]


def calculate_status(last_date, today):
    if pd.isna(last_date):
        return "Excluir"
    last_date = last_date.date()
    if last_date >= today - relativedelta(months=3):
        return "Ativo"
    if last_date >= today - relativedelta(months=6):
        return "Alerta"
    if last_date >= today - relativedelta(months=12):
        return "Inativo"
    return "Excluir"


def build_import_note(status, last_date, source_file, source_sheet):
    last_date_text = last_date.strftime("%d/%m/%Y") if pd.notna(last_date) else "sem atividade identificada"
    return (
        f"[STATUS_SAM] Status atualizado para {status} com base na planilha {source_file} / aba {source_sheet}. "
        f"Ultima atividade considerada: {last_date_text}."
    )


def merge_observacoes(existing, note):
    existing_text = str(existing or "").strip()
    cleaned = re.sub(r"\[STATUS_SAM\][^\[]*", "", existing_text).strip()
    if cleaned:
        return f"{cleaned}\n{note}".strip()
    return note


def is_review_name_candidate(workbook_name, db_name):
    workbook_norm = normalize_text(workbook_name)
    db_norm = normalize_text(db_name)

    if not workbook_norm or not db_norm:
        return False

    if workbook_norm == db_norm:
        return True

    return workbook_norm.startswith(db_norm) or db_norm.startswith(workbook_norm)


def build_review_suggestions(row, db_by_localidade_base):
    localidade_key = normalize_localidade_match(row.get("Localidade"))
    candidates = []

    for candidate in db_by_localidade_base.get(localidade_key, []):
        if is_review_name_candidate(row.get("Nome"), candidate.get("nome_aluno")):
            candidates.append({
                "id": candidate.get("id"),
                "nome_aluno": candidate.get("nome_aluno"),
                "comum_congregacao": candidate.get("comum_congregacao"),
                "status": candidate.get("status"),
                "nivel": candidate.get("nivel"),
            })

    return candidates[:5]


def write_reports(summary, unmatched):
    REPORTS_DIR.mkdir(exist_ok=True)
    json_path = REPORTS_DIR / "gem_status_import_preview.json"
    csv_path = REPORTS_DIR / "gem_status_unmatched_review.csv"

    json_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "nome",
            "localidade",
            "arquivo",
            "aba",
            "sugestoes",
        ])
        writer.writeheader()
        for item in unmatched:
            suggestions = item.get("sugestoes") or []
            writer.writerow({
                "nome": item.get("nome"),
                "localidade": item.get("localidade"),
                "arquivo": item.get("arquivo"),
                "aba": item.get("aba"),
                "sugestoes": " | ".join(
                    f"{entry.get('nome_aluno')} => {entry.get('comum_congregacao')}"
                    for entry in suggestions
                )
            })

    return {
        "preview_json": str(json_path),
        "review_csv": str(csv_path),
    }


def build_updates(workbook_rows, db_candidates):
    db_by_pair = {
        (normalize_text(row.get("nome_aluno")), normalize_text(row.get("comum_congregacao"))): row
        for row in db_candidates
    }
    db_by_pair_base = {}
    db_by_name = {}
    db_by_localidade_base = {}
    for row in db_candidates:
        base_pair = (normalize_text(row.get("nome_aluno")), normalize_localidade_match(row.get("comum_congregacao")))
        db_by_pair_base.setdefault(base_pair, []).append(row)
        db_by_name.setdefault(normalize_text(row.get("nome_aluno")), []).append(row)
        db_by_localidade_base.setdefault(normalize_localidade_match(row.get("comum_congregacao")), []).append(row)

    workbook_name_counts = Counter(normalize_text(row.get("Nome")) for row in workbook_rows)
    today = date(2026, 4, 22)
    updates = []
    unmatched = []
    match_rules = Counter()

    for row in workbook_rows:
        pair = (normalize_text(row.get("Nome")), normalize_text(row.get("Localidade")))
        base_pair = (normalize_text(row.get("Nome")), normalize_localidade_match(row.get("Localidade")))
        name_key = normalize_text(row.get("Nome"))
        target = None
        rule = None

        if pair in db_by_pair:
            target = db_by_pair[pair]
            rule = "par_exato"
        elif len(db_by_pair_base.get(base_pair, [])) == 1:
            target = db_by_pair_base[base_pair][0]
            rule = "par_sem_codigo"
        elif len(db_by_name.get(name_key, [])) == 1 and workbook_name_counts[name_key] == 1:
            target = db_by_name[name_key][0]
            rule = "nome_unico"

        if not target:
            unmatched.append({
                "nome": row.get("Nome"),
                "localidade": row.get("Localidade"),
                "arquivo": row.get("__source_file"),
                "aba": row.get("__source_sheet"),
                "sugestoes": build_review_suggestions(row, db_by_localidade_base),
            })
            continue

        last_date = max([
            row.get("MSA Lancamento"),
            row.get("Data Metodo"),
            row.get("Data Hino"),
        ])
        status = calculate_status(last_date, today)
        note = build_import_note(status, last_date, row.get("__source_file"), row.get("__source_sheet"))

        updates.append({
            "id": target["id"],
            "status": status,
            "observacoes": merge_observacoes(target.get("observacoes"), note),
        })
        match_rules[rule] += 1

    return updates, unmatched, match_rules


def apply_updates(updates):
    url, key = read_supabase_credentials()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    batch_size = 100
    applied = 0
    for index in range(0, len(updates), batch_size):
        batch = updates[index:index + batch_size]
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(apply_single_update, url, headers, item) for item in batch]
            for future in as_completed(futures):
                future.result()
        applied += len(batch)
        print(f"Lote aplicado: {applied}/{len(updates)}")


def apply_single_update(url, headers, item):
    payload = {
        "status": item["status"],
        "observacoes": item["observacoes"]
    }
    attempts = 0

    while attempts < 4:
        req = urllib.request.Request(
            f"{url}/rest/v1/musica_acompanhamento_aluno?id=eq.{item['id']}",
            headers=headers,
            data=json.dumps(payload).encode("utf-8"),
            method="PATCH"
        )
        try:
            with urllib.request.urlopen(req, timeout=40):
                return True
        except Exception as error:
            attempts += 1
            detail = ""
            if hasattr(error, "read"):
                try:
                    detail = error.read().decode()
                except Exception:
                    detail = ""
            if attempts >= 4:
                raise RuntimeError(f"Falha ao atualizar {item['id']}: {detail or error}")


def main():
    apply_mode = "--apply" in sys.argv
    workbook_paths = [arg for arg in sys.argv[1:] if not arg.startswith("--")]

    if not workbook_paths:
        print("Uso: python scripts/apply_gem_status_from_workbooks.py <arquivo1.xlsx> [arquivo2.xlsx ...] [--apply]")
        sys.exit(1)

    workbook_rows = load_workbook_rows(workbook_paths)
    db_candidates = fetch_all_candidates()
    updates, unmatched, match_rules = build_updates(workbook_rows, db_candidates)

    status_counts = Counter(item["status"] for item in updates)
    summary = {
        "linhas_planilha_unicas": len(workbook_rows),
        "candidatos_banco": len(db_candidates),
        "casamentos_seguros": len(updates),
        "nao_casados": len(unmatched),
        "regras_de_casamento": match_rules,
        "status_previstos": status_counts,
        "amostra_nao_casados": unmatched[:20],
        "modo": "apply" if apply_mode else "dry-run",
    }
    summary["relatorios"] = write_reports(summary, unmatched)
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if apply_mode and updates:
        apply_updates(updates)
        print(f"Atualizacao concluida. Registros atualizados: {len(updates)}")


if __name__ == "__main__":
    main()
