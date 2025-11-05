import { useState } from "react";
import { useLocation } from "wouter";
import { buildApiUrl } from '@/lib/api-config';

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"verify" | "reset">("verify");
  
  // Step 1: Verify email and security answer
  const [email, setEmail] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  
  // Step 2: Reset password
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError("");
    setIsVerifying(true);

    try {
      const res = await fetch(buildApiUrl("/api/reset-password-verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          securityAnswer: securityAnswer.trim() 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResetToken(data.resetToken);
        setStep("reset");
      } else {
        setVerifyError(data.error || "Verification failed");
      }
    } catch (err) {
      setVerifyError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }

    setIsResetting(true);

    try {
      const res = await fetch(buildApiUrl("/api/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resetToken, 
          newPassword: newPassword.trim() 
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Password reset successfully! You can now log in with your new password.");
        setLocation("/login");
      } else {
        setResetError(data.error || "Password reset failed");
      }
    } catch (err) {
      setResetError("Network error. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      background: '#f3f0ff', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '360px',
        textAlign: 'center'
      }}>
        {step === "verify" ? (
          <>
            <h2 style={{ marginBottom: '10px', color: '#333' }}>Reset Password</h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Answer your security question to reset your password
            </p>
            
            <form onSubmit={handleVerify}>
              <input
                data-testid="input-reset-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '90%',
                  padding: '10px',
                  margin: '8px 0',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
              <br />
              
              <div style={{ 
                textAlign: 'left', 
                width: '90%', 
                margin: '15px auto 5px', 
                fontSize: '13px', 
                color: '#555',
                fontWeight: '500'
              }}>
                Security Question: What is your favorite food?
              </div>
              
              <input
                data-testid="input-reset-security-answer"
                type="text"
                placeholder="Your answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
                style={{
                  width: '90%',
                  padding: '10px',
                  margin: '8px 0',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
              <br />
              
              {verifyError && (
                <div data-testid="text-verify-error" style={{ 
                  color: 'red', 
                  fontSize: '14px', 
                  marginTop: '10px',
                  marginBottom: '10px' 
                }}>
                  {verifyError}
                </div>
              )}
              
              <button
                data-testid="button-verify"
                type="submit"
                disabled={isVerifying}
                style={{
                  width: '90%',
                  padding: '10px',
                  margin: '8px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: isVerifying ? '#999' : 'purple',
                  color: 'white',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isVerifying) e.currentTarget.style.background = '#5a007a';
                }}
                onMouseLeave={(e) => {
                  if (!isVerifying) e.currentTarget.style.background = 'purple';
                }}
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '10px', color: '#333' }}>Set New Password</h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Enter your new password below
            </p>
            
            <form onSubmit={handleReset}>
              <input
                data-testid="input-new-password"
                type="password"
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '90%',
                  padding: '10px',
                  margin: '8px 0',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
              <br />
              
              <input
                data-testid="input-confirm-password"
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '90%',
                  padding: '10px',
                  margin: '8px 0',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
              <br />
              
              {resetError && (
                <div data-testid="text-reset-error" style={{ 
                  color: 'red', 
                  fontSize: '14px', 
                  marginTop: '10px',
                  marginBottom: '10px' 
                }}>
                  {resetError}
                </div>
              )}
              
              <button
                data-testid="button-reset-password"
                type="submit"
                disabled={isResetting}
                style={{
                  width: '90%',
                  padding: '10px',
                  margin: '8px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: isResetting ? '#999' : 'purple',
                  color: 'white',
                  cursor: isResetting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isResetting) e.currentTarget.style.background = '#5a007a';
                }}
                onMouseLeave={(e) => {
                  if (!isResetting) e.currentTarget.style.background = 'purple';
                }}
              >
                {isResetting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
        
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Remember your password?{' '}
          <a
            data-testid="link-login-from-reset"
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              setLocation("/login");
            }}
            style={{
              color: 'purple',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}
