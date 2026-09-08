RideSafe — Katsana + Bukku Integration Plan

1. Integration Philosophy (CRITICAL)
NEVER tightly couple external APIs

Instead:

RideSafe Core
   ↓
Integration Layer
   ├── Katsana Adapter
   └── Bukku Adapter

2. System Architecture
Flutter Apps
      ↓
RideSafe Backend (FastAPI / Next.js)
      ↓
-----------------------------
| Integration Layer         |
|---------------------------|
| Katsana Adapter           |
| Bukku Adapter             |
-----------------------------
      ↓
External APIs

🛰️ 3. KATSANA INTEGRATION PLAN

3.1 Purpose
Live GPS tracking
Driver behavior
Geofence triggers

3.2 Data Flow
Katsana API
     ↓
Tracking Adapter
     ↓
Normalize Data
     ↓
Redis (live)
     ↓
WebSocket
     ↓
Parent App

3.3 Service Design
tracking-service

Endpoints:
GET /tracking/live/{bus_id}
POST /tracking/katsana/update

3.4 Adapter Pattern
class TrackingAdapter:
    def get_location(bus_id):
        if katsana_available:
            return katsana_adapter.get_location(bus_id)
        else:
            return mobile_adapter.get_location(bus_id)

3.5 Katsana Adapter
class KatsanaAdapter:
    def fetch_location(vehicle_id):
        token = get_token()
        headers = {
            "Accept": "application/vnd.KATSANA.v1+json",
            "Authorization": f"Bearer {token}"
        }
        # call API

3.6 Data Normalization
Katsana → RideSafe
Field	Convert
speed (knot)	km/h
time (UTC)	MYT
location	standard lat/lng

3.7 Failover Logic
IF katsana down → use mobile GPS

💰 4. BUKKU INTEGRATION PLAN

4.1 Purpose
Invoice generation
Payment tracking
MyInvois compliance

4.2 Data Flow
Student Assigned
     ↓
Billing Trigger
     ↓
Bukku Adapter
     ↓
Bukku API
     ↓
Invoice Created
     ↓
Stored in RideSafe DB
     ↓
Parent App View

4.3 Payment Service
Endpoints:
POST /billing/generate
GET /billing/{parent_id}
POST /billing/sync

4.4 Bukku Adapter
class BukkuAdapter:
    def create_invoice(parent, amount):
        payload = {
            "customer": parent.name,
            "amount": amount
        }
        # call bukku API

4.5 Database Design
payments
 ├── id
 ├── parent_id
 ├── bukku_invoice_id
 ├── amount
 ├── status
 ├── due_date
 ├── paid_at

4.6 Sync Strategy
Daily Sync Job
     ↓
Fetch invoice status
     ↓
Update local DB

4.7 Payment States
PENDING
PAID
OVERDUE
FAILED

🔄 5. EVENT-DRIVEN SYSTEM
Events
TRIP_STARTED
STUDENT_PICKED
STUDENT_DROPPED
INVOICE_CREATED
PAYMENT_OVERDUE

Example Flow
Trip Delay > 10 min
     ↓
Trigger Event
     ↓
Notification Service
     ↓
Parent Alert

🔐 6. SECURITY
Rules
Never expose Katsana API to frontend
Never expose Bukku API
Store tokens securely

Rate Limiting
Katsana → 1 request / 5 sec
Bukku → per invoice trigger only

⚠️ 7. FAILURE HANDLING
Katsana Failure
Fallback → mobile GPS

Bukku Failure
Queue invoice → retry later

🧠 8. DEV STRATEGY
Phase 1
Build system WITHOUT APIs
(use mock data)

Phase 2
Plug Katsana Adapter

Phase 3
Plug Bukku Adapter

🚀 9. FINAL ARCHITECTURE (CLEAN)
RideSafe Core
   ├── Tracking Service
   ├── Payment Service
   ├── Notification Service
   │
   ├── Katsana Adapter
   └── Bukku Adapter
