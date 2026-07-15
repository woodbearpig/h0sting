"""Backend API tests for Contractor Check-In app."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://contractor-checkin.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@techspider.site"
ADMIN_PASSWORD = "Admin@12345"


# ------------- fixtures -------------
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api_client):
    r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ------------- Health & root -------------
class TestHealth:
    def test_root_api(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ------------- Auth -------------
class TestAuth:
    def test_login_success(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str)
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"

    def test_login_invalid_password(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_login_invalid_email(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": "nope@x.com", "password": "x"})
        assert r.status_code == 401

    def test_me_without_token(self, api_client):
        r = api_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, api_client, auth_headers):
        r = api_client.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ------------- Settings -------------
class TestSettings:
    def test_get_settings_public(self, api_client):
        r = api_client.get(f"{API}/settings")
        assert r.status_code == 200
        data = r.json()
        assert "site_title" in data and "tagline" in data and "logo_url" in data

    def test_put_settings_requires_auth(self, api_client):
        r = api_client.put(f"{API}/settings", json={"site_title": "X", "tagline": "Y", "logo_url": ""})
        assert r.status_code == 401

    def test_put_settings_success_and_persist(self, api_client, auth_headers):
        payload = {"site_title": "TEST_Site Title", "tagline": "TEST_Tagline", "logo_url": "https://example.com/l.png"}
        r = api_client.put(f"{API}/settings", json=payload, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["site_title"] == payload["site_title"]

        r2 = api_client.get(f"{API}/settings")
        assert r2.status_code == 200
        assert r2.json()["site_title"] == payload["site_title"]
        assert r2.json()["tagline"] == payload["tagline"]

        # restore
        restore = {"site_title": "TechSpider Site", "tagline": "Contractor Check-In Portal", "logo_url": ""}
        api_client.put(f"{API}/settings", json=restore, headers=auth_headers)


# ------------- Jobs -------------
class TestJobs:
    def test_list_jobs_public(self, api_client):
        r = api_client.get(f"{API}/jobs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        # No _id leak
        for j in r.json():
            assert "_id" not in j
            assert "id" in j

    def test_list_jobs_active_only(self, api_client):
        r = api_client.get(f"{API}/jobs", params={"active_only": True})
        assert r.status_code == 200
        for j in r.json():
            assert j.get("active") is True

    def test_create_job_requires_auth(self, api_client):
        r = api_client.post(f"{API}/jobs", json={"title": "TEST_x"})
        assert r.status_code == 401

    def test_job_crud_flow(self, api_client, auth_headers):
        # Create
        payload = {
            "title": "TEST_Job A",
            "description": "desc",
            "hero_image_url": "",
            "button_label": "Share Now",
            "custom_fields": [{"key": "site_number", "label": "Site Number", "required": True}],
            "default_map_area": {"lat": 40.7128, "lng": -74.006, "zoom": 12},
            "active": True,
        }
        cr = api_client.post(f"{API}/jobs", json=payload, headers=auth_headers)
        assert cr.status_code == 200, cr.text
        job = cr.json()
        assert job["title"] == "TEST_Job A"
        assert job["custom_fields"][0]["key"] == "site_number"
        job_id = job["id"]
        assert job_id

        # GET single
        gr = api_client.get(f"{API}/jobs/{job_id}")
        assert gr.status_code == 200
        assert gr.json()["title"] == "TEST_Job A"

        # Update
        payload["title"] = "TEST_Job A Updated"
        ur = api_client.put(f"{API}/jobs/{job_id}", json=payload, headers=auth_headers)
        assert ur.status_code == 200
        assert ur.json()["title"] == "TEST_Job A Updated"

        gr2 = api_client.get(f"{API}/jobs/{job_id}")
        assert gr2.json()["title"] == "TEST_Job A Updated"

        # Delete requires auth
        du = api_client.delete(f"{API}/jobs/{job_id}")
        assert du.status_code == 401

        dr = api_client.delete(f"{API}/jobs/{job_id}", headers=auth_headers)
        assert dr.status_code == 200

        gr3 = api_client.get(f"{API}/jobs/{job_id}")
        assert gr3.status_code == 404

    def test_get_job_invalid_id(self, api_client):
        r = api_client.get(f"{API}/jobs/not-an-object-id")
        assert r.status_code == 404


# ------------- Check-ins -------------
class TestCheckIns:
    @pytest.fixture(scope="class")
    def created_job(self, api_client, auth_headers):
        payload = {
            "title": "TEST_Checkin Job",
            "description": "desc",
            "hero_image_url": "",
            "button_label": "Share",
            "custom_fields": [{"key": "site_number", "label": "Site Number", "required": True}],
            "default_map_area": {"lat": 40.7128, "lng": -74.006, "zoom": 12},
            "active": True,
        }
        r = api_client.post(f"{API}/jobs", json=payload, headers=auth_headers)
        assert r.status_code == 200
        job = r.json()
        yield job
        # cleanup
        api_client.delete(f"{API}/jobs/{job['id']}", headers=auth_headers)

    def test_admin_checkins_requires_auth(self, api_client):
        r = api_client.get(f"{API}/checkins")
        assert r.status_code == 401

    def test_create_checkin_public(self, api_client, created_job):
        payload = {
            "job_id": created_job["id"],
            "contractor_name": "TEST_John",
            "email": "test_john@example.com",
            "phone": "+15550001111",
            "custom_data": {"site_number": "A-1"},
            "latitude": 40.7128,
            "longitude": -74.006,
        }
        r = api_client.post(f"{API}/checkins", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["contractor_name"] == "TEST_John"
        assert data["latitude"] == 40.7128
        assert "_id" not in data
        assert "id" in data

    def test_public_job_checkins(self, api_client, created_job):
        r = api_client.get(f"{API}/jobs/{created_job['id']}/checkins")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert any(x["contractor_name"] == "TEST_John" for x in rows)

    def test_admin_list_checkins(self, api_client, auth_headers, created_job):
        r = api_client.get(f"{API}/checkins", headers=auth_headers, params={"job_id": created_job["id"]})
        assert r.status_code == 200
        rows = r.json()
        assert any(x["contractor_name"] == "TEST_John" for x in rows)

    def test_create_checkin_invalid_job(self, api_client):
        payload = {
            "job_id": "invalid",
            "contractor_name": "X",
            "email": "x@x.com",
            "phone": "1",
            "custom_data": {},
            "latitude": 0.0,
            "longitude": 0.0,
        }
        r = api_client.post(f"{API}/checkins", json=payload)
        assert r.status_code == 400

    def test_create_checkin_nonexistent_job(self, api_client):
        payload = {
            "job_id": "507f1f77bcf86cd799439011",  # valid ObjectId not present
            "contractor_name": "X",
            "email": "x@x.com",
            "phone": "1",
            "custom_data": {},
            "latitude": 0.0,
            "longitude": 0.0,
        }
        r = api_client.post(f"{API}/checkins", json=payload)
        assert r.status_code == 404

    def test_delete_job_cascades_checkins(self, api_client, auth_headers):
        # Create job
        j = api_client.post(f"{API}/jobs", json={"title": "TEST_Cascade", "active": True}, headers=auth_headers).json()
        # Create checkin
        api_client.post(f"{API}/checkins", json={
            "job_id": j["id"], "contractor_name": "TEST_C", "email": "c@x.com", "phone": "1",
            "custom_data": {}, "latitude": 1.0, "longitude": 2.0,
        })
        # Delete job
        api_client.delete(f"{API}/jobs/{j['id']}", headers=auth_headers)
        # Check-ins should also be gone
        r = api_client.get(f"{API}/jobs/{j['id']}/checkins")
        assert r.status_code == 200
        assert r.json() == []
