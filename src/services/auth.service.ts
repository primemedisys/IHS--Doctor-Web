import { api } from "./api";
import { API_ENDPOINTS } from "@/constants/api";
import { tokenStorage } from "@/utils/auth-token";
import type { ApiResponse } from "@/types/common";
import type { GoogleAuthInput, LoginResponse, User } from "@/types/auth";
import type {
  ForgotPasswordInput,
  LoginInput,
  LoginCredentials,
  OtpTarget,
  RegisterInput,
  UpdateProfileInput,
} from "@/features/auth/schemas";

/**
 * Real auth API (backend/src/routes/auth.routes.js). This layer talks HTTP
 * only — it also persists tokens as a side effect of login/register/logout so
 * callers (hooks/context) never juggle storage. Success envelope is
 * `{ success, message, data }`; the axios interceptor already handles
 * refresh-on-401 transparently.
 */
export const authService = {
  /** Registered email OR 10-digit mobile + password (exactly one identifier). */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // `audience: doctor` → the backend rejects a valid-but-patient account with
    // 403 WRONG_PORTAL before any tokens are issued, and a mobile number only
    // ever matches DOCTOR accounts on this app.
    const { data } = await api.post<ApiResponse<LoginResponse>>(API_ENDPOINTS.auth.login, {
      ...credentials,
      audience: "doctor",
    });
    tokenStorage.setTokens(data.data.tokens);
    return data.data;
  },

  /**
   * Registers with the persona chosen on the signup screen. Only the fields
   * the backend contract accepts are sent ({ name, email, phone?, password,
   * role }); UI-only fields (confirmPassword, acceptTerms) stay client-side.
   */
  async register({ name, email, phone, password, role }: RegisterInput): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>(API_ENDPOINTS.auth.register, {
      name,
      email,
      phone: phone || undefined,
      password,
      role,
    });
    tokenStorage.setTokens(data.data.tokens);
    return data.data;
  },

  /**
   * Google signup/signin. `credential` is the ID token from the Google Identity
   * button; `role` is only needed for a brand-new account (Google signup) and
   * is ignored by the backend when the account already exists.
   */
  async google(payload: GoogleAuthInput): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>(API_ENDPOINTS.auth.google, payload);
    tokenStorage.setTokens(data.data.tokens);
    return data.data;
  },

  /** Admin portal sign-in — the backend rejects non-admin accounts here. */
  async adminLogin({ email, password }: LoginInput): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>(API_ENDPOINTS.auth.adminLogin, {
      email,
      password,
    });
    tokenStorage.setTokens(data.data.tokens);
    return data.data;
  },

  /** Always resolves the same way — the backend never reveals whether the email exists. */
  async forgotPassword(payload: ForgotPasswordInput): Promise<void> {
    await api.post(API_ENDPOINTS.auth.forgotPassword, payload);
  },

  /** Consumes the emailed reset token; the backend revokes all sessions after. */
  /**
   * Forgot password by OTP, step 1 (doctor accounts): a 6-digit code to the
   * registered mobile (SMS) or email. Resolves the same way whether or not the
   * account exists; rejects with 503 SMS_UNAVAILABLE / EMAIL_UNAVAILABLE when
   * that channel isn't configured, which the UI shows as-is.
   */
  async requestPasswordOtp(target: OtpTarget): Promise<void> {
    await api.post(API_ENDPOINTS.auth.forgotPasswordOtp, { ...target, audience: "doctor" });
  },

  /** Step 2: a correct code → a single-use reset token for `resetPassword`. */
  async verifyPasswordOtp(target: OtpTarget, otp: string): Promise<{ resetToken: string }> {
    const { data } = await api.post<ApiResponse<{ resetToken: string }>>(API_ENDPOINTS.auth.verifyPasswordOtp, {
      ...target,
      otp,
      audience: "doctor",
    });
    return data.data;
  },

  async resetPassword(payload: { token: string; password: string }): Promise<void> {
    await api.post(API_ENDPOINTS.auth.resetPassword, payload);
  },

  async me(): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>(API_ENDPOINTS.auth.me);
    return data.data;
  },

  async updateProfile(patch: UpdateProfileInput): Promise<User> {
    const { data } = await api.patch<ApiResponse<User>>(API_ENDPOINTS.auth.updateProfile, {
      name: patch.name,
      phone: patch.phone || null,
    });
    return data.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post(API_ENDPOINTS.auth.logout, {
        refreshToken: tokenStorage.getRefreshToken(),
      });
    } catch {
      // Best-effort revoke; the local clear below is what ends the session.
    } finally {
      tokenStorage.clear();
    }
  },
};
