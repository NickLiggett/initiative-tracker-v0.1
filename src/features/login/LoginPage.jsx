import { useState } from "react";
import { Alert, Box, Button, Link, Paper, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";

/**
 * What someone sees when nobody is signed in: sign in, create an account, or get back in after forgetting the
 * password. Each sends the browser to the sign-in service, which has the forms (and sends the email for a reset).
 */
export default function LoginPage() {
  const { signIn, register, forgotPassword, error } = useAuth();
  const [leaving, setLeaving] = useState(false); // the browser is on its way to the sign-in service

  const go = (action) => () => {
    setLeaving(true);
    action();
  };

  return (
    <Box sx={{ minHeight: "100vh", width: "100%", display: "grid", placeItems: "center", p: 2, boxSizing: "border-box" }}>
      <Paper variant="outlined" component="main" sx={{ p: 4, width: "100%", maxWidth: 420, display: "grid", gap: 2, textAlign: "center" }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bolder" }}>
          Initiative Tracker
        </Typography>
        <Typography color="text.secondary">
          Keep track of a fight, look up and compare creatures and items, and share your homebrew. Sign in to pick up
          where you left off.
        </Typography>
        {error && <Alert severity="warning">{error}</Alert>}
        <Button variant="contained" size="large" disabled={leaving} onClick={go(signIn)}>
          Sign in
        </Button>
        <Button variant="outlined" size="large" disabled={leaving} onClick={go(register)}>
          Create an account
        </Button>
        <Link component="button" type="button" underline="hover" disabled={leaving} onClick={go(forgotPassword)}>
          Forgot your password?
        </Link>
      </Paper>
    </Box>
  );
}
