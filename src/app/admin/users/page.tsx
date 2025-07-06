import { getAllUsers } from "@/lib/data-service";
import UsersClient from "./users-client";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const users = await getAllUsers();

    return <UsersClient users={users} />;
}
