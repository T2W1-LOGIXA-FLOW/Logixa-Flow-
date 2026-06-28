import { redirect } from "next/navigation";

export default function PaymentHistoryRedirectPage() {
  redirect("/admin/payments");
}
