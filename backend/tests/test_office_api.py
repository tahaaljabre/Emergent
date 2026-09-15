"""Backend API tests for Office Services (clients, employees, transactions, dashboard, settings, backup)."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env value used by tests when env var not exported
    BASE_URL = "https://mobile-app-builder-3509.preview.emergentagent.com"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Health ----------
def test_health_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---------- Dashboard ----------
def test_dashboard_shape(s):
    r = s.get(f"{API}/dashboard")
    assert r.status_code == 200
    d = r.json()
    for k in [
        "total_contracts",
        "total_subscriptions",
        "cleaning",
        "security",
        "expiring",
        "monthly_revenue",
        "yearly_revenue",
    ]:
        assert k in d, f"missing key {k}"
    assert "count" in d["cleaning"] and "revenue" in d["cleaning"]
    assert "count" in d["security"] and "revenue" in d["security"]
    assert isinstance(d["expiring"], list)


# ---------- Clients ----------
def test_seed_clients_exist(s):
    r = s.get(f"{API}/clients")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 6, f"seed should have >=6 clients, got {len(items)}"
    for c in items:
        assert "_id" not in c, "MongoDB _id should not be exposed"


def test_seed_employees_exist(s):
    r = s.get(f"{API}/employees")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 5, f"seed should have >=5 employees, got {len(items)}"
    for e in items:
        assert "_id" not in e


def test_clients_filter_service(s):
    for svc in ["cleaning", "security"]:
        r = s.get(f"{API}/clients", params={"service": svc, "archived": "false"})
        assert r.status_code == 200
        for c in r.json():
            assert c["service_type"] == svc
            assert c["archived"] is False


def test_clients_search_query(s):
    r = s.get(f"{API}/clients", params={"q": "الرياض"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_client_crud_and_persistence(s):
    payload = {
        "name": "TEST_عميل تجريبي",
        "address": "TEST address",
        "phone": "0500000000",
        "service_type": "cleaning",
        "contract_amount": 1234,
        "contract_start": datetime.now(timezone.utc).isoformat(),
        "contract_end": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
    }
    c = s.post(f"{API}/clients", json=payload)
    assert c.status_code == 200, c.text
    created = c.json()
    cid = created["id"]
    assert created["name"] == payload["name"]
    assert "_id" not in created

    # GET verify
    g = s.get(f"{API}/clients/{cid}")
    assert g.status_code == 200
    assert g.json()["contract_amount"] == 1234

    # Update
    u = s.put(f"{API}/clients/{cid}", json={"name": "TEST_عميل معدل", "service_type": "cleaning", "contract_amount": 9999})
    assert u.status_code == 200
    assert u.json()["name"] == "TEST_عميل معدل"
    g2 = s.get(f"{API}/clients/{cid}")
    assert g2.json()["contract_amount"] == 9999

    # Archive
    a = s.post(f"{API}/clients/{cid}/archive", json={"archived": True})
    assert a.status_code == 200
    assert a.json()["archived"] is True
    # confirm listed under archived=true
    la = s.get(f"{API}/clients", params={"archived": "true"})
    assert any(x["id"] == cid for x in la.json())

    # Restore
    ar = s.post(f"{API}/clients/{cid}/archive", json={"archived": False})
    assert ar.status_code == 200 and ar.json()["archived"] is False

    # Add a transaction to test cascade
    tx = s.post(f"{API}/transactions", json={
        "entity_type": "client",
        "entity_id": cid,
        "kind": "charge",
        "description": "TEST_charge",
        "amount": 500,
    })
    assert tx.status_code == 200
    tid = tx.json()["id"]

    # Delete client -> should cascade transactions
    d = s.delete(f"{API}/clients/{cid}")
    assert d.status_code == 200
    g3 = s.get(f"{API}/clients/{cid}")
    assert g3.status_code == 404
    txlist = s.get(f"{API}/transactions/client/{cid}")
    assert txlist.status_code == 200
    assert txlist.json()["items"] == []
    # tid variable is intentionally unused after cascade
    _ = tid


# ---------- Employees ----------
def test_employee_crud_and_persistence(s):
    payload = {"name": "TEST_موظف", "role": "security", "assignment": "TEST_site", "phone": "0500000001", "salary": 3000}
    r = s.post(f"{API}/employees", json=payload)
    assert r.status_code == 200
    eid = r.json()["id"]
    assert r.json()["role"] == "security"

    g = s.get(f"{API}/employees/{eid}")
    assert g.status_code == 200 and g.json()["salary"] == 3000

    u = s.put(f"{API}/employees/{eid}", json={"name": "TEST_موظف2", "role": "security", "salary": 4500})
    assert u.status_code == 200
    assert s.get(f"{API}/employees/{eid}").json()["salary"] == 4500

    a = s.post(f"{API}/employees/{eid}/archive", json={"archived": True})
    assert a.status_code == 200 and a.json()["archived"] is True

    d = s.delete(f"{API}/employees/{eid}")
    assert d.status_code == 200
    assert s.get(f"{API}/employees/{eid}").status_code == 404


# ---------- Transactions balance ----------
def test_transactions_balance_math(s):
    # create a client and add txns
    c = s.post(f"{API}/clients", json={"name": "TEST_txn_client", "service_type": "cleaning"}).json()
    cid = c["id"]
    s.post(f"{API}/transactions", json={"entity_type": "client", "entity_id": cid, "kind": "charge", "description": "c1", "amount": 1000})
    s.post(f"{API}/transactions", json={"entity_type": "client", "entity_id": cid, "kind": "receipt", "description": "p1", "amount": 300})
    r = s.get(f"{API}/transactions/client/{cid}")
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) == 2
    assert data["balance"] == pytest.approx(700.0)

    # delete one txn
    tid = data["items"][0]["id"]
    d = s.delete(f"{API}/transactions/{tid}")
    assert d.status_code == 200
    r2 = s.get(f"{API}/transactions/client/{cid}")
    assert len(r2.json()["items"]) == 1

    # cleanup
    s.delete(f"{API}/clients/{cid}")


# ---------- Settings ----------
def test_settings_get_and_update(s):
    r = s.get(f"{API}/settings")
    assert r.status_code == 200
    data = r.json()
    for k in ["office_name", "address", "phone", "currency"]:
        assert k in data

    original = data.copy()
    upd = s.put(f"{API}/settings", json={**data, "phone": "0119999999"})
    assert upd.status_code == 200
    assert upd.json()["phone"] == "0119999999"
    # restore
    s.put(f"{API}/settings", json=original)


# ---------- Backup ----------
def test_backup_dump(s):
    r = s.get(f"{API}/backup")
    assert r.status_code == 200
    d = r.json()
    for k in ["generated_at", "clients", "employees", "transactions", "settings"]:
        assert k in d
    # ensure no _id leak
    for c in d["clients"]:
        assert "_id" not in c
