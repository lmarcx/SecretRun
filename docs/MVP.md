# Secret Run — MVP Product Specification

Version : MVP Beta Closed
Objectif : tester le concept avec de vrais runners.

---

# 1. Vision produit

Secret Run est une application de running social basée sur des **courses secrètes révélées à l’avance**.

Le principe :

* les utilisateurs rejoignent des **events running**
* la **route reste secrète** jusqu'à un moment donné
* les participants doivent **se rendre dans la zone de départ**
* ils réalisent la course
* leurs performances sont **validées**
* ils gagnent **points + récompenses**
* ils apparaissent dans les **leaderboards**
* ils peuvent **rejoindre ou créer des teams**

Le produit mélange :

* Strava
* Running challenges
* Social competition
* Events secrets

---

# 2. Flow utilisateur MVP

### Installation → première utilisation

1. Install app
2. Create account (Google / Apple)
3. Automatic profile creation
4. User sees **Events page (home)**

---

### Participation à un event

1. User opens Event
2. Joins event
3. Leaves the app
4. Receives notification
5. Route is revealed
6. User goes to start zone
7. Starts run
8. Finishes run
9. Run validated

---

### Résultat

User receives :

* course trace
* points
* rewards
* activity recorded
* leaderboard ranking update

---

### Progression sociale

User can :

* view leaderboards
* search teams
* join teams
* participate in team events
* create team events

---

# 3. Authentication

Authentication providers :

* Google
* Apple

Profile creation :

Automatic during signup.

Profile fields (MVP):

| field    | rules    |
| -------- | -------- |
| username | unique   |
| avatar   | optional |
| location | optional |
| age      | optional |

Important rule :

```
username == display name
```

User can change username.

---

# 4. Events system

Two types of events exist.

---

## Public events

Visible to everyone.

Used for :

* solo leaderboard
* global competition

---

## Team events

Private events created by teams.

Properties :

* visible only to team members
* appear in activity feed
* count toward team leaderboard

---

# Event limits (MVP)

Max participants :

```
5 participants
```

Purpose :

* keep events manageable
* reduce cheating
* simplify infra

---

# Event structure

Before reveal :

Event shows :

```
zone_center
zone_radius
```

Purpose :

Hide the real start location.

---

# At reveal

Participants obtain :

```
start_point
end_point
```

There are **no checkpoints in MVP**.

---

# 5. Route reveal system

Each event has :

```
reveal_at
```

When time is reached :

* route becomes visible
* only participants can see it

Map display :

Strava-like map using polyline.

---

# 6. Run system

User must be **inside the start zone** to begin.

Joining the event does not require location.

---

# Run states

Possible states :

```
joined
running
completed
abandoned
```

Rules :

* user can abandon
* user cannot pause
* run must be continuous

---

# Run tracking

For MVP :

Recording strategy recommended :

```
local tracking → upload after run
```

Why :

* simpler
* less backend load
* fewer edge cases

---

# Distance calculation

Recommended architecture :

```
distance computed client-side
validated server-side
```

---

# 7. Anti-cheat system

Goal :

detect suspicious activities.

Possible detection :

* unrealistic speed
* GPS jumps
* vehicle usage

MVP rule suggestion :

```
speed limit = 25 km/h
```

If exceeded :

```
activity flagged suspected_vehicle
```

Flagged runs :

* excluded from leaderboard
* visible in moderation tools later

---

# 8. Leaderboards

Leaderboards exist in multiple categories.

---

# Solo leaderboards

Categories :

```
Global
Season
Weekly
```

---

# Team leaderboards

Categories :

```
Global
Season
Weekly
```

---

# Points system

Each run provides :

```
base points
+
time bonus
```

Formula concept :

```
points = base_points + time_bonus
```

Where :

```
time_bonus = expected_time - runner_time
```

Fast runners earn more.

---

# Season system

Users can join **multiple events per season**.

Points accumulate across events.

---

# 9. Teams

Teams are included in MVP.

Capabilities :

Users can :

* search teams
* join teams
* participate in team events
* create team events

---

# Team event rules

Team events :

* private
* visible to team members
* counted in team leaderboard

---

# 10. Activity feed

Feed shows :

* user activities
* friends activities

Activity examples :

* completed run
* joined event
* team event results

---

# 11. Notifications

Notifications supported in MVP.

Events triggering notifications :

| event             | notification |
| ----------------- | ------------ |
| route reveal      | yes          |
| event start       | yes          |
| results available | yes          |

---

# 12. Rewards system

Completing a run gives :

* leaderboard points
* activity record
* Effort currency

Currency name :

```
Effort
```

Purpose :

future features beyond MVP.

---

# 13. App navigation

Main screen :

```
Events
```

Home page shows :

* upcoming events
* filters

Example filters :

* distance
* time
* teams
* public events

---

# 14. Target release

MVP goal :

```
closed beta with real runners
```

Purpose :

* validate concept
* detect cheating
* measure engagement
* test social dynamics

---

# Important conclusion

Ton MVP est **plus ambitieux que la moyenne**, mais reste cohérent.

Les **3 piliers du produit** sont :

```
Secret events
Competitive running
Social teams
```

