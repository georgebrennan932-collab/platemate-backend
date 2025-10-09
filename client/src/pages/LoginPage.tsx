import { useState } from "react";
import { useLocation } from "wouter";
import pmLogo from "@assets/pm-logo.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [doorsOpen, setDoorsOpen] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
        
        // Trigger elevator door animation
        setDoorsOpen(true);
        
        // Redirect after animation completes (slower animation now)
        setTimeout(() => {
          setLocation("/");
        }, 2800);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        @keyframes slideRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
      `}</style>
      
      {/* Elevator Door Overlay - Hidden until login succeeds */}
      {doorsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          {/* Left Door with Left Half of Logo */}
          <div style={{
            flex: 1,
            background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)',
            animation: 'slideLeft 2.5s ease-in-out forwards',
            transformOrigin: 'left center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <img 
              src={pmLogo} 
              alt="PM Logo Left"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px',
                height: '200px',
                clipPath: 'inset(0 50% 0 0)'
              }}
            />
          </div>
          
          {/* Right Door with Right Half of Logo */}
          <div style={{
            flex: 1,
            background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)',
            animation: 'slideRight 2.5s ease-in-out forwards',
            transformOrigin: 'right center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <img 
              src={pmLogo} 
              alt="PM Logo Right"
              style={{
                position: 'absolute',
                top: '50%',
                right: '50%',
                transform: 'translate(50%, -50%)',
                width: '200px',
                height: '200px',
                clipPath: 'inset(0 0 0 50%)'
              }}
            />
          </div>
        </div>
      )}

      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
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
          textAlign: 'center',
          opacity: doorsOpen ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Login to PlateMate</h2>
        
        <form onSubmit={handleLogin}>
          <input
            data-testid="input-email"
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
          
          <input
            data-testid="input-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          
          {error && (
            <div data-testid="text-error" style={{ 
              color: 'red', 
              fontSize: '14px', 
              marginTop: '10px',
              marginBottom: '10px' 
            }}>
              {error}
            </div>
          )}
          
          <button
            data-testid="button-login"
            type="submit"
            disabled={isLoading}
            style={{
              width: '90%',
              padding: '10px',
              margin: '8px 0',
              borderRadius: '8px',
              border: 'none',
              background: isLoading ? '#999' : 'purple',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              transition: '0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#5a007a';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'purple';
            }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          <a
            data-testid="link-forgot-password"
            href="/forgot-password"
            onClick={(e) => {
              e.preventDefault();
              setLocation("/forgot-password");
            }}
            style={{
              color: 'purple',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Forgot Password?
          </a>
        </p>
        
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          No account?{' '}
          <a
            data-testid="link-register"
            href="/register"
            onClick={(e) => {
              e.preventDefault();
              setLocation("/register");
            }}
            style={{
              color: 'purple',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Register here
          </a>
        </p>
        </div>
      </div>
    </>
  );
}
