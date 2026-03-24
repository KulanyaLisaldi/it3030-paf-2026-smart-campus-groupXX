import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchCurrentUser } from "../api/auth";
import { setAuthToken } from "../api/http";
import { navigateAfterAuth } from "../utils/authRedirect";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const cardStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
  padding: "32px",
  maxWidth: "420px",
  width: "100%",
  textAlign: "center",
};

function decodeOAuthError(error) {
  const raw = error.replace(/\+/g, " ");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function CallbackCard({ message, showBack, onBack }) {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <p style={{ color: "#222222", fontSize: "16px", marginBottom: "16px" }}>{message}</p>
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              marginTop: "8px",
              padding: "12px 20px",
              backgroundColor: "#FA8112",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [asyncError, setAsyncError] = useState(null);

  useEffect(() => {
    if (errorParam || !token) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setAuthToken(token);
        const user = await fetchCurrentUser();
        if (cancelled) return;
        localStorage.setItem("smartCampusUser", JSON.stringify(user));
        navigateAfterAuth(user, navigate);
      } catch (e) {
        if (cancelled) return;
        setAuthToken(null);
        setAsyncError(e?.message || "Could not load your profile. Try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [errorParam, token, navigate]);

  const goSignIn = () => navigate("/signin", { replace: true });

  if (errorParam) {
    return <CallbackCard message={decodeOAuthError(errorParam)} showBack onBack={goSignIn} />;
  }

  if (!token) {
    return (
      <CallbackCard
        message="Missing token. Try signing in with Google again."
        showBack
        onBack={goSignIn}
      />
    );
  }

  if (asyncError) {
    return <CallbackCard message={asyncError} showBack onBack={goSignIn} />;
  }

  return <CallbackCard message="Completing sign-in…" showBack={false} onBack={goSignIn} />;
}
