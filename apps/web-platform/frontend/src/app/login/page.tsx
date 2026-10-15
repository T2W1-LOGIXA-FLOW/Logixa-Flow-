import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Login",
};

export default function LoginRedirectPage() {
  redirect("/admin/login");
}
