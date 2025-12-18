"use client";

import { signIn } from "@/lib/auth-client";
import { GithubIcon } from "lucide-react";
import { useState } from "react";

const LoginUI = () => {
	const [isLoading, setIsLoading] = useState(false);

	const handleGithubLogin = async () => {
		setIsLoading(true);
		try {
			await signIn.social({
				provider: "github",
			});
		} catch (error) {
			console.error("GitHub login failed:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-black via-black to-zinc-900 text-white dark flex">
			{/* Left Section - Hero Content */}
			<div className="flex-1 flex flex-col justify-center px-12 py-16">
				<div className="max-w-lg">
					{/* Logo */}
					<div className="mb-16">
						<div className="inline-flex items-center gap-2 text-2xl font-bold">
							<div className="w-8 h-8 bg-primary rounded-full" />
							<span>CodeHorse</span>
						</div>
					</div>

					{/* Main Content */}
					<h1 className="text-5xl font-bold mb-6 leading-tight text-balance">
						Cut Code Review Time & Bugs in Half{" "}
						<span className="block">Instantly.</span>
					</h1>

					<p className="text-lg text-gray-400 leading-relaxed">
						Supercharge your team to ship faster with most advanced
						AI code reviews.
					</p>
				</div>
			</div>

			{/* Right Section - Login Form */}
			<div className="flex-1 flex flex-col justify-center items-center px-12 py-16">
				<div className="w-full max-w-sm">
					<div className="mb-12">
						<h2 className="text-3xl font-bold mb-2">
							Welcome back
						</h2>
						<p className="text-gray-400">
							Login using the following providers:
						</p>
					</div>

					{/* Github Login Button */}
					<button
						onClick={handleGithubLogin}
						disabled={isLoading}
						className="w-full py-3 px-4 bg-primary text-black rounded-lg font-semibold hover:bg-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 mb-8"
					>
						<GithubIcon size={20} />
						{isLoading ? "Signing in..." : "GitHub"}
					</button>

					{/* Footer Links */}
					<div className="space-y-4 text-center text-sm text-gray-400">
						<div>
							New to CodeHorse?{" "}
							<a
								href="#"
								className="text-primary hover:text-muted-foreground font-semibold"
							>
								Sign up
							</a>
						</div>
						<div>
							<a
								href="#"
								className="text-primary hover:text-muted-foreground font-semibold"
							>
								Self Hosted Services
							</a>
						</div>
					</div>

					{/* Bottom Links */}
					<div className="mt-12 pt-8 border-t border-gray-700 flex justify-center gap-4 text-xs text-gray-500">
						<a href="#" className="hover:text-gray-400">
							Terms of Use
						</a>
						<span>and</span>
						<a href="#" className="hover:text-gray-400">
							Privacy Policy
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LoginUI;
