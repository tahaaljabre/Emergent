"""Iteration 3 backend tests: transaction kinds (charge/receipt/disbursement),
transaction edit + archive/restore, seeded 6-month demo history, and dashboard revenue.
"""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://mobile-app-builder-3509.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture()
def client_id(s):
    c = s.post(f"{API}/clients", json={"name": "TEST_iter3_client", "service_type": "cleaning", "contract_amount": 1000}).json()
    cid = c["id"]
    yield cid
    s.delete(f"{API}/clients/{cid}")


@pytest.fixture()
def employee_id(s):
    e = s.post(f"{API}/employees", json={"name": "TEST_iter3_emp", "role": "cleaning", "salary": 500}).json()
    eid = e["id"]
    yield eid
    s.delete(f"{API}/employees/{eid}")


# ---------- Kinds and validation ----------

def test_receipt_disbursement_charge_allowed(s, client_id):
    for kind in ["charge", "receipt", "disbursement"]:
        r = s.post(f"{API}/transactions", json={
            "entity_type": "client", "entity_id": client_id, "kind": kind,
            "description": f"TEST_{kind}", "amount": 100,
        })
        assert r.status_code == 200, f"{kind} failed: {r.text}"
        assert r.json()["kind"] == kind


def test_kind_payment_rejected_422(s, client_id):
    r = s.post(f"{API}/transactions", json={
        "entity_type": "client", "entity_id": client_id, "kind": "payment",
        "description": "TEST_bad", "amount": 100,
    })
    assert r.status_code == 422


# ---------- Balance math ----------

def test_client_balance_signs(s, client_id):
    # charge +1, receipt -1, disbursement +1 on client
    s.post(f"{API}/transactions", json={"entity_type": "client", "entity_id": client_id, "kind": "charge", "description": "c", "amount": 1000})
    s.post(f"{API}/transactions", json={"entity_type": "client", "entity_id": client_id, "kind": "receipt", "description": "r", "amount": 300})
    s.post(f"{API}/transactions", json={"entity_type": "client", "entity_id": client_id, "kind": "disbursement", "description": "d", "amount": 50})
    r = s.get(f"{API}/transactions/client/{client_id}")
    assert r.status_code == 200
    body = r.json()
    kinds = {i["kind"] for i in body["items"]}
    assert "payment" not in kinds
    assert kinds == {"charge", "receipt", "disbursement"}
    # 1000 - 300 + 50 = 750
    assert body["balance"] == pytest.approx(750.0)


def test_employee_balance_signs(s, employee_id):
    # employee: charge +1, disbursement -1, receipt +1
    s.post(f"{API}/transactions", json={"entity_type": "employee", "entity_id": employee_id, "kind": "charge", "description": "c", "amount": 500})
    s.post(f"{API}/transactions", json={"entity_type": "employee", "entity_id": employee_id, "kind": "disbursement", "description": "d", "amount": 200})
    s.post(f"{API}/transactions", json={"entity_type": "employee", "entity_id": employee_id, "kind": "receipt", "description": "r", "amount": 30})
    r = s.get(f"{API}/transactions/employee/{employee_id}")
    assert r.status_code == 200
    body = r.json()
    # 500 - 200 + 30 = 330
    assert body["balance"] == pytest.approx(330.0)


# ---------- Update transaction ----------

def test_update_transaction_fields(s, client_id):
    t = s.post(f"{API}/transactions", json={
        "entity_type": "client", "entity_id": client_id, "kind": "charge",
        "description": "orig", "amount": 100,
    }).json()
    tid = t["id"]
    new_date = "2024-05-15T10:00:00+00:00"
    u = s.put(f"{API}/transactions/{tid}", json={
        "description": "updated", "amount": 250, "kind": "receipt", "date": new_date,
    })
    assert u.status_code == 200
    body = u.json()
    assert body["description"] == "updated"
    assert body["amount"] == 250
    assert body["kind"] == "receipt"
    assert body["date"] == new_date


def test_update_transaction_404(s):
    r = s.put(f"{API}/transactions/nonexistent-id-xyz", json={"description": "x"})
    assert r.status_code == 404


# ---------- Archive/restore/delete transactions ----------

def test_archive_hides_and_appears_in_archived(s, client_id):
    t = s.post(f"{API}/transactions", json={
        "entity_type": "client", "entity_id": client_id, "kind": "charge",
        "description": "TEST_to_archive", "amount": 42,
    }).json()
    tid = t["id"]

    # Archive
    a = s.post(f"{API}/transactions/{tid}/archive", json={"archived": True})
    assert a.status_code == 200
    assert a.json()["archived"] is True

    # Should NOT appear in the regular list
    lst = s.get(f"{API}/transactions/client/{client_id}").json()
    assert not any(i["id"] == tid for i in lst["items"])

    # Should appear in archived list with entity_name
    arch = s.get(f"{API}/transactions/archived")
    assert arch.status_code == 200
    found = [x for x in arch.json() if x["id"] == tid]
    assert len(found) == 1
    assert found[0].get("entity_name")  # non-empty entity_name resolved

    # Restore
    r = s.post(f"{API}/transactions/{tid}/archive", json={"archived": False})
    assert r.status_code == 200
    assert r.json()["archived"] is False
    lst2 = s.get(f"{API}/transactions/client/{client_id}").json()
    assert any(i["id"] == tid for i in lst2["items"])


def test_delete_transaction_hard_delete(s, client_id):
    t = s.post(f"{API}/transactions", json={
        "entity_type": "client", "entity_id": client_id, "kind": "charge",
        "description": "TEST_to_delete", "amount": 1,
    }).json()
    tid = t["id"]
    d = s.delete(f"{API}/transactions/{tid}")
    assert d.status_code == 200
    # Now it should be gone from both lists
    lst = s.get(f"{API}/transactions/client/{client_id}").json()
    assert not any(i["id"] == tid for i in lst["items"])
    arch = s.get(f"{API}/transactions/archived").json()
    assert not any(i["id"] == tid for i in arch)


# ---------- Seeded 6-month history ----------

def test_seed_history_covers_6_distinct_months(s):
    """Every non-archived client and employee should have transactions in at least 6 distinct months."""
    clients = [c for c in s.get(f"{API}/clients").json() if not c.get("archived")]
    employees = [e for e in s.get(f"{API}/employees").json() if not e.get("archived")]
    assert clients and employees

    def months_of(entity_type, eid):
        items = s.get(f"{API}/transactions/{entity_type}/{eid}").json()["items"]
        months = set()
        for i in items:
            try:
                d = datetime.fromisoformat(i["date"].replace("Z", "+00:00"))
                months.add((d.year, d.month))
            except Exception:
                pass
        return months

    # Filter down to seeded (non-TEST_) entities to avoid our own ephemeral ones
    seeded_clients = [c for c in clients if not c["name"].startswith("TEST_")]
    seeded_employees = [e for e in employees if not e["name"].startswith("TEST_")]
    assert seeded_clients, "expected seeded clients"
    assert seeded_employees, "expected seeded employees"

    for c in seeded_clients:
        m = months_of("client", c["id"])
        assert len(m) >= 6, f"client {c['name']} has only {len(m)} months"
    for e in seeded_employees:
        m = months_of("employee", e["id"])
        assert len(m) >= 6, f"employee {e['name']} has only {len(m)} months"


def test_seed_history_no_payment_kind(s):
    """The seeded data must not use the legacy 'payment' kind."""
    clients = [c for c in s.get(f"{API}/clients").json() if not c.get("archived")]
    for c in clients[:3]:
        items = s.get(f"{API}/transactions/client/{c['id']}").json()["items"]
        for i in items:
            assert i["kind"] in {"charge", "receipt", "disbursement"}, f"bad kind {i['kind']}"


# ---------- Dashboard ----------

def test_dashboard_revenue_from_client_receipts(s):
    d = s.get(f"{API}/dashboard").json()
    assert "monthly_revenue" in d and "yearly_revenue" in d
    assert isinstance(d["monthly_revenue"], (int, float))
    assert isinstance(d["yearly_revenue"], (int, float))
    # yearly must be >= monthly
    assert d["yearly_revenue"] >= d["monthly_revenue"]
    # After the seeded history there should be some revenue
    assert d["yearly_revenue"] > 0
