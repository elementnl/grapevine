import { AdminLoginForm } from "@/components/AdminLoginForm";
import { TopBar } from "@/components/TopBar";

export default function LoginPage() {
  return (
    <>
      <TopBar links={[{ href: "/", label: "Play" }]} />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="sketch w-full max-w-md p-6">
          <h1 className="mb-4 font-hand text-3xl font-bold">Admin sign in</h1>
          <AdminLoginForm />
        </section>
      </main>
    </>
  );
}
