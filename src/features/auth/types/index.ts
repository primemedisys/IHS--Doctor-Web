/** Auth domain types are shared app-wide (context, middleware), so they live in
 * `@/types/auth`. Re-exported here for feature-local ergonomics. */
export type {
  User,
  UserRole,
  RegisterableRole,
  AuthTokens,
  JwtClaims,
  LoginResponse,
  GoogleAuthInput,
} from "@/types/auth";
export type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateProfileInput,
  SignupRole,
} from "../schemas";
