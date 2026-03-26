import React, { useState } from "react";

function EyeOpenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.84-2.89 3.53-4.75-1.73-3.89-6-7-11-7-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 3.89 6 7 11 7 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.29-.08.59-.08.9 0 1.66 1.34 3 3 3 .32 0 .61-.03.9-.08l1.55 1.55c-.92.56-1.96.87-3.1.87-2.76 0-5-2.24-5-5 0-1.14.31-2.18.88-3.1zM11.84 9.02l3.15 3.15.02-.18c0-1.66-1.34-3-3-3l-.17.03z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Password field with show/hide toggle. Forwards extra props to the inner &lt;input&gt;.
 */
export default function PasswordInput({ value, onChange, style = {}, toggleStyle, ...rest }) {
  const [visible, setVisible] = useState(false);

  const mergedInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    ...style,
    paddingRight: "44px",
  };

  const wrapperStyle = {
    position: "relative",
    width: "100%",
  };

  const btnStyle = {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "36px",
    height: "36px",
    padding: 0,
    border: "none",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    ...toggleStyle,
  };

  return (
    <div style={wrapperStyle}>
      <input type={visible ? "text" : "password"} value={value} onChange={onChange} style={mergedInputStyle} {...rest} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        style={btnStyle}
      >
        {visible ? <EyeClosedIcon /> : <EyeOpenIcon />}
      </button>
    </div>
  );
}
