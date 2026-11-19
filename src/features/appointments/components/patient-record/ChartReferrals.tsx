"use client";

import { FiUserPlus } from "react-icons/fi";
import { toast } from "sonner";
import { useBookingReferrals, useCancelReferral } from "@/features/referrals";
import { getErrorMessage } from "@/utils/error";
import type { ReferralStatus } from "@/types/referral";

/**
 * Referrals made from THIS consultation.
 *
 * Status carries the colour code the rest of the page uses for findings —
 * amber is waiting on someone, blue is in motion, green is closed, grey is
 * over. Cancelling is the only action, and only while nobody has booked yet.
 */
const STATUS_META: Record<ReferralStatus, { label: string; cls: string }> = {
  pending: { label: "Awaiting booking", cls: "await" },
  booked: { label: "Booked", cls: "booked" },
  completed: { label: "Completed", cls: "done" },
  cancelled: { label: "Cancelled", cls: "cancel" },
  declined: { label: "Declined", cls: "cancel" },
};

export function ChartReferrals({ bookingId, onRefer }: { bookingId: string; onRefer: () => void }) {
  const { data: referrals = [], isLoading } = useBookingReferrals(bookingId);
  const cancel = useCancelReferral(bookingId);

  const onCancel = (id: string) => {
    cancel.mutate(id, {
      onSuccess: () => toast.success("Referral cancelled"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <section className="section" aria-label="Referrals">
      <div className="sh">
        <div className="sic" aria-hidden>
          <FiUserPlus size={16} />
        </div>
        <div className="stitle">Referrals</div>
        {referrals.length > 0 && <span className="scount">{referrals.length}</span>}
        <div className="saction">
          <button className="btn primary" onClick={onRefer}>
            <FiUserPlus size={14} />
            Refer to another doctor
          </button>
        </div>
      </div>

      <div className="sbody">
        {isLoading ? (
          <div className="emptyline">Loading referrals…</div>
        ) : referrals.length === 0 ? (
          <div className="emptyline">No referrals from this consultation yet.</div>
        ) : (
          referrals.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <div className="ref" key={r.id}>
                <div style={{ minWidth: 0 }}>
                  <div className="rn">{r.toDoctor?.name ?? "Doctor"}</div>
                  <div className="rm">
                    {[r.toDoctor?.specialization, r.reason].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="rr">
                  <span className={`rstat ${meta.cls}`}>{meta.label}</span>
                  {r.status === "pending" && (
                    <button className="linkbtn" onClick={() => onCancel(r.id)} disabled={cancel.isPending}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
