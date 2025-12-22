import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios, { AxiosError } from 'axios';
import styles from './Page.module.scss';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { email, password } = formData;

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const body = JSON.stringify({ email, password });

      const res = await axios.post<{ token: string }>('/api/users/login', body, config);
      console.log(res.data.token);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverError = err as AxiosError<{ msg: string }>;
        if (serverError && serverError.response) {
          console.error(serverError.response.data.msg);
        }
      } else {
        console.error(err);
      }
    }
  };

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={onSubmit}>
        <h2>Login</h2>
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
        <button type="submit">Login</button>
      </form>
    </main>
  );
};

export default LoginPage;