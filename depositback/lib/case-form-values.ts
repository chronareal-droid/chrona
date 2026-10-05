// Form-state shape for the case form. Lives outside the "use client" component
// so server pages can import EMPTY_CASE as a real value, not a client reference.

export interface CaseFormValues {
  state: string;
  depositAmount: string;
  amountReturned: string;
  moveOutDate: string;
  itemizedListReceived: boolean;
  forwardingAddressSent: boolean;
  tenantName: string;
  tenantAddress: string;
  landlordName: string;
  landlordAddress: string;
  rentalAddress: string;
  deductions: { reason: string; amount: string; dispute: string }[];
  story: string;
}

export const EMPTY_CASE: CaseFormValues = {
  state: "",
  depositAmount: "",
  amountReturned: "",
  moveOutDate: "",
  itemizedListReceived: false,
  forwardingAddressSent: false,
  tenantName: "",
  tenantAddress: "",
  landlordName: "",
  landlordAddress: "",
  rentalAddress: "",
  deductions: [],
  story: "",
};
