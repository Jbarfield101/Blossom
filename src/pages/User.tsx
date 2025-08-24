import Center from "./_Center";
import { useUsers } from "../features/users/useUsers";

export default function User() {
  const user = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id] : null;
  });

  if (!user) {
    return <Center>No user selected</Center>;
  }

  return (
    <Center>
      <div style={{ textAlign: "left" }}>
        <h1>User Info</h1>
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Theme:</strong> {user.theme}</p>
        <p><strong>Money:</strong> {user.money}</p>
        <div>
          <h2>Modules</h2>
          <ul>
            {Object.entries(user.modules).map(([key, enabled]) => (
              <li key={key}>
                {key}: {enabled ? "on" : "off"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Center>
  );
}
