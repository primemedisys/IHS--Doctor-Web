/**
 * Top-level `services/` holds cross-cutting API infrastructure:
 *  - `api`         : the configured Axios instance (interceptors, refresh)
 *  - `authService` : global auth calls used by context + middleware
 *
 * Resource-specific services (patients, doctors, appointments, ...) live inside
 * their feature module (e.g. `features/patients/services`) to keep features
 * self-contained. Import those from the feature, not from here.
 */
export { api, requestData } from "./api";
export { authService } from "./auth.service";
