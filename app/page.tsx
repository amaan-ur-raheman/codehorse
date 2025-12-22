import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Code Horse - AI-Powered Code Review Platform",
	description: "Automate your code reviews with AI. Connect your GitHub repositories and get instant, intelligent code review feedback on every pull request.",
};

export default async function Home() {
	await requireAuth();

	return redirect("/dashboard");
}
