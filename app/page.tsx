/**
 * Home page component - redirects authenticated users to dashboard
 * 
 * This page serves as the entry point for the application.
 * It checks authentication status and redirects users to the dashboard
 * if they are logged in, or to the login page if not authenticated.
 * 
 * @page
 */
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
