import React from 'react';
import styles from './Home.module.scss';

const Home = () => {
  return (
    <main className={styles.home}>
      <h1>Welcome to SecretRun</h1>
      <p>This is the homepage of our community event platform.</p>
    </main>
  );
};

export default Home;