import { Link } from "react-router-dom";
import BackButton from "../components/BackButton";

export default function NotFound() {
  return (
    <>
      <BackButton />
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h1>404 - Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/">Back to Home</Link>
      </div>
    </>
  );
}

