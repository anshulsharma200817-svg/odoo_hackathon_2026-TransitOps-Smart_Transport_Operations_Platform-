# TransitOps — Smart Transport Operations Platform

Odoo Hackathon project. Django + DRF backend, React (Vite) + Tailwind frontend.

## Project Structure

```
transitops/
├── backend/                 # Django + DRF API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── transitops/          # project settings, urls
│   └── core/                # models, serializers, views, urls (all app logic lives here)
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── permissions.py
│       ├── admin.py
│       └── management/commands/seed.py
└── frontend/                 # React + Vite + Tailwind
    ├── package.json
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/client.js     # axios instance with JWT header
        ├── routes/ProtectedRoute.jsx
        ├── components/       # shared UI (Navbar, etc.)
        └── pages/             # Login, Dashboard, Vehicles, Drivers, Trips, Maintenance, FuelExpenses, Reports
```

## Backend Setup (Windows)

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

API runs at `http://localhost:8000/api/`. Admin panel at `http://localhost:8000/admin/` (login: `admin` / `admin1234` after seeding).

## Frontend Setup (Windows)

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:5173/`.

## See Also

`TransitOps_Dev_Plan.md` for the hour-by-hour build plan and API contract each dev is working against.
