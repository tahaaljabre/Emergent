from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Response
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid as uuidlib
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- Emergent Object Storage ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "office-services-manager"
_storage_key: Optional[str] = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    r.raise_for_status()
    _storage_key = r.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if r.status_code == 503:
        _storage_key = None
        key = init_storage()
        r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    global _storage_key
    key = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 503:
        _storage_key = None
        key = init_storage()
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

app = FastAPI()
api_router = APIRouter(prefix="/api")

ServiceType = Literal["cleaning", "security"]
TxnKind = Literal["charge", "receipt", "disbursement"]
# charge = استحقاق, receipt = سند قبض (money received by the office), disbursement = سند صرف (money paid out)


def txn_sign(entity_type: str, kind: str) -> float:
    """Balance effect. Client balance = owed to us; employee balance = owed by us."""
    if kind == "charge":
        return 1.0
    if entity_type == "client":
        return -1.0 if kind == "receipt" else 1.0
    return -1.0 if kind == "disbursement" else 1.0


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class ClientModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str = ""
    phone: str = ""
    service_type: ServiceType = "cleaning"
    contract_amount: float = 0
    contract_start: str = Field(default_factory=now_iso)
    contract_end: str = Field(default_factory=now_iso)
    archived: bool = False
    created_at: str = Field(default_factory=now_iso)


class ClientIn(BaseModel):
    name: str
    address: str = ""
    phone: str = ""
    service_type: ServiceType = "cleaning"
    contract_amount: float = 0
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None


class EmployeeModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: ServiceType = "cleaning"
    assignment: str = ""
    phone: str = ""
    salary: float = 0
    archived: bool = False
    created_at: str = Field(default_factory=now_iso)


class EmployeeIn(BaseModel):
    name: str
    role: ServiceType = "cleaning"
    assignment: str = ""
    phone: str = ""
    salary: float = 0


class TransactionModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: Literal["client", "employee"]
    entity_id: str
    kind: TxnKind
    description: str
    amount: float
    date: str = Field(default_factory=now_iso)
    archived: bool = False
    created_at: str = Field(default_factory=now_iso)


class TransactionIn(BaseModel):
    entity_type: Literal["client", "employee"]
    entity_id: str
    kind: TxnKind
    description: str
    amount: float
    date: Optional[str] = None


class TransactionUpdate(BaseModel):
    kind: Optional[TxnKind] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None


class ArchiveIn(BaseModel):
    archived: bool


class OfficeSettingsModel(BaseModel):
    office_name: str = "مكتب الأمانة للخدمات"
    address: str = "الرياض - حي العليا"
    phone: str = "0112345678"
    currency: str = "ر.س"
    logo_url: Optional[str] = None


# ---------- Helpers ----------
def _clean(doc):
    if doc:
        doc.pop("_id", None)
    return doc


# ---------- Client routes ----------
@api_router.get("/clients", response_model=List[ClientModel])
async def get_clients(
    service: Optional[str] = None,
    archived: Optional[bool] = None,
    q: Optional[str] = None,
):
    query = {}
    if service in ("cleaning", "security"):
        query["service_type"] = service
    if archived is not None:
        query["archived"] = archived
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/clients/{cid}", response_model=ClientModel)
async def get_client(cid: str):
    doc = await db.clients.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api_router.post("/clients", response_model=ClientModel)
async def create_client(data: ClientIn):
    obj = ClientModel(**data.dict(exclude_unset=True))
    payload = obj.dict()
    await db.clients.insert_one(payload.copy())
    return obj


@api_router.put("/clients/{cid}", response_model=ClientModel)
async def update_client(cid: str, data: ClientIn):
    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    await db.clients.update_one({"id": cid}, {"$set": update})
    doc = await db.clients.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api_router.delete("/clients/{cid}")
async def delete_client(cid: str):
    await db.clients.delete_one({"id": cid})
    await db.transactions.delete_many({"entity_type": "client", "entity_id": cid})
    return {"ok": True}


@api_router.post("/clients/{cid}/archive", response_model=ClientModel)
async def archive_client(cid: str, data: ArchiveIn):
    await db.clients.update_one({"id": cid}, {"$set": {"archived": data.archived}})
    doc = await db.clients.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


class RenewIn(BaseModel):
    months: int = Field(default=12, ge=1, le=60)


@api_router.post("/clients/{cid}/renew", response_model=ClientModel)
async def renew_client(cid: str, data: RenewIn):
    """Extend the contract: new period starts at the later of today / current end date."""
    doc = await db.clients.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    now = datetime.now(timezone.utc)
    try:
        current_end = datetime.fromisoformat(doc["contract_end"].replace("Z", "+00:00"))
        if current_end.tzinfo is None:
            current_end = current_end.replace(tzinfo=timezone.utc)
    except Exception:
        current_end = now
    start = max(now, current_end)
    end = start + timedelta(days=30 * data.months)
    await db.clients.update_one(
        {"id": cid},
        {"$set": {"contract_start": start.isoformat(), "contract_end": end.isoformat()}},
    )
    return await db.clients.find_one({"id": cid}, {"_id": 0})


# ---------- Employee routes ----------
@api_router.get("/employees", response_model=List[EmployeeModel])
async def get_employees(
    role: Optional[str] = None,
    archived: Optional[bool] = None,
    q: Optional[str] = None,
):
    query = {}
    if role in ("cleaning", "security"):
        query["role"] = role
    if archived is not None:
        query["archived"] = archived
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"assignment": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.employees.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/employees/{eid}", response_model=EmployeeModel)
async def get_employee(eid: str):
    doc = await db.employees.find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api_router.post("/employees", response_model=EmployeeModel)
async def create_employee(data: EmployeeIn):
    obj = EmployeeModel(**data.dict(exclude_unset=True))
    await db.employees.insert_one(obj.dict().copy())
    return obj


@api_router.put("/employees/{eid}", response_model=EmployeeModel)
async def update_employee(eid: str, data: EmployeeIn):
    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    await db.employees.update_one({"id": eid}, {"$set": update})
    doc = await db.employees.find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api_router.delete("/employees/{eid}")
async def delete_employee(eid: str):
    await db.employees.delete_one({"id": eid})
    await db.transactions.delete_many({"entity_type": "employee", "entity_id": eid})
    return {"ok": True}


@api_router.post("/employees/{eid}/archive", response_model=EmployeeModel)
async def archive_employee(eid: str, data: ArchiveIn):
    await db.employees.update_one({"id": eid}, {"$set": {"archived": data.archived}})
    doc = await db.employees.find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


# ---------- Transactions ----------
@api_router.get("/transactions/archived")
async def get_archived_transactions():
    docs = await db.transactions.find({"archived": True}, {"_id": 0}).sort("date", -1).to_list(1000)
    names = {}
    for coll, et in ((db.clients, "client"), (db.employees, "employee")):
        async for d in coll.find({}, {"_id": 0, "id": 1, "name": 1}):
            names[(et, d["id"])] = d["name"]
    for d in docs:
        d["entity_name"] = names.get((d["entity_type"], d["entity_id"]), "—")
    return docs


@api_router.get("/transactions/{entity_type}/{entity_id}")
async def get_transactions(entity_type: str, entity_id: str):
    docs = await db.transactions.find(
        {"entity_type": entity_type, "entity_id": entity_id, "archived": False},
        {"_id": 0},
    ).sort("date", -1).to_list(1000)
    balance = sum(txn_sign(entity_type, d["kind"]) * float(d["amount"]) for d in docs)
    return {"items": docs, "balance": balance}


@api_router.post("/transactions", response_model=TransactionModel)
async def create_transaction(data: TransactionIn):
    payload = data.dict(exclude_unset=True)
    if not payload.get("date"):
        payload["date"] = now_iso()
    obj = TransactionModel(**payload)
    await db.transactions.insert_one(obj.dict().copy())
    return obj


@api_router.put("/transactions/{tid}", response_model=TransactionModel)
async def update_transaction(tid: str, data: TransactionUpdate):
    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if update:
        await db.transactions.update_one({"id": tid}, {"$set": update})
    doc = await db.transactions.find_one({"id": tid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api_router.post("/transactions/{tid}/archive", response_model=TransactionModel)
async def archive_transaction(tid: str, data: ArchiveIn):
    await db.transactions.update_one({"id": tid}, {"$set": {"archived": data.archived}})
    doc = await db.transactions.find_one({"id": tid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api_router.delete("/transactions/{tid}")
async def delete_transaction(tid: str):
    await db.transactions.delete_one({"id": tid})
    return {"ok": True}


# ---------- Dashboard ----------
@api_router.get("/dashboard")
async def dashboard():
    clients = await db.clients.find({"archived": False}, {"_id": 0}).to_list(1000)
    cleaning = [c for c in clients if c["service_type"] == "cleaning"]
    security = [c for c in clients if c["service_type"] == "security"]
    cleaning_rev = sum(c.get("contract_amount", 0) for c in cleaning)
    security_rev = sum(c.get("contract_amount", 0) for c in security)

    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=30)
    expiring = []
    for c in clients:
        try:
            end = datetime.fromisoformat(c["contract_end"].replace("Z", "+00:00"))
        except Exception:
            continue
        if now <= end <= soon:
            expiring.append(c)
    expiring.sort(key=lambda x: x["contract_end"])

    # Monthly and yearly revenue from transactions
    txns = await db.transactions.find({"archived": False, "kind": "receipt", "entity_type": "client"}, {"_id": 0}).to_list(5000)
    monthly = 0.0
    yearly = 0.0
    for t in txns:
        try:
            d = datetime.fromisoformat(t["date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if d.year == now.year:
            yearly += float(t["amount"])
            if d.month == now.month:
                monthly += float(t["amount"])

    return {
        "total_contracts": len(clients),
        "total_subscriptions": cleaning_rev + security_rev,
        "cleaning": {"count": len(cleaning), "revenue": cleaning_rev},
        "security": {"count": len(security), "revenue": security_rev},
        "expiring": expiring[:10],
        "monthly_revenue": monthly,
        "yearly_revenue": yearly,
    }


# ---------- Settings ----------
@api_router.get("/settings", response_model=OfficeSettingsModel)
async def get_settings():
    doc = await db.settings.find_one({"_id": "office"})
    if not doc:
        base = OfficeSettingsModel().dict()
        await db.settings.insert_one({"_id": "office", **base})
        return base
    doc.pop("_id", None)
    return doc


@api_router.put("/settings", response_model=OfficeSettingsModel)
async def update_settings(data: OfficeSettingsModel):
    payload = data.dict()
    await db.settings.update_one({"_id": "office"}, {"$set": payload}, upsert=True)
    return payload


# ---------- Backup ----------
@api_router.get("/backup")
async def backup():
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    employees = await db.employees.find({}, {"_id": 0}).to_list(10000)
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(50000)
    settings = await db.settings.find_one({"_id": "office"}, {"_id": 0}) or {}
    return {
        "generated_at": now_iso(),
        "clients": clients,
        "employees": employees,
        "transactions": transactions,
        "settings": settings,
    }


# ---------- Logo upload/serve ----------
@api_router.post("/upload/logo")
async def upload_logo(file: UploadFile = File(...)):
    data = await file.read()
    ext = (file.filename or "logo.png").rsplit(".", 1)[-1].lower() or "png"
    obj_path = f"{APP_NAME}/uploads/office/{uuidlib.uuid4().hex}.{ext}"
    ct = file.content_type or f"image/{ext}"
    try:
        await run_in_threadpool(put_object, obj_path, data, ct)
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    await db.settings.update_one({"_id": "office"}, {"$set": {"logo_url": obj_path}}, upsert=True)
    return {"logo_url": obj_path}


@api_router.get("/files/{path:path}")
async def get_file(path: str):
    try:
        content, ctype = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(404, "File not found")
    return Response(content=content, media_type=ctype)


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"message": "Office Services API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed():
    """Seed sample data if collections are empty."""
    if await db.clients.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        sample_clients = [
            ClientModel(
                name="شركة الفا للمقاولات",
                address="حي العليا - الرياض",
                phone="0555123456",
                service_type="cleaning",
                contract_amount=3500,
                contract_start=(now - timedelta(days=90)).isoformat(),
                contract_end=(now + timedelta(days=180)).isoformat(),
            ),
            ClientModel(
                name="مجمع النور التجاري",
                address="حي الملقا - الرياض",
                phone="0555987654",
                service_type="cleaning",
                contract_amount=5200,
                contract_start=(now - timedelta(days=330)).isoformat(),
                contract_end=(now + timedelta(days=20)).isoformat(),
            ),
            ClientModel(
                name="مستشفى الرعاية",
                address="حي السليمانية - الرياض",
                phone="0555112233",
                service_type="cleaning",
                contract_amount=7800,
                contract_start=(now - timedelta(days=60)).isoformat(),
                contract_end=(now + timedelta(days=305)).isoformat(),
            ),
            ClientModel(
                name="برج الأعمال المركزي",
                address="طريق الملك فهد - الرياض",
                phone="0555334455",
                service_type="security",
                contract_amount=9000,
                contract_start=(now - timedelta(days=120)).isoformat(),
                contract_end=(now + timedelta(days=245)).isoformat(),
            ),
            ClientModel(
                name="مستودعات الخليج",
                address="المنطقة الصناعية - الدمام",
                phone="0555667788",
                service_type="security",
                contract_amount=6500,
                contract_start=(now - timedelta(days=200)).isoformat(),
                contract_end=(now + timedelta(days=165)).isoformat(),
            ),
            ClientModel(
                name="مجمع سكني الواحة",
                address="حي الياسمين - الرياض",
                phone="0555998877",
                service_type="security",
                contract_amount=7000,
                contract_start=(now - timedelta(days=340)).isoformat(),
                contract_end=(now + timedelta(days=15)).isoformat(),
            ),
        ]
        for c in sample_clients:
            await db.clients.insert_one(c.dict().copy())

        sample_employees = [
            EmployeeModel(name="سالم العتيبي", role="security", assignment="برج الأعمال المركزي", phone="0501112233", salary=4500),
            EmployeeModel(name="فهد القحطاني", role="cleaning", assignment="مجمع النور التجاري", phone="0502223344", salary=3500),
            EmployeeModel(name="ماجد الشهري", role="security", assignment="مستودعات الخليج", phone="0503334455", salary=4200),
            EmployeeModel(name="خالد الزهراني", role="cleaning", assignment="مستشفى الرعاية", phone="0504445566", salary=3800),
            EmployeeModel(name="عبدالله الحربي", role="security", assignment="مجمع سكني الواحة", phone="0505556677", salary=4300),
        ]
        for e in sample_employees:
            await db.employees.insert_one(e.dict().copy())

    if await db.settings.count_documents({"_id": "office"}) == 0:
        base = OfficeSettingsModel().dict()
        await db.settings.insert_one({"_id": "office", **base})

    # legacy kind "payment" -> receipt (client) / disbursement (employee)
    await db.transactions.update_many({"kind": "payment", "entity_type": "client"}, {"$set": {"kind": "receipt"}})
    await db.transactions.update_many({"kind": "payment", "entity_type": "employee"}, {"$set": {"kind": "disbursement"}})

    if await db.transactions.count_documents({}) == 0:
        await seed_transactions()


def _months_ago(n: int, day: int) -> datetime:
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month - n
    while m <= 0:
        y, m = y - 1, m + 12
    return datetime(y, m, min(day, 28), 10, 0, tzinfo=timezone.utc)


AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]


async def seed_transactions():
    """Demo history: 6 months of monthly charges + payments for every client and employee."""
    docs = []
    clients = await db.clients.find({"archived": False}, {"_id": 0}).to_list(100)
    employees = await db.employees.find({"archived": False}, {"_id": 0}).to_list(100)
    for idx, c in enumerate(clients):
        for n in range(6, 0, -1):
            charge_dt = _months_ago(n, 1)
            month_name = f"{AR_MONTHS[charge_dt.month - 1]} {charge_dt.year}"
            amount = float(c["contract_amount"])
            docs.append(TransactionModel(entity_type="client", entity_id=c["id"], kind="charge",
                                         description=f"اشتراك شهر {month_name}", amount=amount,
                                         date=charge_dt.isoformat()).dict())
            # every 3rd month of some clients stays partially unpaid to make balances interesting
            partial = (idx + n) % 4 == 0
            pay_amount = round(amount * 0.5, 2) if partial else amount
            docs.append(TransactionModel(entity_type="client", entity_id=c["id"], kind="receipt",
                                         description=f"دفعة {'جزئية ' if partial else ''}شهر {month_name}", amount=pay_amount,
                                         date=_months_ago(n, 5 + idx).isoformat()).dict())
    for idx, e in enumerate(employees):
        for n in range(6, 0, -1):
            dt = _months_ago(n, 27)
            month_name = f"{AR_MONTHS[dt.month - 1]} {dt.year}"
            salary = float(e["salary"])
            docs.append(TransactionModel(entity_type="employee", entity_id=e["id"], kind="charge",
                                         description=f"راتب شهر {month_name}", amount=salary,
                                         date=dt.isoformat()).dict())
            if (idx + n) % 5 == 0:
                docs.append(TransactionModel(entity_type="employee", entity_id=e["id"], kind="charge",
                                             description="بدل ساعات إضافية", amount=round(salary * 0.1, 2),
                                             date=_months_ago(n, 26).isoformat()).dict())
            docs.append(TransactionModel(entity_type="employee", entity_id=e["id"], kind="disbursement",
                                         description=f"صرف راتب {month_name}", amount=salary,
                                         date=_months_ago(n, 28).isoformat()).dict())
    if docs:
        await db.transactions.insert_many([d.copy() for d in docs])
        logger.info("Seeded %d demo transactions", len(docs))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
