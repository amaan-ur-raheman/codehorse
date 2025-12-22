import LoginUI from "@/modules/auth/components/login-ui";
import { requireUnAuth } from "@/modules/auth/utils/auth-utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Login - Code Horse",
	description: "Sign in to Code Horse to access AI-powered code reviews for your GitHub repositories.",
};

const LoginPage = async () => {
	await requireUnAuth();

	return (
		<div>
			<LoginUI />
		</div>
	);
};

export default LoginPage;
