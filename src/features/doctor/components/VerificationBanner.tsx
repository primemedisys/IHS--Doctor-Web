"use client";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import NextLink from "next/link";
import { ROUTES } from "@/constants/routes";
import type { OnboardingStatus } from "@/types/doctor-portfolio";

/**
 * The doctor-facing verification status banner (frontend-plan.md §6.2):
 *   pending + !submitted → "Finish onboarding" CTA
 *   pending + submitted  → "Under review"
 *   rejected             → notes + "Update & resubmit"
 *   approved             → "Live" + link to the public profile
 */
export function VerificationBanner({ status, slug }: { status: OnboardingStatus; slug?: string }) {
  const { verificationStatus, isSubmitted, verificationNotes } = status;

  if (verificationStatus === "approved") {
    return (
      <Alert
        severity="success"
        action={
          slug ? (
            <Button component={NextLink} href={ROUTES.doctorProfile(slug)} color="inherit" size="small">
              View public profile
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>Your profile is live</AlertTitle>
        Patients can now find and book you in search and discovery.
      </Alert>
    );
  }

  if (verificationStatus === "rejected") {
    return (
      <Alert
        severity="error"
        action={
          <Button component={NextLink} href={ROUTES.dashboard.onboarding} color="inherit" size="small">
            Update &amp; resubmit
          </Button>
        }
      >
        <AlertTitle>Changes needed before you go live</AlertTitle>
        {verificationNotes || "An admin has requested changes to your profile."}
      </Alert>
    );
  }

  // pending
  if (isSubmitted) {
    return (
      <Alert severity="info">
        <AlertTitle>Under review</AlertTitle>
        Your profile has been submitted and is awaiting admin verification.
      </Alert>
    );
  }

  return (
    <Alert
      severity="warning"
      action={
        <Button component={NextLink} href={ROUTES.dashboard.onboarding} color="inherit" size="small">
          Finish onboarding
        </Button>
      }
    >
      <AlertTitle>Complete your profile</AlertTitle>
      Finish the required steps and submit for verification to appear in search.
    </Alert>
  );
}
