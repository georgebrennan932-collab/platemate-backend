import { useState } from "react";
import { useLocation } from "wouter";
import pmLogo from "@assets/pm-logo.png";
import { buildApiUrl } from "@/lib/api-config";

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
      const res = await fetch(buildApiUrl("/api/login"), {
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
        
        // Redirect after animation completes (3.2s animation + 0.2s buffer)
        setTimeout(() => {
          setLocation("/");
        }, 3400);
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
        @keyframes doorLeft {
          0% { transform: translateX(-100%); }
          19% { transform: translateX(0); }
          41% { transform: translateX(0); }
          91% { transform: translateX(-100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes doorRight {
          0% { transform: translateX(100%); }
          19% { transform: translateX(0); }
          41% { transform: translateX(0); }
          91% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeInText {
          0% { opacity: 0; }
          40% { opacity: 0; }
          55% { opacity: 1; }
          100% { opacity: 1; }
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
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          {/* Background Layer - Purple gradient with metallic welcome text */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #e0e0e0 0%, #ffffff 25%, #c0c0c0 50%, #ffffff 75%, #e0e0e0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 20px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '2px',
              animation: 'fadeInText 3.2s ease-in-out forwards'
            }}>
              Welcome
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '500',
              background: 'linear-gradient(135deg, #d0d0d0 0%, #f5f5f5 50%, #d0d0d0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 15px rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.2)',
              letterSpacing: '1px',
              animation: 'fadeInText 3.2s ease-in-out forwards'
            }}>
              to PlateMate
            </div>
          </div>
          
          {/* Left Metallic Door */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 35%, #4b5563 50%, #1f2937 65%, #0f172a 100%)',
            animation: 'doorLeft 3.2s ease-in-out forwards',
            boxShadow: 'inset -2px 0 8px rgba(0,0,0,0.5)'
          }} />
          
          {/* Right Metallic Door */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 35%, #4b5563 50%, #1f2937 65%, #0f172a 100%)',
            animation: 'doorRight 3.2s ease-in-out forwards',
            boxShadow: 'inset 2px 0 8px rgba(0,0,0,0.5)'
          }} />
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
