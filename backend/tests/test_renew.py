"""Tests for the new /api/clients/{id}/renew endpoint and dashboard expiring behavior."""
import os
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or "https://mobile-app-builder-3509.preview.emergentagent.com"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture()
def expiring_client(api_client):
    """Create a client whose contract ends in ~10 days."""
    now = datetime.now(timezone.utc)
    payload = {
        "name": "TEST_expiring_soon",
        "address": "TEST-address",
        "phone": "0500000000",
        "service_type": "cleaning",
        "contract_amount": 1000,
        "contract_start": (now - timedelta(days=350)).isoformat(),
        "contract_end": (now + timedelta(days=10)).isoformat(),
    }
    r = api_client.post(f"{API}/clients", json=payload)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield r.json()
    api_client.delete(f"{API}/clients/{cid}")


@pytest.fixture()
def expired_client(api_client):
    """Create a client whose contract already expired."""
    now = datetime.now(timezone.utc)
    payload = {
        "name": "TEST_already_expired",
        "service_type": "security",
        "contract_amount": 500,
        "contract_start": (now - timedelta(days=400)).isoformat(),
        "contract_end": (now - timedelta(days=30)).isoformat(),
    }
    r = api_client.post(f"{API}/clients", json=payload)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield r.json()
    api_client.delete(f"{API}/clients/{cid}")


class TestRenew:
    def test_renew_12_months_from_current_end(self, api_client, expiring_client):
        prev_end = datetime.fromisoformat(expiring_client["contract_end"].replace("Z", "+00:00"))
        r = api_client.post(f"{API}/clients/{expiring_client['id']}/renew", json={"months": 12})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == expiring_client["id"]
        new_start = datetime.fromisoformat(data["contract_start"].replace("Z", "+00:00"))
        new_end = datetime.fromisoformat(data["contract_end"].replace("Z", "+00:00"))
        # start should equal previous end (since it's future)
        assert abs((new_start - prev_end).total_seconds()) < 5
        # end should be start + 30*12 days
        expected_end = new_start + timedelta(days=30 * 12)
        assert abs((new_end - expected_end).total_seconds()) < 5

    def test_renew_6_months_when_expired_starts_today(self, api_client, expired_client):
        before = datetime.now(timezone.utc)
        r = api_client.post(f"{API}/clients/{expired_client['id']}/renew", json={"months": 6})
        assert r.status_code == 200, r.text
        data = r.json()
        new_start = datetime.fromisoformat(data["contract_start"].replace("Z", "+00:00"))
        new_end = datetime.fromisoformat(data["contract_end"].replace("Z", "+00:00"))
        # start should be ~now (not old contract_end which is in the past)
        assert new_start >= before - timedelta(seconds=2)
        assert new_start <= datetime.now(timezone.utc) + timedelta(seconds=5)
        # end = start + 30*6 days
        expected_end = new_start + timedelta(days=30 * 6)
        assert abs((new_end - expected_end).total_seconds()) < 5

    def test_renew_persists_via_get(self, api_client, expiring_client):
        r = api_client.post(f"{API}/clients/{expiring_client['id']}/renew", json={"months": 6})
        assert r.status_code == 200
        new_end = r.json()["contract_end"]
        # Verify via GET
        g = api_client.get(f"{API}/clients/{expiring_client['id']}")
        assert g.status_code == 200
        assert g.json()["contract_end"] == new_end

    def test_renew_404_for_unknown_id(self, api_client):
        r = api_client.post(f"{API}/clients/nonexistent-id-xyz/renew", json={"months": 12})
        assert r.status_code == 404

    def test_renew_422_for_zero_months(self, api_client, expiring_client):
        r = api_client.post(f"{API}/clients/{expiring_client['id']}/renew", json={"months": 0})
        assert r.status_code == 422

    def test_renew_422_for_over_60_months(self, api_client, expiring_client):
        r = api_client.post(f"{API}/clients/{expiring_client['id']}/renew", json={"months": 61})
        assert r.status_code == 422


class TestDashboardExpiring:
    def test_expiring_contains_new_client_and_removed_after_renew(self, api_client, expiring_client):
        # Should appear in expiring list
        r = api_client.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("expiring"), list)
        ids = [c["id"] for c in d["expiring"]]
        assert expiring_client["id"] in ids, f"Newly-created expiring client not in dashboard.expiring: {ids}"

        # Renew for 12 months -> should be removed from expiring
        rr = api_client.post(f"{API}/clients/{expiring_client['id']}/renew", json={"months": 12})
        assert rr.status_code == 200

        r2 = api_client.get(f"{API}/dashboard")
        assert r2.status_code == 200
        ids2 = [c["id"] for c in r2.json()["expiring"]]
        assert expiring_client["id"] not in ids2

    def test_response_shape(self, api_client):
        r = api_client.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_contracts", "total_subscriptions", "cleaning", "security", "expiring", "monthly_revenue", "yearly_revenue"]:
            assert k in d
