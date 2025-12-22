import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import styles from './Page.module.scss';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });

  const { username, email, password, password2 } = formData;
  

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (password !== password2) {
    console.log('Passwords do not match');
    return;
  }

  const newUser = { username, email, password };
  console.log('Submitting user:', newUser);

  try {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const res = await axios.post<{ token: string }>('/api/users/register', newUser, config);
    console.log('Registration successful, token:', res.data.token);
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      console.error('Axios error:', err.response?.data || err.message);
    } else {
      console.error('Unexpected error:', err);
    }
  }
};


  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={onSubmit}>
        <h2>Register</h2>
        <div className={styles.formGroup}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={username}
            onChange={onChange}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            minLength={6}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password2">Confirm Password</label>
          <input
            type="password"
            id="password2"
            name="password2"
            value={password2}
            onChange={onChange}
            minLength={6}
            required
          />
        </div>
        <button type="submit">Register</button>
      </form>
    </main>
  );
};

export default RegisterPage;