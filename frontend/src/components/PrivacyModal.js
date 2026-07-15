import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X } from "lucide-react";

export const PrivacyModal = ({ open, onOpenChange, onConsent, loading }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-2 border-black" data-testid="privacy-modal">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <DialogTitle className="font-display text-2xl font-black tracking-tight">
              Location Sharing Consent
            </DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2 leading-relaxed text-foreground">
            To complete your check-in we need to access your device's precise GPS
            coordinates.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed max-h-64 overflow-y-auto">
          <p>
            <strong className="text-foreground">What we collect:</strong> Your latitude
            and longitude at the moment you check in, along with the name, email and
            phone number you entered.
          </p>
          <p>
            <strong className="text-foreground">How we use it:</strong> Coordinates are
            shared with the site supervisor to verify your on-site attendance for this
            job. We do not track you continuously — a single location is captured only
            when you tap the button.
          </p>
          <p>
            <strong className="text-foreground">Your rights (GDPR / CCPA):</strong> You
            may request access to, or deletion of, your submitted data at any time by
            contacting the site administrator. Consent is required and voluntary; you can
            decline and check in manually with the supervisor instead.
          </p>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 border-black"
            data-testid="privacy-decline-btn"
          >
            <X className="h-4 w-4 mr-1" /> Decline
          </Button>
          <Button
            onClick={onConsent}
            disabled={loading}
            className="bg-primary text-primary-foreground border-2 border-black font-black uppercase tracking-wide"
            data-testid="privacy-consent-btn"
          >
            {loading ? "Getting location…" : "I Agree & Share Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
