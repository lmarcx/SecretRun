# 🗄 Modèle de données (première version)

## User

```
User
- id
- email
- pseudo
- avatar
- city
- age
- bio
- level
- created_at
```

---

## Team

```
Team
- id
- name
- leader_id
- created_at
```

---

## TeamMember

```
TeamMember
- team_id
- user_id
- role
```

---

## Event

```
Event
- id
- creator_id
- distance
- elevation
- start_time
- reveal_time
- start_location
- end_location
- route_polyline
- max_participants
- status
```

---

## EventParticipant

```
EventParticipant
- event_id
- user_id
- joined_at
- finish_time
- estimated_time
- result_status
```

---

## Activity

```
Activity
- id
- user_id
- event_id
- route
- duration
- created_at
```

---

## LeaderboardScore

```
LeaderboardScore
- user_id
- points
- season
```

---

## Wallet

```
Wallet
- user_id
- balance
```

---