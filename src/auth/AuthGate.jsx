import { Box, CircularProgress } from "@mui/material";
import LoginPage from "../features/login/LoginPage";
import { useAuth } from "./AuthContext";

/**
 * Shows the app to someone who is signed in (or to anyone when the app has no sign-in set up, as in development), and
 * the login page to everyone else.
 */
export default function AuthGate({ children }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress aria-label="Signing in" />
      </Box>
    );
  }
  return status === "signedOut" ? <LoginPage /> : children;
}
