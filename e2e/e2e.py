"""End-to-end check of the deployed backend (cabinet desktop <-> client mobile)."""
import io, os, secrets, sys, time, uuid
import requests

BASE = os.environ.get("API", "https://test.allinone.ovh").rstrip("/")
results = []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("OK   " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))
    return cond

def j(r):
    try: return r.json()
    except Exception: return r.text[:300]

s = requests.Session(); s.headers["Accept"] = "application/json"
tag = uuid.uuid4().hex[:6]

# 0. basics
r = s.get(f"{BASE}/api/v1/client-portal/me/", timeout=20)
check("portal requires auth (401)", r.status_code == 401, f"{r.status_code} {j(r)}")
r = s.get(f"{BASE}/api/v1/clients/", timeout=20)
check("cabinet API requires auth (401)", r.status_code == 401, f"{r.status_code}")
r = s.get(f"{BASE}/admin/login/", timeout=20)
check("django admin reachable over https", r.status_code == 200, f"{r.status_code}")

# 1. cabinet account (open registration) + tenant
staff_email = f"e2e-staff-{tag}@example.com"; staff_pw = "E2e-" + secrets.token_urlsafe(12)
r = s.post(f"{BASE}/api/v1/auth/register/", json={"email": staff_email, "password": staff_pw, "password_confirm": staff_pw, "first_name": "E2E", "last_name": "Staff"}, timeout=20)
if not check("register cabinet user", r.status_code == 201, f"{r.status_code} {j(r)}"): sys.exit(1)
tok = r.json()["tokens"]["access"]
H = {"Authorization": f"Bearer {tok}"}
r = s.post(f"{BASE}/api/v1/entrepreneurs/", headers=H, json={"company_name": f"E2E Cabinet {tag}", "siren": str(900000000 + int(tag, 16) % 99999999)[:9], "address_line1": "1 rue test", "postal_code": "75001", "city": "Paris"}, timeout=20)
if not check("create entrepreneur without tenant header", r.status_code == 201, f"{r.status_code} {j(r)}"): sys.exit(1)
ent = r.json().get("id")
if not ent:  # older backend: find it in the list
    lst = s.get(f"{BASE}/api/v1/entrepreneurs/", headers=H, timeout=20).json()
    lst = lst["results"] if isinstance(lst, dict) else lst
    ent = next(e["id"] for e in lst if e["company_name"] == f"E2E Cabinet {tag}")
    check("entrepreneur create returns id (fixed in next deploy)", False, "id missing in create response")
HT = {**H, "X-Entrepreneur-Id": ent}

r = s.post(f"{BASE}/api/v1/clients/", headers=HT, json={"company_name": f"E2E Client {tag}", "first_name": "Jean", "last_name": "Test", "email": f"e2e-client-{tag}@example.com", "address_line1": "2 rue", "postal_code": "75002", "city": "Paris"}, timeout=20)
if not check("create client", r.status_code == 201, f"{r.status_code} {j(r)}"): sys.exit(1)
client = r.json().get("id")
if not ent:  # older backend: find it in the list
    lst = s.get(f"{BASE}/api/v1/entrepreneurs/", headers=H, timeout=20).json()
    lst = lst["results"] if isinstance(lst, dict) else lst
    ent = next(e["id"] for e in lst if e["company_name"] == f"E2E Cabinet {tag}")
    check("entrepreneur create returns id (fixed in next deploy)", False, "id missing in create response")

try:
    # 2. mobile access
    r = s.post(f"{BASE}/api/v1/clients/{client}/access/", headers=HT, json={}, timeout=20)
    check("create client access", r.status_code == 201, f"{r.status_code} {j(r)}")
    cpw = r.json().get("password"); cemail = r.json().get("email")
    r = s.post(f"{BASE}/api/v1/auth/login/", json={"email": cemail.upper(), "password": cpw}, timeout=20)
    check("client login (mobile)", r.status_code == 200, f"{r.status_code} {j(r)}")
    CH = {"Authorization": f"Bearer {r.json()['access']}"}
    crefresh = r.json()["refresh"]
    r = s.get(f"{BASE}/api/v1/client-portal/me/", headers=CH, timeout=20)
    check("portal /me", r.status_code == 200 and r.json()["client"]["id"] == client, f"{r.status_code} {j(r)}")

    # 3. request -> seen -> upload -> partial
    r = s.post(f"{BASE}/api/v1/document-requests/", headers=HT, json={"client": client, "title": "Relevé E2E", "priority": "high"}, timeout=20)
    check("cabinet creates request", r.status_code == 201, f"{r.status_code} {j(r)}"); req = r.json().get("id")
    r = s.get(f"{BASE}/api/v1/client-portal/summary/", headers=CH, timeout=20)
    check("summary counts request + notification", r.ok and r.json()["open_requests"] == 1 and r.json()["unread_notifications"] >= 1, f"{j(r)}")
    r = s.get(f"{BASE}/api/v1/client-portal/requests/{req}/", headers=CH, timeout=20)
    check("opening request marks it seen", r.ok and r.json()["status"] == "seen", f"{j(r)}")
    pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
    r = s.post(f"{BASE}/api/v1/client-portal/documents/upload/", headers=CH, files={"file": ("scan.pdf", io.BytesIO(pdf), "application/pdf")}, data={"title": "Releve mars", "category": "bank_statement", "document_request": req}, timeout=60)
    check("client uploads document", r.status_code == 201, f"{r.status_code} {j(r)}")
    doc = r.json().get("id"); dl = r.json().get("download_url")
    r = s.get(f"{BASE}/api/v1/document-requests/{req}/", headers=HT, timeout=20)
    check("request becomes partially_completed", r.ok and r.json()["status"] == "partially_completed", f"{j(r)}")
    r = s.get(f"{BASE}/api/v1/documents/{doc}/download/", headers=HT, timeout=30)
    check("cabinet downloads the file", r.status_code == 200 and r.content == pdf, f"{r.status_code} len={len(r.content)}")
    r = s.get(f"{BASE}{dl}", headers=CH, timeout=30)
    check("client downloads its file", r.status_code == 200 and r.content == pdf, f"{r.status_code}")
    r = s.get(f"{BASE}/api/v1/notifications/", headers=HT, timeout=20)
    items = r.json()["results"] if isinstance(r.json(), dict) else r.json()
    check("cabinet notified of upload", r.ok and any("document" in n["title"].lower() for n in items), f"{j(r)}")
    r = s.post(f"{BASE}/api/v1/documents/{doc}/review/", headers=HT, json={"decision": "reject", "internal_comment": "interne", "reason": "Page manquante"}, timeout=20)
    check("cabinet rejects with reason", r.ok, f"{r.status_code} {j(r)}")
    r = s.get(f"{BASE}/api/v1/client-portal/notifications/", headers=CH, timeout=20)
    msgs = [n["message"] for n in r.json()["results"]]
    check("client gets reason, never internal comment", any("Page manquante" in m for m in msgs) and not any("interne" in m for m in msgs), f"{msgs}")

    # 4. messages both ways
    r = s.post(f"{BASE}/api/v1/messages/", headers=HT, json={"client": client, "body": "Bonjour"}, timeout=20)
    check("cabinet sends message", r.status_code == 201, f"{r.status_code} {j(r)}")
    s.post(f"{BASE}/api/v1/messages/", headers=HT, json={"client": client, "body": "note interne", "is_internal": True}, timeout=20)
    r = s.get(f"{BASE}/api/v1/client-portal/messages/", headers=CH, timeout=20)
    bodies = [m["body"] for m in r.json()["results"]]
    check("client sees message, not internal note", "Bonjour" in bodies and "note interne" not in bodies, f"{bodies}")
    r = s.post(f"{BASE}/api/v1/client-portal/messages/", headers=CH, json={"body": "Merci"}, timeout=20)
    check("client replies", r.status_code == 201 and r.json()["is_mine"], f"{j(r)}")

    # 5. isolation
    r = s.get(f"{BASE}/api/v1/clients/", headers={**CH, "X-Entrepreneur-Id": ent}, timeout=20)
    check("client token has no cabinet access", r.status_code == 403, f"{r.status_code}")
    r = s.get(f"{BASE}/api/v1/clients/", headers={**H, "X-Entrepreneur-Id": str(uuid.uuid4())}, timeout=20)
    check("foreign tenant header refused", r.status_code == 403, f"{r.status_code}")

    # 6. suspend cuts access
    r = s.post(f"{BASE}/api/v1/clients/{client}/access/suspend/", headers=HT, timeout=20)
    check("suspend access", r.ok, f"{r.status_code}")
    r = s.get(f"{BASE}/api/v1/client-portal/me/", headers=CH, timeout=20)
    check("suspended client is cut off", r.status_code == 401, f"{r.status_code}")
    r = s.post(f"{BASE}/api/v1/auth/token/refresh/", json={"refresh": crefresh}, timeout=20)
    check("suspended client cannot refresh", r.status_code == 401, f"{r.status_code}")
finally:
    r = s.delete(f"{BASE}/api/v1/clients/{client}/", headers=HT, timeout=20)
    check("cleanup: test client deleted", r.status_code == 204, f"{r.status_code}")

failed = [n for n, ok, _ in results if not ok]
summary = f"{len(results)-len(failed)}/{len(results)} checks passed" + (f"; FAILED: {failed}" if failed else "")
print(summary)
with open("summary.txt", "w") as f:
    f.write("\n".join(("OK   " if ok else "FAIL ") + n + ("" if ok else f" — {d}") for n, ok, d in results) + "\n" + summary)
sys.exit(1 if failed else 0)
