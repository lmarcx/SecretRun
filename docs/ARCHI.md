# ⚙️ Stack technique recommandée

Tu veux :

* app mobile
* GPS
* notifications
* leaderboard
* social

La stack la plus rapide et robuste pour ça :

### Mobile

**React Native + Expo**

Pourquoi :

* iOS + Android
* GPS simple
* push notifications faciles
* énorme écosystème

---

### Backend

**Supabase**

Pourquoi :

* Auth
* Postgres
* realtime
* storage
* edge functions

---

### DB extension

**PostGIS**

pour :

* routes
* géolocalisation
* calculs distance

---

### Maps

Pour le MVP :

* **OpenRouteService**
* **OSRM**
* **Mapbox free tier**

---

### GPS Tracking

React Native :

```
expo-location
```

---

### Push Notifications

```
Expo Push Notifications
```

---

# 📦 Architecture globale

```
Mobile App (React Native)

       ↓

API Layer (Supabase)

       ↓

PostgreSQL + PostGIS
```

Services externes :

```
Maps API
Route generation
Push notifications
```
