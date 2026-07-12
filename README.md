# 🚚 TransitOps — Smart Transport Operations Platform

> **Odoo Hackathon 2026** Project

TransitOps is a modern, responsive, and comprehensive fleet management and transport operations platform. It provides real-time tracking, maintenance status, capacity allocation, and financial analytics for an entire transport fleet.

## ✨ Key Features

- **Role-Based Access Control (RBAC)**: Distinct dashboards and restricted sidebar navigation tailored for different user roles:
  - **Fleet Manager**: Full administrative access to dispatch, monitor, and configure.
  - **Driver**: Simplified interface focused on their profile credentials and quick logging of trip/fuel expenses.
  - **Safety Officer**: Specialized dashboard emphasizing average safety scores, active driver licenses, and vehicles in the workshop.
  - **Financial Analyst**: Analytical view centered on operational costs, total fuel expenses, and ROI metrics.
- **Fleet Management**: Register, track, and manage vehicles (Trucks, Vans, EVs, etc.). Monitor live statuses, odometers, and payload capacities.
- **Interactive Dashboards**: Real-time KPI summaries including active fleets on the road, vehicles in maintenance, and total asset value.
- **Drivers & Operations**: Keep track of operators, manage their assignments, and view operational metrics.
- **Trip & Route Tracking**: Dispatch vehicles, manage routes, and track ongoing trips.
- **Maintenance Logs**: Log repairs and service history to minimize downtime and prevent breakdowns.
- **Financial & Fuel Analytics**: Track expenses in localized currency (₹), including fuel logs, and generate high-level business CSV reports.
- **Premium UI/UX**: Built with a sleek, interactive, and highly responsive interface using Tailwind CSS and Recharts.

## 🛠 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Python, Django, Django REST Framework
- **Database**: SQLite (default for development)

## 🚀 Getting Started (Windows)

### 1. Backend Setup

Open a terminal and run the following commands:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed
python manage.py runserver
```

- API Base URL: `http://localhost:8000/api/`
- Admin Panel: `http://localhost:8000/admin/` 
  *(Default seed credentials: Username: `admin` / Password: `admin1234`)*

### 2. Frontend Setup

Open a new terminal (while keeping the backend running) and execute:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

- Web Application: `http://localhost:5173/`

## 📂 Project Structure

```text
transitops/
├── backend/                 # Django + DRF API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── transitops/          # project settings, urls
│   └── core/                # models, serializers, views, urls
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── management/commands/seed.py
└── frontend/                 # React + Vite + Tailwind
    ├── package.json
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/client.js     # axios instance with JWT header
        ├── components/       # shared UI components
        └── pages/            # Application views (Dashboard, Vehicles, etc.)
```

## 📄 See Also

Refer to the `TransitOps_Dev_Plan.md` file in this repository for the detailed hour-by-hour build plan, UI specifications, and API contract details used during the hackathon development.
