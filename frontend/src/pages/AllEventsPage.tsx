import React from 'react';
import styles from './Page.module.scss';

const AllEventsPage = () => {
  // Mock data for events
  const events = [
    {
      id: 1,
      title: 'Secret Run in the Park',
      date: '2025-12-25',
      location: 'Central Park, NYC'
    },
    {
      id: 2,
      title: 'Urban Exploration Run',
      date: '2026-01-15',
      location: 'Downtown, LA'
    },
    {
      id: 3,
      title: 'Night Adventure Run',
      date: '2026-02-10',
      location: 'Golden Gate Bridge, SF'
    }
  ];

  return (
    <main className={styles.page}>
      <h2>All Events</h2>
      <div className={styles.eventsGrid}>
        {events.map(event => (
          <div key={event.id} className={styles.eventCard}>
            <h3>{event.title}</h3>
            <p>{event.date}</p>
            <p>{event.location}</p>
          </div>
        ))}
      </div>
    </main>
  );
};

export default AllEventsPage;