# Nhost Cloud Verification

Use this checklist after setting `EXPO_PUBLIC_NHOST_SUBDOMAIN`, `EXPO_PUBLIC_NHOST_REGION`, and `EXPO_PUBLIC_HASURA_GRAPHQL_URL`.

- Auth endpoint responds: the derived auth URL `https://<subdomain>.auth.<region>.nhost.run/v1` returns an HTTP response and does not fail on DNS or network.
- GraphQL endpoint responds: `EXPO_PUBLIC_HASURA_GRAPHQL_URL` accepts a POST with `{"query":"query { __typename }"}`.
- Register works: create an account from the existing register screen.
- Login works: sign in from the existing login screen.
- Logout works: sign out and confirm authenticated actions require sign-in again.
- Session persists: restart the app and confirm the previous session is restored.
