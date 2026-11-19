"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { FiCheck, FiClock, FiMapPin, FiVideo, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { sleep } from "@/utils/async";
import { formatCurrency } from "@/utils/format";
import { generateSlots } from "../services/doctor.service";
import type { BookingMode, BookingSlot, Clinic, DoctorDetail } from "@/types/doctor";

const STEPS = ["Choose slot", "Payment", "Confirmed"];

export interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  doctor: DoctorDetail;
  mode: BookingMode;
  /** Required when mode === "clinic". */
  clinic?: Clinic;
}

/**
 * Multi-step booking (PRD 4.6). Video consults require online payment; clinic
 * visits allow "pay online" or "pay at clinic". Payment is mocked (no gateway)
 * — the flow ends with a confirmation summarising the booking.
 */
export function BookingDialog({ open, onClose, doctor, mode, clinic }: BookingDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [paymentMode, setPaymentMode] = useState<"online" | "offline">("online");
  const [processing, setProcessing] = useState(false);

  const fee = mode === "video" ? doctor.onlineFee : (clinic?.fee ?? doctor.consultationFee);

  const days = useMemo(() => {
    const config = mode === "video" ? doctor.onlineAvailability : clinic;
    if (!config) return [];
    return generateSlots(config, 10);
  }, [mode, doctor.onlineAvailability, clinic]);

  const activeDay = days.find((d) => d.date === selectedDate) ?? days[0];

  const reset = () => {
    setActiveStep(0);
    setSelectedDate(null);
    setSelectedSlot(null);
    setPaymentMode(mode === "video" ? "online" : "online");
    setProcessing(false);
  };

  const handleClose = () => {
    onClose();
    // Delay reset so the closing animation doesn't flash step 0.
    setTimeout(reset, 200);
  };

  const confirm = async () => {
    setProcessing(true);
    await sleep(1200); // simulate payment / booking
    setProcessing(false);
    setActiveStep(2);
    toast.success("Booking confirmed — details sent to your email.");
  };

  return (
    <Dialog open={open} onClose={processing ? undefined : handleClose} fullWidth maxWidth="sm" scroll="body">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: (t) => `${t.tokens.radius.md}px`,
              bgcolor: "grey.100",
              color: mode === "video" ? "primary.main" : "secondary.main",
            }}
          >
            {mode === "video" ? <FiVideo /> : <FiMapPin />}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {mode === "video" ? "Video consultation" : "Clinic visit"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {doctor.name}
              {mode === "clinic" && clinic ? ` · ${clinic.name}` : ""}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={handleClose} disabled={processing} sx={{ position: "absolute", top: 12, right: 12 }} aria-label="Close">
          <FiX />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <SlotStep
            days={days}
            activeDay={activeDay}
            selectedDate={selectedDate ?? activeDay?.date ?? null}
            selectedSlot={selectedSlot}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSelectedSlot(null);
            }}
            onSelectSlot={setSelectedSlot}
            fee={fee}
            onNext={() => setActiveStep(1)}
          />
        )}

        {activeStep === 1 && selectedSlot && (
          <PaymentStep
            mode={mode}
            fee={fee}
            slot={selectedSlot}
            clinic={clinic}
            paymentMode={paymentMode}
            onPaymentModeChange={setPaymentMode}
            processing={processing}
            onBack={() => setActiveStep(0)}
            onConfirm={confirm}
          />
        )}

        {activeStep === 2 && selectedSlot && (
          <ConfirmedStep
            mode={mode}
            doctor={doctor}
            clinic={clinic}
            slot={selectedSlot}
            fee={fee}
            paymentMode={mode === "video" ? "online" : paymentMode}
            onDone={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Day = ReturnType<typeof generateSlots>[number];

function SlotStep({
  days,
  activeDay,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  fee,
  onNext,
}: {
  days: Day[];
  activeDay?: Day;
  selectedDate: string | null;
  selectedSlot: BookingSlot | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: BookingSlot) => void;
  fee: number;
  onNext: () => void;
}) {
  if (!days.length) {
    return <Alert severity="info">No slots available in the next few days. Please check back later.</Alert>;
  }
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Select a date
        </Typography>
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
          {days.map((day) => {
            const active = day.date === selectedDate;
            return (
              <Chip
                key={day.date}
                label={day.label}
                onClick={() => onSelectDate(day.date)}
                color={active ? "primary" : "default"}
                variant={active ? "filled" : "outlined"}
                sx={{ flexShrink: 0, fontWeight: 600 }}
              />
            );
          })}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Available times
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 1 }}>
          {activeDay?.slots.map((slot) => {
            const active = selectedSlot?.start === slot.start;
            return (
              <Button
                key={slot.start}
                size="small"
                variant={active ? "contained" : "outlined"}
                startIcon={<FiClock size={13} />}
                onClick={() => onSelectSlot(slot)}
                sx={{ justifyContent: "center" }}
              >
                {slot.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      <Divider />
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {formatCurrency(fee)}
        </Typography>
        <Button variant="contained" disabled={!selectedSlot} onClick={onNext}>
          Continue
        </Button>
      </Stack>
    </Stack>
  );
}

function PaymentStep({
  mode,
  fee,
  slot,
  clinic,
  paymentMode,
  onPaymentModeChange,
  processing,
  onBack,
  onConfirm,
}: {
  mode: BookingMode;
  fee: number;
  slot: BookingSlot;
  clinic?: Clinic;
  paymentMode: "online" | "offline";
  onPaymentModeChange: (mode: "online" | "offline") => void;
  processing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Box sx={{ p: 2, borderRadius: (t) => `${t.tokens.radius.md}px`, bgcolor: "action.hover" }}>
        <Row label="When" value={`${new Date(slot.start).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}, ${slot.label}`} />
        {mode === "clinic" && clinic && <Row label="Where" value={clinic.address} />}
        <Row label="Consultation fee" value={formatCurrency(fee)} strong />
      </Box>

      {mode === "video" ? (
        <Alert severity="info">Video consultations require online payment to confirm your slot.</Alert>
      ) : (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Payment method
          </Typography>
          <RadioGroup value={paymentMode} onChange={(e) => onPaymentModeChange(e.target.value as "online" | "offline")}>
            <FormControlLabel value="online" control={<Radio />} label="Pay online now" />
            <FormControlLabel value="offline" control={<Radio />} label="Pay at the clinic" />
          </RadioGroup>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary">
        Demo environment — no real payment is processed.
      </Typography>

      <Divider />
      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
        <Button onClick={onBack} disabled={processing} color="inherit">
          Back
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={processing}
          startIcon={processing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {mode === "video" || paymentMode === "online" ? `Pay ${formatCurrency(fee)}` : "Confirm booking"}
        </Button>
      </Stack>
    </Stack>
  );
}

function ConfirmedStep({
  mode,
  doctor,
  clinic,
  slot,
  fee,
  paymentMode,
  onDone,
}: {
  mode: BookingMode;
  doctor: DoctorDetail;
  clinic?: Clinic;
  slot: BookingSlot;
  fee: number;
  paymentMode: "online" | "offline";
  onDone: () => void;
}) {
  return (
    <Stack spacing={2.5} sx={{ alignItems: "center", textAlign: "center" }}>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 64,
          height: 64,
          borderRadius: "50%",
          bgcolor: (t) => alpha(t.palette.success.main, 0.15),
          color: "success.main",
        }}
      >
        <FiCheck size={30} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Booking confirmed
      </Typography>

      <Box sx={{ width: "100%", p: 2, textAlign: "left", borderRadius: (t) => `${t.tokens.radius.md}px`, border: 1, borderColor: "divider" }}>
        <Row label="Doctor" value={`${doctor.name} · ${doctor.specialtyName}`} />
        <Row
          label="Type"
          value={mode === "video" ? "Video consultation" : `Clinic visit · ${clinic?.name ?? ""}`}
        />
        {mode === "clinic" && clinic && <Row label="Address" value={clinic.address} />}
        <Row label="When" value={`${new Date(slot.start).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}, ${slot.label}`} />
        <Row
          label="Payment"
          value={paymentMode === "online" ? `${formatCurrency(fee)} paid online` : `${formatCurrency(fee)} — pay at clinic`}
          strong
        />
      </Box>

      {mode === "video" && (
        <Alert severity="success" sx={{ width: "100%", textAlign: "left" }}>
          A Google Meet link and calendar invite will be emailed to you and the doctor before the consult.
        </Alert>
      )}

      <Button variant="contained" fullWidth onClick={onDone}>
        Done
      </Button>
    </Stack>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 500, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
