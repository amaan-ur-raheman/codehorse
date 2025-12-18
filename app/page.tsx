import { Button } from "@/components/ui/button";
import Logout from "@/modules/auth/components/logout";

import { requireAuth } from "@/modules/auth/utils/auth-utils";

export default async function Home() {
	await requireAuth();

	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold">Welcome to CodeHorse</h1>
			<Logout className="mt-4">
				<Button>Logout</Button>
			</Logout>
		</div>
	);
}
